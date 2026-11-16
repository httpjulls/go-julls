import { useMemo, useState } from 'react';
import { Link, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { repo, nowIso } from '../db/repo';
import type { Flashcard, FlashcardReview } from '../db/types';
import { useApp } from '../app/AppContext';
import { completeStudy } from '../app/actions';
import { replay, type CardState, type Grade } from '../core/sm2';
import { SUBJECT_NAMES, SUBJECT_SHORT, type SubjectId } from '../core/exam';
import { SUBJECT_ORDER } from '../data/seed';
import { dayKey, formatDay } from '../core/dates';
import { Card, Empty, Icon, Markdown, Page, Section, Sheet } from '../ui/kit';
import { buzz } from '../native/native';

function useCards() {
  return useLiveQuery(async () => {
    const [cards, reviews] = await Promise.all([db.flashcards.toArray(), db.flashcard_reviews.toArray()]);
    const by = new Map<string, FlashcardReview[]>();
    for (const r of reviews) by.set(r.cardId, [...(by.get(r.cardId) ?? []), r]);
    return cards
      .filter((c) => !c.deleted)
      .map((c) => ({ card: c, state: replay(c.created, (by.get(c.id) ?? []).map((r) => ({ day: r.day, grade: r.grade }))), reviews: by.get(c.id)?.length ?? 0 }));
  }, []);
}

export default function Flashcards() {
  return (
    <Routes>
      <Route index element={<Decks />} />
      <Route path="revisar" element={<Review />} />
    </Routes>
  );
}

function Decks() {
  const [params] = useSearchParams();
  const topicFilter = params.get('topic');
  const all = useCards();
  const topics = useLiveQuery(() => db.topics.toArray(), []) ?? [];
  const [editing, setEditing] = useState<Partial<Flashcard> | null>(null);
  const today = dayKey();

  const list = (all ?? []).filter((x) => !topicFilter || x.card.topicId === topicFilter);
  const bySubject = SUBJECT_ORDER.map((s) => ({
    s,
    total: list.filter((x) => x.card.subject === s).length,
    due: list.filter((x) => x.card.subject === s && x.state.due <= today).length,
  })).filter((x) => x.total > 0);
  const dueTotal = list.filter((x) => x.state.due <= today).length;
  const topicName = topics.find((t) => t.id === topicFilter)?.name;

  return (
    <Page title="Flashcards" actions={<button className="btn-primary" onClick={() => setEditing({ subject: (topics.find((t) => t.id === topicFilter)?.subject as SubjectId) ?? 'mat', topicId: topicFilter })}><Icon name="plus" /> Novo</button>}>
      {topicName && <p className="chip mb-3">Tópico: {topicName}</p>}
      <Card className="mb-5 flex items-center gap-4">
        <div className="flex-1">
          <p className="text-3xl font-black text-accent">{dueTotal}</p>
          <p className="text-muted text-sm">para revisar hoje</p>
        </div>
        <Link to={`/flashcards/revisar${topicFilter ? `?topic=${topicFilter}` : ''}`} className="btn-primary" aria-disabled={!dueTotal}>
          <Icon name="play" /> Revisar
        </Link>
      </Card>

      <Section title="Baralhos por disciplina">
        {bySubject.length === 0 && <Empty>Nenhum flashcard ainda. Crie o primeiro: pergunta curta na frente, resposta direta no verso.</Empty>}
        <div className="grid tab:grid-cols-2 gap-2">
          {bySubject.map(({ s, total, due }) => (
            <Link key={s} to={`/flashcards/revisar?subject=${s}`} className="card flex items-center justify-between">
              <span className="font-semibold">{SUBJECT_NAMES[s]}</span>
              <span className="text-sm text-muted">
                {due} hoje · {total} cartões
              </span>
            </Link>
          ))}
        </div>
      </Section>

      <Section title="Cartões">
        <ul className="space-y-2">
          {list
            .sort((a, b) => a.state.due.localeCompare(b.state.due))
            .map(({ card, state }) => (
              <li key={card.id}>
                <button className="card w-full text-left !p-3" onClick={() => setEditing(card)}>
                  <p className="font-medium line-clamp-2">{card.front}</p>
                  <p className="text-xs text-muted mt-1">
                    {SUBJECT_SHORT[card.subject]} · próxima: {state.due <= today ? 'hoje' : formatDay(state.due)} · intervalo {state.interval}d
                  </p>
                </button>
              </li>
            ))}
        </ul>
      </Section>
      <CardEditor value={editing} onClose={() => setEditing(null)} />
    </Page>
  );
}

function CardEditor({ value, onClose }: { value: Partial<Flashcard> | null; onClose: () => void }) {
  const topics = useLiveQuery(() => db.topics.toArray(), []) ?? [];
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [subject, setSubject] = useState<SubjectId>('mat');
  const [topicId, setTopicId] = useState<string>('');
  const [key, setKey] = useState<unknown>(null);
  if (value !== key) {
    setKey(value);
    setFront(value?.front ?? '');
    setBack(value?.back ?? '');
    setSubject((value?.subject as SubjectId) ?? 'mat');
    setTopicId(value?.topicId ?? '');
  }
  if (!value) return null;
  const save = async (again: boolean) => {
    if (!front.trim() || !back.trim()) return;
    if (value.id) await repo.update<Flashcard>('flashcards', value.id, { front, back, subject, topicId: topicId || null });
    else await repo.put<Flashcard>('flashcards', { front, back, subject, topicId: topicId || null, created: dayKey() });
    if (again && !value.id) {
      setFront('');
      setBack('');
    } else onClose();
  };
  return (
    <Sheet open onClose={onClose} title={value.id ? 'Editar flashcard' : 'Novo flashcard'}>
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
        <textarea className="input min-h-[90px]" placeholder="Frente (pergunta)" value={front} onChange={(e) => setFront(e.target.value)} />
        <textarea className="input min-h-[90px]" placeholder="Verso (resposta) — aceita Markdown" value={back} onChange={(e) => setBack(e.target.value)} />
        <div className="flex gap-2">
          {!value.id && <button className="btn-ghost flex-1" onClick={() => void save(true)}>Salvar e criar outro</button>}
          <button className="btn-primary flex-1" onClick={() => void save(false)}>Salvar</button>
        </div>
        {value.id && (
          <button className="btn-text text-warn" onClick={() => void repo.remove('flashcards', value.id!).then(onClose)}>
            <Icon name="trash" size={18} /> Excluir
          </button>
        )}
      </div>
    </Sheet>
  );
}

function Review() {
  const { toast } = useApp();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const subject = params.get('subject') as SubjectId | null;
  const topic = params.get('topic');
  const all = useCards();
  const today = dayKey();
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);
  const [startedAt] = useState(() => new Date().toISOString());
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  const queue = useMemo(
    () =>
      (all ?? [])
        .filter((x) => x.state.due <= today && !skipped.has(x.card.id))
        .filter((x) => (!subject || x.card.subject === subject) && (!topic || x.card.topicId === topic))
        .sort((a, b) => a.state.due.localeCompare(b.state.due) || a.card.id.localeCompare(b.card.id)),
    [all, today, subject, topic, skipped],
  );
  const cur = queue[0] as { card: Flashcard; state: CardState } | undefined;

  const grade = async (g: Grade) => {
    if (!cur) return;
    await repo.append<FlashcardReview>('flashcard_reviews', { cardId: cur.card.id, grade: g, day: today, at: nowIso() });
    void buzz();
    // errou: volta para o fim da fila de hoje
    if (g !== 0) setSkipped(new Set(skipped).add(cur.card.id));
    else setSkipped(new Set(skipped).add(cur.card.id));
    setRevealed(false);
    setDone(done + 1);
  };

  const finish = async () => {
    const minutes = Math.round((Date.now() - Date.parse(startedAt)) / 60000);
    if (done > 0 && minutes >= 1) await completeStudy({ topicId: topic, subject: subject ?? cur?.card.subject ?? 'mat', minutes, kind: 'flashcards' });
    toast(`${done} cartões revisados. Go, Julls!`);
    nav('/flashcards');
  };

  return (
    <Page title="Revisão" back={() => void finish()}>
      {!cur ? (
        <Card className="text-center py-10">
          <Icon name="check" size={40} className="mx-auto text-pinks" />
          <p className="text-xl font-bold mt-3">Revisão em dia!</p>
          <p className="text-muted">{done} cartões revisados agora.</p>
          <button className="btn-primary mt-5" onClick={() => void finish()}>Concluir</button>
        </Card>
      ) : (
        <div className="max-w-xl mx-auto">
          <p className="text-sm text-muted mb-2">
            {queue.length} na fila · {SUBJECT_SHORT[cur.card.subject]}
          </p>
          <Card className="min-h-[220px] flex flex-col justify-center text-center">
            <p className="text-xl font-semibold whitespace-pre-wrap">{cur.card.front}</p>
            {revealed && (
              <div className="border-t border-line mt-4 pt-4 text-left">
                <Markdown text={cur.card.back} />
              </div>
            )}
          </Card>
          {!revealed ? (
            <button className="btn-primary w-full mt-4" onClick={() => setRevealed(true)}>Mostrar resposta</button>
          ) : (
            <div className="grid grid-cols-4 gap-2 mt-4">
              <button className="btn-ghost text-warn" onClick={() => void grade(0)}>Errei</button>
              <button className="btn-ghost" onClick={() => void grade(1)}>Difícil</button>
              <button className="btn-ghost" onClick={() => void grade(2)}>Bom</button>
              <button className="btn-primary" onClick={() => void grade(3)}>Fácil</button>
            </div>
          )}
        </div>
      )}
    </Page>
  );
}
