import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { repo, uuid } from '../db/repo';
import type { Note } from '../db/types';
import { useApp } from '../app/AppContext';
import { SUBJECT_NAMES, SUBJECT_SHORT, type SubjectId } from '../core/exam';
import { SUBJECT_ORDER } from '../data/seed';
import { Card, Empty, Icon, Markdown, Page, Segmented, cx } from '../ui/kit';
import { takePhoto } from '../native/native';
import { syncAttachments } from '../app/attachments';

/** Exclui (lógico, sincroniza) com confirmação. Fórmulas do esqueleto também podem ser apagadas. */
async function deleteNote(n: Note, after?: () => void) {
  if (!confirm(`Excluir "${n.title}"${n.attachments.length ? ` e ${n.attachments.length} foto(s)` : ''}? Isso vale para todos os aparelhos.`)) return;
  await repo.remove('notes', n.id);
  await db.attachments.bulkDelete(n.attachments);
  after?.();
}

export default function Notes({ kind }: { kind: 'note' | 'formula' }) {
  const { auth } = useApp();
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const id = params.get('id');
  const topicFilter = params.get('topic');
  const notes = (useLiveQuery(() => db.notes.where('kind').equals(kind).toArray(), [kind]) ?? []).filter((n) => !n.deleted);
  const topics = useLiveQuery(() => db.topics.toArray(), []) ?? [];
  const [q, setQ] = useState('');
  const [subject, setSubject] = useState<SubjectId | 'all'>('all');

  useEffect(() => {
    if (auth === 'signedIn') void syncAttachments(notes.flatMap((n) => n.attachments));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, notes.length]);

  const list = useMemo(
    () =>
      notes
        .filter((n) => (!topicFilter || n.topicId === topicFilter) && (subject === 'all' || n.subject === subject))
        .filter((n) => !q || (n.title + ' ' + n.body).toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => (kind === 'formula' ? (a.subject ?? '').localeCompare(b.subject ?? '') || a.title.localeCompare(b.title) : b.updated_at.localeCompare(a.updated_at))),
    [notes, topicFilter, subject, q, kind],
  );

  const create = async () => {
    const t = topics.find((x) => x.id === topicFilter);
    const n = await repo.put<Note>('notes', { kind, subject: t?.subject ?? (subject === 'all' ? null : subject), topicId: topicFilter, title: t ? t.name : 'Nova anotação', body: '', attachments: [] });
    setParams({ id: n.id, ...(topicFilter ? { topic: topicFilter } : {}) });
  };

  const title = kind === 'formula' ? 'Formulário' : 'Anotações';
  const listView = (
    <div>
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input pl-10" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
        </div>
        <button className="btn-primary" onClick={() => void create()} aria-label="Nova">
          <Icon name="plus" />
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-3">
        <button className={subject === 'all' ? 'chip-on' : 'chip'} onClick={() => setSubject('all')}>Todas</button>
        {(kind === 'formula' ? (['mat', 'fis', 'qui'] as SubjectId[]) : SUBJECT_ORDER).map((s) => (
          <button key={s} className={subject === s ? 'chip-on whitespace-nowrap' : 'chip whitespace-nowrap'} onClick={() => setSubject(s)}>
            {SUBJECT_SHORT[s]}
          </button>
        ))}
      </div>
      {topicFilter && (
        <button className="chip mb-3" onClick={() => setParams({})}>
          {topics.find((t) => t.id === topicFilter)?.name} <Icon name="x" size={14} />
        </button>
      )}
      {list.length === 0 && <Empty>{kind === 'formula' ? 'Nada encontrado.' : 'Nenhuma anotação. Fotografe o caderno ou escreva um resumo.'}</Empty>}
      <ul className="space-y-2">
        {list.map((n) => (
          <li key={n.id} className="flex gap-2 items-stretch">
            <button className={cx('card !p-3 flex-1 min-w-0 text-left', id === n.id && 'ring-2 ring-pink')} onClick={() => setParams({ id: n.id, ...(topicFilter ? { topic: topicFilter } : {}) })}>
              <p className="font-semibold">{n.title}</p>
              <p className="text-xs text-muted line-clamp-1">
                {n.subject ? SUBJECT_SHORT[n.subject] : 'Geral'}
                {n.attachments.length > 0 && ` · ${n.attachments.length} foto(s)`} · {n.body.slice(0, 80)}
              </p>
            </button>
            <button className="btn-ghost w-12 px-0 shrink-0" aria-label={`Excluir "${n.title}"`} onClick={() => void deleteNote(n, () => id === n.id && setParams({}))}>
              <Icon name="trash" size={18} />
            </button>
          </li>
        ))}
      </ul>
      {kind === 'formula' && (
        <p className="text-xs text-muted mt-4">
          Esqueleto inicial de Matemática e Física gerado pelo app: confira cada fórmula com seu material. Para Química, use a <a className="text-accent underline" href="#/tabela">tabela periódica</a>.
        </p>
      )}
    </div>
  );

  return (
    <Page title={title} back={id ? () => nav(-1) : undefined}>
      <div className="tab:grid tab:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] tab:gap-6">
        <div className={cx(id && 'hidden tab:block')}>{listView}</div>
        <div className={cx(!id && 'hidden tab:block')}>{id ? <NoteEditor id={id} onDeleted={() => setParams({})} /> : <Card><Empty>Escolha uma anotação.</Empty></Card>}</div>
      </div>
    </Page>
  );
}

function NoteEditor({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  const { auth, toast } = useApp();
  const note = useLiveQuery(() => db.notes.get(id), [id]);
  const topics = useLiveQuery(() => db.topics.toArray(), []) ?? [];
  const photos = useLiveQuery(async () => (note ? (await db.attachments.bulkGet(note.attachments)).filter(Boolean) : []), [note?.attachments.join(',')]) ?? [];
  const [mode, setMode] = useState<'ver' | 'editar'>('ver');
  const [draft, setDraft] = useState<{ title: string; body: string } | null>(null);
  const [zoom, setZoom] = useState<string | null>(null);

  useEffect(() => {
    setDraft(null);
    setMode('ver');
  }, [id]);

  if (!note) return null;
  const title = draft?.title ?? note.title;
  const body = draft?.body ?? note.body;

  const save = async () => {
    if (draft) await repo.update<Note>('notes', id, draft);
    setDraft(null);
    setMode('ver');
  };

  const addPhoto = async (src: 'camera' | 'gallery') => {
    const dataUrl = await takePhoto(src);
    if (!dataUrl) return;
    const aid = uuid();
    await db.attachments.put({ id: aid, dataUrl, uploaded: false, created: new Date().toISOString() });
    await repo.update<Note>('notes', id, { attachments: [...note.attachments, aid] });
    if (auth === 'signedIn') void syncAttachments([]);
    toast('Foto anexada');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Segmented label="Modo" value={mode} options={[{ value: 'ver', label: 'Ver' }, { value: 'editar', label: 'Editar' }]} onChange={(v) => (v === 'ver' ? void save() : setMode(v))} />
        <span className="flex-1" />
        <button className="btn-ghost w-12 px-0" onClick={() => void addPhoto('camera')} aria-label="Tirar foto">
          <Icon name="camera" />
        </button>
        <button className="btn-ghost w-12 px-0" onClick={() => void addPhoto('gallery')} aria-label="Escolher da galeria">
          <Icon name="image" />
        </button>
      </div>
      {mode === 'editar' ? (
        <Card className="space-y-3">
          <input className="input font-bold" value={title} onChange={(e) => setDraft({ title: e.target.value, body })} aria-label="Título" />
          <div className="grid grid-cols-2 gap-2">
            <select
              className="input"
              value={note.subject ?? ''}
              onChange={(e) => void repo.update<Note>('notes', id, { subject: (e.target.value || null) as SubjectId | null, topicId: null })}
              aria-label="Disciplina"
            >
              <option value="">Geral</option>
              {SUBJECT_ORDER.map((s) => <option key={s} value={s}>{SUBJECT_NAMES[s]}</option>)}
            </select>
            <select className="input" value={note.topicId ?? ''} onChange={(e) => void repo.update<Note>('notes', id, { topicId: e.target.value || null })} aria-label="Tópico">
              <option value="">Tópico…</option>
              {topics.filter((t) => t.subject === note.subject && !t.deleted).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <textarea className="input min-h-[45vh] font-mono text-sm leading-relaxed" value={body} onChange={(e) => setDraft({ title, body: e.target.value })} aria-label="Texto em Markdown" placeholder="Markdown: # título, - lista, **negrito**" />
          <div className="flex gap-2">
            <button className="btn-primary flex-1" onClick={() => void save()}>Salvar</button>
            <button className="btn-text text-warn" onClick={() => void deleteNote(note, onDeleted)}>
              <Icon name="trash" size={18} /> Excluir
            </button>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="flex items-start gap-2 mb-2">
            <h2 className="text-xl font-bold flex-1">{note.title}</h2>
            <button className="btn-text text-warn" aria-label="Excluir anotação" onClick={() => void deleteNote(note, onDeleted)}>
              <Icon name="trash" size={18} /> Excluir
            </button>
          </div>
          {note.body ? <Markdown text={note.body} /> : <p className="text-muted">Vazio. Toque em Editar.</p>}
        </Card>
      )}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <div key={p!.id} className="relative aspect-square">
              <button onClick={() => setZoom(p!.dataUrl)} className="w-full h-full overflow-hidden rounded-xl border border-line" aria-label="Ampliar foto">
                <img src={p!.dataUrl} alt="Foto anexada" className="w-full h-full object-cover" />
              </button>
              <button
                className="absolute top-1 right-1 w-10 h-10 grid place-items-center rounded-full bg-bg/90 border border-line text-warn"
                aria-label="Excluir foto"
                onClick={async () => {
                  if (!confirm('Excluir esta foto da anotação?')) return;
                  await repo.update<Note>('notes', id, { attachments: note.attachments.filter((x) => x !== p!.id) });
                  await db.attachments.delete(p!.id);
                  toast('Foto excluída');
                }}
              >
                <Icon name="x" size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
      {note.attachments.length > photos.length && <p className="text-xs text-muted">Algumas fotos ainda não foram baixadas deste aparelho.</p>}
      {zoom && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-2" onClick={() => setZoom(null)}>
          <img src={zoom} alt="Foto ampliada" className="max-w-full max-h-full" />
        </div>
      )}
    </div>
  );
}
