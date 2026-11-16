import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { repo, nowIso } from '../db/repo';
import type { MasteryLog, Topic, TopicStatus } from '../db/types';
import { useApp, useSnapshot } from '../app/AppContext';
import { SUBJECT_ORDER } from '../data/seed';
import { SUBJECT_NAMES, SUBJECT_POINTS, fmt, type SubjectId } from '../core/exam';
import { topicValue } from '../core/planner';
import { weightedMastery } from '../core/projection';
import { dayKey, formatDay, formatMinutes } from '../core/dates';
import { Bar, Card, Empty, Icon, Markdown, MasteryPicker, Page, Section, Segmented, Sheet, cx } from '../ui/kit';

const STATUS: { value: TopicStatus; label: string }[] = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'estudando', label: 'Estudando' },
  { value: 'revisado', label: 'Revisado' },
  { value: 'dominado', label: 'Dominado' },
];

/** Cor por prioridade (valor do tópico): alto = rosa forte, médio = rosa suave, baixo = neutro. */
function priorityClass(v: number, max: number) {
  const r = max ? v / max : 0;
  if (r > 0.5) return 'border-l-4 border-l-pink';
  if (r > 0.2) return 'border-l-4 border-l-pinks';
  return 'border-l-4 border-l-line';
}

export default function MapScreen() {
  const { id } = useParams();
  const snap = useSnapshot();
  const nav = useNavigate();
  const [subject, setSubject] = useState<SubjectId | 'all'>('all');
  const [adding, setAdding] = useState(false);

  const scored = useMemo(() => {
    if (!snap) return [];
    const n = new Map<SubjectId, number>();
    for (const t of snap.topics) n.set(t.subject, (n.get(t.subject) ?? 0) + 1);
    return snap.topics.map((t) => {
      const st = snap.states.get(t.id)!;
      return { t, st, value: topicValue({ ...t, mastery: st.mastery, lastStudied: st.lastStudied, recentErrors: st.recentErrors, masteryDropped: st.dropped }, n.get(t.subject) ?? 1, dayKey(), false).value };
    });
  }, [snap]);
  const maxV = Math.max(0, ...scored.map((s) => s.value));

  if (!snap) return <Page title="Mapa de matérias"><p className="text-muted">Carregando…</p></Page>;

  const list = (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1">
        <button className={subject === 'all' ? 'chip-on' : 'chip'} onClick={() => setSubject('all')}>Todas</button>
        {SUBJECT_ORDER.map((s) => (
          <button key={s} className={subject === s ? 'chip-on whitespace-nowrap' : 'chip whitespace-nowrap'} onClick={() => setSubject(s)}>
            {SUBJECT_NAMES[s].split(' ')[0]}
          </button>
        ))}
      </div>
      {SUBJECT_ORDER.filter((s) => subject === 'all' || s === subject).map((s) => {
        const items = scored.filter((x) => x.t.subject === s).sort((a, b) => a.t.order - b.t.order);
        const m = weightedMastery(items.map((x) => ({ subject: s, frequency: x.t.frequency, mastery: x.st.mastery })), s);
        const mins = items.reduce((a, x) => a + x.st.minutes, 0);
        return (
          <Section key={s} title={`${SUBJECT_NAMES[s]} · ${fmt(SUBJECT_POINTS[s])} pts`} right={<span className="text-xs text-muted">{formatMinutes(mins)}</span>}>
            <Bar value={m} max={5} className="mb-2" />
            <ul className="space-y-1.5">
              {items.map(({ t, st, value }) => (
                <li key={t.id}>
                  <Link to={`/mapa/${t.id}`} className={cx('card !p-3 flex items-center gap-3 min-h-[56px]', priorityClass(value, maxV), id === t.id && 'ring-2 ring-pink')}>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium leading-snug">{t.name}</p>
                      <p className="text-xs text-muted">
                        {'●'.repeat(t.frequency)}
                        {'○'.repeat(5 - t.frequency)} frequência · {STATUS.find((x) => x.value === t.status)?.label}
                        {st.recentErrors > 0 && ` · ${st.recentErrors} erro(s)`}
                        {!t.active && " · fora do plano"}
                      </p>
                    </div>
                    <span className={cx('text-sm font-bold tabular-nums', st.mastery >= 4 ? 'text-pinks' : st.mastery <= 1 ? 'text-warn' : 'text-ink')} aria-label={`domínio ${st.mastery} de 5`}>
                      {st.mastery}/5
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        );
      })}
      <button className="btn-ghost w-full" onClick={() => setAdding(true)}>
        <Icon name="plus" /> Novo tópico
      </button>
      <p className="text-xs text-muted mt-3">Borda rosa forte = prioridade alta (vale mais ponto por hora). Frequência: ● = estimativa de quanto cai, editável.</p>
    </div>
  );

  return (
    <Page title="Mapa de matérias" back={id ? () => nav('/mapa') : undefined}>
      <div className="tab:grid tab:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] tab:gap-6">
        <div className={cx(id && 'hidden tab:block')}>{list}</div>
        <div className={cx(!id && 'hidden tab:block')}>
          {id ? <TopicDetail id={id} /> : <Card><Empty>Escolha um tópico à esquerda.</Empty></Card>}
        </div>
      </div>
      <NewTopicSheet open={adding} onClose={() => setAdding(false)} defaultSubject={subject === 'all' ? 'mat' : subject} />
    </Page>
  );
}

function TopicDetail({ id }: { id: string }) {
  const { toast } = useApp();
  const snap = useSnapshot();
  const topic = useLiveQuery(() => db.topics.get(id), [id]);
  const history = useLiveQuery(() => db.mastery_log.where('topicId').equals(id).sortBy('at'), [id]) ?? [];
  const notes = useLiveQuery(() => db.notes.where('topicId').equals(id).toArray(), [id]) ?? [];
  const counts = useLiveQuery(async () => ({
    cards: await db.flashcards.where('topicId').equals(id).filter((c) => !c.deleted).count(),
    questions: await db.questions.where('topicId').equals(id).filter((c) => !c.deleted).count(),
    errors: await db.error_log.where('topicId').equals(id).count(),
  }), [id]);
  const [editName, setEditName] = useState<string | null>(null);

  if (!topic || !snap) return null;
  const st = snap.states.get(id);
  const formula = notes.find((n) => n.kind === 'formula' && !n.deleted);

  const setMastery = async (m: number) => {
    await repo.append<MasteryLog>('mastery_log', { topicId: id, subject: topic.subject, mastery: m, day: dayKey(), at: nowIso(), source: 'manual' });
    toast(`Domínio atualizado: ${m}/5`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-sm text-accent font-semibold">{SUBJECT_NAMES[topic.subject]}</p>
        {editName === null ? (
          <div className="flex items-start gap-2">
            <h2 className="text-xl font-bold flex-1">{topic.name}</h2>
            <button className="btn-text" aria-label="Editar nome" onClick={() => setEditName(topic.name)}>
              <Icon name="edit" size={18} />
            </button>
          </div>
        ) : (
          <div className="flex gap-2 mt-1">
            <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} aria-label="Nome do tópico" />
            <button className="btn-primary" onClick={() => void repo.update<Topic>('topics', id, { name: editName.trim() || topic.name }).then(() => setEditName(null))}>
              OK
            </button>
          </div>
        )}
        <p className="text-xs text-muted mt-1">Origem da frequência: {topic.source}</p>
        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
          <div className="bg-elevated rounded-xl p-2">
            <p className="text-2xl font-black">{st?.mastery ?? 0}</p>
            <p className="text-xs text-muted">domínio</p>
          </div>
          <div className="bg-elevated rounded-xl p-2">
            <p className="text-2xl font-black">{formatMinutes(st?.minutes ?? 0)}</p>
            <p className="text-xs text-muted">estudado</p>
          </div>
          <div className="bg-elevated rounded-xl p-2">
            <p className="text-2xl font-black">{st?.lastStudied ? formatDay(st.lastStudied) : '—'}</p>
            <p className="text-xs text-muted">última vez</p>
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <div>
          <p className="label">Domínio (0–5)</p>
          <MasteryPicker value={st?.mastery ?? 0} onChange={(m) => void setMastery(m)} />
        </div>
        <div>
          <p className="label">Frequência nas provas (1–5)</p>
          <Segmented
            label="Frequência"
            value={String(topic.frequency)}
            options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }))}
            onChange={(v) => void repo.update<Topic>('topics', id, { frequency: Number(v) })}
          />
        </div>
        <div>
          <p className="label">Status</p>
          <Segmented label="Status" value={topic.status} options={STATUS} onChange={(v) => void repo.update<Topic>('topics', id, { status: v })} />
        </div>
        <button className="btn-text text-sm" onClick={() => void repo.update<Topic>('topics', id, { active: !topic.active })}>
          {topic.active ? 'Tirar do planejamento' : 'Voltar ao planejamento'}
        </button>
      </Card>

      {history.length > 0 && (
        <Card>
          <p className="label">Evolução do domínio</p>
          <div className="flex items-end gap-1 h-20" aria-label="Histórico de domínio">
            {history.slice(-20).map((h) => (
              <div key={h.id} className="flex-1 bg-pink/80 rounded-t" style={{ height: `${(h.mastery / 5) * 100 || 4}%` }} title={`${formatDay(h.day)}: ${h.mastery}/5`} />
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Link to={`/anotacoes?topic=${id}`} className="btn-ghost"><Icon name="note" size={18} /> Anotações ({notes.filter((n) => n.kind === 'note' && !n.deleted).length})</Link>
        <Link to={`/flashcards?topic=${id}`} className="btn-ghost"><Icon name="cards" size={18} /> Flashcards ({counts?.cards ?? 0})</Link>
        <Link to={`/questoes?topic=${id}`} className="btn-ghost"><Icon name="quiz" size={18} /> Questões ({counts?.questions ?? 0})</Link>
        <Link to={`/erros?topic=${id}`} className="btn-ghost"><Icon name="bug" size={18} /> Erros ({counts?.errors ?? 0})</Link>
      </div>

      {formula && (
        <Card>
          <div className="flex justify-between items-center">
            <p className="label">Formulário</p>
            <Link to={`/formulario?id=${formula.id}`} className="btn-text text-sm">editar</Link>
          </div>
          <Markdown text={formula.body} />
        </Card>
      )}
    </div>
  );
}

function NewTopicSheet({ open, onClose, defaultSubject }: { open: boolean; onClose: () => void; defaultSubject: SubjectId }) {
  const [s, setS] = useState<SubjectId>(defaultSubject);
  const [name, setName] = useState('');
  const [freq, setFreq] = useState(3);
  const save = async () => {
    if (!name.trim()) return;
    const order = await db.topics.where('subject').equals(s).count();
    await repo.put<Topic>('topics', { subject: s, name: name.trim(), frequency: freq, status: 'pendente', order, active: true, custom: true, source: 'criado por você' });
    setName('');
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title="Novo tópico">
      <div className="space-y-3">
        <select className="input" value={s} onChange={(e) => setS(e.target.value as SubjectId)} aria-label="Disciplina">
          {SUBJECT_ORDER.map((x) => (
            <option key={x} value={x}>{SUBJECT_NAMES[x]}</option>
          ))}
        </select>
        <input className="input" placeholder="Nome do tópico" value={name} onChange={(e) => setName(e.target.value)} />
        <Segmented label="Frequência" value={String(freq)} options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `freq. ${n}` }))} onChange={(v) => setFreq(Number(v))} />
        <button className="btn-primary w-full" onClick={() => void save()}>Salvar</button>
      </div>
    </Sheet>
  );
}
