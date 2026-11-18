/** Fotos (anotações e páginas de provas): ficam no aparelho e no bucket privado do Supabase. */
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { downloadAttachment, uploadAttachment } from '../sync/supabase';
import { Icon } from '../ui/kit';

let running = false;

/** Sobe as fotos pendentes e baixa as que faltam neste aparelho (quando há conta conectada). */
export async function syncAttachments(wanted: string[]) {
  if (running) return;
  running = true;
  try {
    const userId = (await db.meta.get('userId'))?.value as string | undefined;
    if (!userId || !navigator.onLine) return;
    for (const a of await db.attachments.filter((x) => !x.uploaded).toArray()) {
      if (await uploadAttachment(userId, a.id, a.dataUrl)) await db.attachments.update(a.id, { uploaded: true });
    }
    for (const id of [...new Set(wanted)]) {
      if (await db.attachments.get(id)) continue;
      const dataUrl = await downloadAttachment(userId, id);
      if (dataUrl) await db.attachments.put({ id, dataUrl, uploaded: true, created: new Date().toISOString() });
    }
  } finally {
    running = false;
  }
}

/** Botão "ver página da prova" + visualizador em tela cheia. */
export function QuestionImages({ ids }: { ids?: string[] }) {
  const imgs = useLiveQuery(async () => (ids?.length ? (await db.attachments.bulkGet(ids)).filter(Boolean) : []), [ids?.join(',')]) ?? [];
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    if (ids?.length && imgs.length < ids.length) void syncAttachments(ids);
  }, [ids, imgs.length]);
  if (!ids?.length) return null;
  return (
    <>
      <div className="flex flex-wrap gap-2 my-2">
        {imgs.map((a) => {
          const crop = a!.id.startsWith('qc-');
          const nCrops = imgs.filter((x) => x!.id.startsWith('qc-')).length;
          const k = Number(a!.id.split('-').pop()) + 1;
          return (
            <button key={a!.id} className={crop ? 'chip text-accent border-pink/60' : 'chip'} onClick={() => setOpen(a!.dataUrl)}>
              <Icon name="image" size={14} /> {crop ? `Questão original${nCrops > 1 ? ` (parte ${k})` : ''}` : 'Página inteira'}
            </button>
          );
        })}
        {imgs.length < ids.length && <span className="text-xs text-muted">Página ainda não baixada neste aparelho.</span>}
      </div>
      {open && (
        <div className="fixed inset-0 z-[70] bg-black/95 overflow-auto" onClick={() => setOpen(null)} role="dialog" aria-label="Página da prova">
          <button className="btn-primary fixed top-3 right-3 z-10" aria-label="Fechar">
            <Icon name="x" />
          </button>
          <img src={open} alt="Página da prova" className="w-full max-w-4xl mx-auto bg-white" />
        </div>
      )}
    </>
  );
}
