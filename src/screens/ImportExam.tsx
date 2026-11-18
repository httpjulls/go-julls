import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { repo } from '../db/repo';
import type { Letter, Question } from '../db/types';
import { useApp } from '../app/AppContext';
import { syncAttachments } from '../app/attachments';
import { SUBJECT_SHORT, type SubjectId } from '../core/exam';
import { SUBJECT_ORDER } from '../data/seed';
import { applyAnswerKey, pageToLines, parseAnswerKey, parseExam, type ParsedQuestion } from '../import/examParser';
import { Card, Icon, Page, Section, cx } from '../ui/kit';

const LETTERS: Letter[] = ['A', 'B', 'C', 'D'];

type Draft = ParsedQuestion & { answer: Letter | null; include: boolean; topicId: string | null; images: string[] };

export const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'prova';

async function pickPdf(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,.pdf';
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

export default function ImportExam() {
  const { settings, toast, auth } = useApp();
  const nav = useNavigate();
  const topics = (useLiveQuery(() => db.topics.toArray(), []) ?? []).filter((t) => !t.deleted);
  const [name, setName] = useState('');
  const [exam, setExam] = useState<File | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [keyText, setKeyText] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [onlyWarn, setOnlyWarn] = useState(false);
  const [saving, setSaving] = useState(false);

  const examId = slug(name || exam?.name.replace(/\.pdf$/i, '') || 'prova');

  const process = async () => {
    if (!exam) return;
    try {
      setStatus('Lendo o PDF da prova…');
      const { openPdf, extractPages, renderPageCanvas, cropRegion } = await import('../import/pdf');
      const doc = await openPdf(await exam.arrayBuffer());
      const pages = await extractPages(doc);
      const lines = pages.flatMap(pageToLines);
      const parsed = parseExam(lines);
      if (!parsed.length) {
        setStatus('Não encontrei questões numeradas neste PDF. Se for escaneado (foto), o texto não pode ser lido: cadastre as questões manualmente.');
        return;
      }
      // gabarito: arquivo separado, texto colado ou dentro do próprio PDF (seção "Gabarito")
      let keySource = keyText;
      if (keyFile) {
        setStatus('Lendo o gabarito…');
        const kdoc = await openPdf(await keyFile.arrayBuffer());
        keySource = (await extractPages(kdoc)).flatMap(pageToLines).map((l) => l.text).join('\n');
      } else if (!keySource) {
        const gi = lines.findIndex((l) => /^\W*gabarito\b/i.test(l.text));
        if (gi >= 0) keySource = lines.slice(gi).map((l) => l.text).join('\n');
      }
      const withKey = applyAnswerKey(parsed, keySource ? parseAnswerKey(keySource) : new Map());

      // recorte de cada questão (figura legível) + página inteira (contexto)
      const pagesNeeded = [...new Set(withKey.flatMap((q) => q.pages))];
      const pageIds = new Map<number, string>();
      const crops = new Map<number, string[]>(); // índice da questão → ids dos recortes
      const now = new Date().toISOString();
      for (const [i, p] of pagesNeeded.entries()) {
        setStatus(`Recortando as questões das páginas (${i + 1}/${pagesNeeded.length})…`);
        try {
          const rendered = await renderPageCanvas(doc, p);
          const pid = `pg-${examId}-${p}`;
          await db.attachments.put({ id: pid, dataUrl: rendered.canvas.toDataURL('image/jpeg', 0.72), uploaded: false, created: now });
          pageIds.set(p, pid);
          for (const [qi, q] of withKey.entries()) {
            q.regions
              .filter((r) => r.page === p)
              .forEach((r) => {
                const k = (crops.get(qi) ?? []).length;
                const cid = `qc-${examId}-${String(q.number).padStart(2, '0')}${q.language ? `-${q.language}` : ''}-${k}`;
                void db.attachments.put({ id: cid, dataUrl: cropRegion(rendered, r), uploaded: false, created: now });
                crops.set(qi, [...(crops.get(qi) ?? []), cid]);
              });
          }
        } catch {
          // segue sem a imagem desta página; a questão continua importável
        }
      }
      const lang = settings?.foreignLanguage;
      setDrafts(
        withKey.map((q, qi) => ({
          ...q,
          include: q.subject !== 'lem' || !q.language || q.language === lang,
          topicId: null,
          images: [...(crops.get(qi) ?? []), ...q.pages.map((p) => pageIds.get(p)!).filter(Boolean)],
        })),
      );
      const noKey = withKey.filter((q) => !q.answer).length;
      setStatus(`${withKey.length} questões encontradas${noKey ? ` · ${noKey} sem gabarito (marque a letra)` : ''}. Revise antes de salvar.`);
    } catch (e) {
      setStatus(`Não consegui ler o PDF: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const update = (i: number, patch: Partial<Draft>) => setDrafts((d) => d!.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const save = async () => {
    if (!drafts) return;
    setSaving(true);
    const label = name.trim() || exam?.name.replace(/\.pdf$/i, '') || 'Prova importada';
    let n = 0;
    for (const q of drafts.filter((d) => d.include)) {
      const id = `q-${examId}-${String(q.number).padStart(2, '0')}${q.language ? `-${q.language}` : ''}`;
      const row: Omit<Question, 'updated_at' | 'device_id'> = {
        id,
        subject: q.subject,
        topicId: q.topicId,
        statement: q.statement || '(veja a figura da página)',
        options: q.options,
        answer: (q.answer ?? 'A') as Letter,
        solution: '',
        source: `${label} · questão ${q.number}`,
        examId,
        examName: label,
        number: q.number,
        language: q.language,
        images: q.images,
      };
      await repo.put<Question>('questions', row as Question);
      n++;
    }
    if (auth === 'signedIn') void syncAttachments([]);
    setSaving(false);
    toast(`${n} questões salvas no banco.`);
    nav('/questoes');
  };

  const visible = useMemo(() => (drafts ?? []).map((d, i) => ({ d, i })).filter(({ d }) => !onlyWarn || d.warnings.length || !d.answer), [drafts, onlyWarn]);

  return (
    <Page title="Importar prova (PDF)" back={() => nav('/questoes')}>
      {!drafts && (
        <Card className="space-y-4 max-w-2xl">
          <p className="text-sm text-muted">
            Envie o PDF do caderno de questões e, se tiver, o PDF do gabarito. O app lê o texto, separa as questões e alternativas, guarda a página como imagem (para figuras) e você revisa antes de salvar. Funciona com PDF de texto; PDF escaneado (foto) não dá para ler.
          </p>
          <div>
            <label className="label" htmlFor="nome">Nome da prova</label>
            <input id="nome" className="input" placeholder="Ex.: CEDERJ 2026.2" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid tab:grid-cols-2 gap-2">
            <button className={exam ? 'btn-primary' : 'btn-ghost'} onClick={async () => setExam(await pickPdf())}>
              <Icon name="upload" /> {exam ? exam.name : 'PDF da prova'}
            </button>
            <button className={keyFile ? 'btn-primary' : 'btn-ghost'} onClick={async () => setKeyFile(await pickPdf())}>
              <Icon name="upload" /> {keyFile ? keyFile.name : 'PDF do gabarito (opcional)'}
            </button>
          </div>
          <details>
            <summary className="text-sm text-accent cursor-pointer min-h-[44px] flex items-center">Ou cole o gabarito como texto</summary>
            <textarea className="input min-h-[100px] font-mono text-sm mt-2" placeholder={'01 A\n02 C\n03 B\n…'} value={keyText} onChange={(e) => setKeyText(e.target.value)} />
          </details>
          <button className="btn-primary w-full" disabled={!exam || !!status?.endsWith('…')} onClick={() => void process()}>
            <Icon name="play" /> Ler prova
          </button>
          {status && <p className="text-sm" role="status">{status}</p>}
        </Card>
      )}

      {drafts && (
        <>
          <Card className="mb-4 flex flex-wrap items-center gap-3">
            <p className="text-sm flex-1">{status}</p>
            <label className="flex items-center gap-2 text-sm min-h-[44px]">
              <input type="checkbox" className="w-5 h-5" checked={onlyWarn} onChange={(e) => setOnlyWarn(e.target.checked)} /> Só as que precisam de atenção
            </label>
            <button className="btn-primary" disabled={saving} onClick={() => void save()}>
              <Icon name="check" /> {saving ? 'Salvando…' : `Salvar ${drafts.filter((d) => d.include).length} questões`}
            </button>
          </Card>
          <Section title={`Revisão — ${name || 'prova'}`}>
            <div className="space-y-3">
              {visible.map(({ d, i }) => (
                <Card key={`${d.number}-${i}`} className={cx(!d.include && 'opacity-50', (d.warnings.length > 0 || !d.answer) && 'border-warn/60')}>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="chip font-bold">Questão {d.number}</span>
                    <select className="input !w-auto !min-h-[40px] py-1" value={d.subject} onChange={(e) => update(i, { subject: e.target.value as SubjectId, topicId: null })} aria-label="Disciplina">
                      {SUBJECT_ORDER.filter((s) => s !== 'red').map((s) => <option key={s} value={s}>{SUBJECT_SHORT[s]}</option>)}
                    </select>
                    <select className="input !w-auto !min-h-[40px] py-1 max-w-[220px]" value={d.topicId ?? ''} onChange={(e) => update(i, { topicId: e.target.value || null })} aria-label="Tópico">
                      <option value="">Tópico…</option>
                      {topics.filter((t) => t.subject === d.subject).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    {d.language && <span className="chip text-xs">{d.language === 'ingles' ? 'inglês' : 'espanhol'}</span>}
                    <label className="flex items-center gap-2 text-sm ml-auto min-h-[44px]">
                      <input type="checkbox" className="w-5 h-5" checked={d.include} onChange={(e) => update(i, { include: e.target.checked })} /> Importar
                    </label>
                  </div>
                  {d.warnings.map((w) => (
                    <p key={w} className="text-xs text-warn flex gap-1 mb-1">
                      <Icon name="alert" size={14} className="shrink-0" /> {w}
                    </p>
                  ))}
                  <textarea className="input min-h-[80px] text-sm" value={d.statement} onChange={(e) => update(i, { statement: e.target.value })} aria-label={`Enunciado da questão ${d.number}`} />
                  <div className="space-y-1.5 mt-2">
                    {LETTERS.map((L) => (
                      <div key={L} className="flex gap-2 items-center">
                        <button
                          className={cx('w-11 shrink-0 !min-h-[40px]', d.answer === L ? 'btn-primary' : 'btn-ghost')}
                          aria-pressed={d.answer === L}
                          aria-label={`Gabarito ${L}`}
                          onClick={() => update(i, { answer: L })}
                        >
                          {L}
                        </button>
                        <input className="input !min-h-[40px] text-sm" value={d.options[L]} onChange={(e) => update(i, { options: { ...d.options, [L]: e.target.value } })} aria-label={`Alternativa ${L}`} />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted mt-2">
                    Gabarito: <strong className={d.answer ? 'text-accent' : 'text-warn'}>{d.answer ?? 'não encontrado — toque na letra'}</strong> · página {d.pages.join(', ')} guardada como imagem
                  </p>
                </Card>
              ))}
            </div>
          </Section>
        </>
      )}
    </Page>
  );
}
