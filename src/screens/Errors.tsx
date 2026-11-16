import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { repo, nowIso } from '../db/repo';
import type { ErrorLog, ErrorReason, Flashcard } from '../db/types';
import { useApp } from '../app/AppContext';
import { SUBJECT_SHORT, type SubjectId } from '../core/exam';
import { SUBJECT_ORDER } from '../data/seed';
import { dayKey, formatDay } from '../core/dates';
import { Card, Empty, Icon, Page, Section, Segmented, Sheet } from '../ui/kit';

export const REASONS: { value: ErrorReason; label: string }[] = [
  { value: 'conceito', label: 'Conceito' },
  { value: 'calculo', label: 'Cálculo' },
  { value: 'interpretacao', label: 'Interpretação' },
  { value: 'distracao', label: 'Distração' },
];

export default function Errors() {
  const [params, setParams] = useSearchParams();
  const topicFilter = params.get('topic');
  const errors = (useLiveQuery(() => db.error_log.orderBy('day').reverse().toArray(), []) ?? []).filter((e) => !e.deleted);
  const topics = useLiveQuery(() => db.topics.toArray(), []) ?? [];
  const [open, setOpen] = useState(params.get('novo') === '1');
  const [reason, setReason] = useState<ErrorReason | 'all'>('all');

  const list = errors.filter((e) => (!topicFilter || e.topicId === topicFilter) && (reason === 'all' || e.reason === reason));
  const counts = REASONS.map((r) => ({ ...r, n: errors.filter((e) => e.reason === r.value).length }));
  const byTopic = new Map<string, number>();
  for (const e of errors) if (e.topicId && e.day >= addDaysStr(-14)) byTopic.set(e.topicId, (byTopic.get(e.topicId) ?? 0) + 1);
  const worst = [...byTopic.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <Page title="Banco de erros" actions={<button className="btn-primary" onClick={() => setOpen(true)}><Icon name="plus" /> Registrar</button>}>
      <p className="text-muted mb-4 text-sm">Cada erro registrado dá bônus de revisão ao tópico no planejador por 14 dias.</p>
      <div className="grid grid-cols-2 tab:grid-cols-4 gap-2 mb-5">
        {counts.map((c) => (
          <button key={c.value} className={reason === c.value ? 'card !p-3 text-left ring-2 ring-pink' : 'card !p-3 text-left'} onClick={() => setReason(reason === c.value ? 'all' : c.value)}>
            <p className="text-2xl font-black">{c.n}</p>
            <p className="text-sm text-muted">{c.label}</p>
          </button>
        ))}
      </div>

      {worst.length > 0 && (
        <Section title="Tópicos com mais erros (14 dias)">
          <div className="flex flex-wrap gap-2">
            {worst.map(([id, n]) => (
              <button key={id} className="chip" onClick={() => setParams({ topic: id })}>
                {topics.find((t) => t.id === id)?.name ?? id} · {n}
              </button>
            ))}
          </div>
        </Section>
      )}

      <Section title={topicFilter ? `Erros: ${topics.find((t) => t.id === topicFilter)?.name}` : 'Todos os erros'} right={topicFilter ? <button className="btn-text text-sm" onClick={() => setParams({})}>limpar filtro</button> : undefined}>
        {list.length === 0 && <Empty>Nenhum erro registrado. Errar e anotar é o jeito mais rápido de subir nota.</Empty>}
        <ul className="space-y-2">
          {list.map((e) => (
            <li key={e.id}>
              <Card className="!p-3">
                <div className="flex justify-between gap-2 text-sm">
                  <span className="font-semibold">{e.topicId ? topics.find((t) => t.id === e.topicId)?.name : SUBJECT_SHORT[e.subject]}</span>
                  <span className="text-muted shrink-0">{formatDay(e.day)}</span>
                </div>
                <p className="text-xs text-accent font-semibold">{REASONS.find((r) => r.value === e.reason)?.label}</p>
                {e.note && <p className="text-sm mt-1 whitespace-pre-wrap">{e.note}</p>}
                <button
                  className="btn-text text-sm mt-1"
                  onClick={async () => {
                    await repo.put<Flashcard>('flashcards', { subject: e.subject, topicId: e.topicId, front: `Revisar erro (${REASONS.find((r) => r.value === e.reason)?.label}): ${e.note.slice(0, 140) || 'questão errada'}`, back: 'Escreva aqui o que você deveria ter feito.', created: dayKey() });
                  }}
                >
                  <Icon name="cards" size={16} /> Virar flashcard de revisão
                </button>
              </Card>
            </li>
          ))}
        </ul>
      </Section>
      <ErrorSheet open={open} onClose={() => setOpen(false)} defaultTopic={topicFilter} />
    </Page>
  );
}

function addDaysStr(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

export function ErrorSheet({ open, onClose, defaultTopic, questionId, defaultSubject }: { open: boolean; onClose: () => void; defaultTopic?: string | null; questionId?: string; defaultSubject?: SubjectId }) {
  const { toast } = useApp();
  const topics = useLiveQuery(() => db.topics.toArray(), []) ?? [];
  const [subject, setSubject] = useState<SubjectId>(defaultSubject ?? 'mat');
  const [topicId, setTopicId] = useState(defaultTopic ?? '');
  const [reason, setReason] = useState<ErrorReason>('conceito');
  const [note, setNote] = useState('');
  useEffect(() => {
    if (!open) return;
    const t = topics.find((x) => x.id === defaultTopic);
    if (t) setSubject(t.subject);
    else if (defaultSubject) setSubject(defaultSubject);
    setTopicId(defaultTopic ?? '');
    setNote('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultTopic, defaultSubject]);
  const save = async () => {
    await repo.append<ErrorLog>('error_log', { subject, topicId: topicId || null, reason, note: note.trim(), questionId, day: dayKey(), at: nowIso() });
    toast('Erro registrado. Ele volta na revisão.');
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title="Registrar erro">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <select className="input" value={subject} onChange={(e) => { setSubject(e.target.value as SubjectId); setTopicId(''); }} aria-label="Disciplina">
            {SUBJECT_ORDER.map((s) => <option key={s} value={s}>{SUBJECT_SHORT[s]}</option>)}
          </select>
          <select className="input" value={topicId} onChange={(e) => setTopicId(e.target.value)} aria-label="Tópico">
            <option value="">Tópico…</option>
            {topics.filter((t) => t.subject === subject && !t.deleted).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <span className="label">Motivo</span>
          <Segmented label="Motivo" value={reason} options={REASONS} onChange={setReason} />
        </div>
        <textarea className="input min-h-[90px]" placeholder="O que aconteceu? (opcional)" value={note} onChange={(e) => setNote(e.target.value)} />
        <button className="btn-primary w-full" onClick={() => void save()}>Salvar</button>
      </div>
    </Sheet>
  );
}
