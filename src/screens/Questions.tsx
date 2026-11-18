import { useEffect, useMemo, useState } from 'react';
import { Route, Routes, useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { repo, nowIso } from '../db/repo';
import type { Letter, Question, QuestionAttempt } from '../db/types';
import { useApp } from '../app/AppContext';
import { completeStudy } from '../app/actions';
import { SUBJECT_SHORT, type SubjectId } from '../core/exam';
import { SUBJECT_ORDER } from '../data/seed';
import { dayKey } from '../core/dates';
import { parseQuestion } from '../core/parseQuestion';
import { Card, Empty, Icon, Markdown, Page, Section, Segmented, Sheet, cx } from '../ui/kit';
import { ErrorSheet } from './Errors';
import ImportExam from './ImportExam';
import { QuestionImages } from '../app/attachments';
import { buzz } from '../native/native';

const LETTERS: Letter[] = ['A', 'B', 'C', 'D'];

export default function Questions() {
  return (
    <Routes>
      <Route index element={<Bank />} />
      <Route path="praticar" element={<Practice />} />
      <Route path="importar" element={<ImportExam />} />
    </Routes>
  );
}

function useBank() {
  return useLiveQuery(async () => {
    const [qs, atts] = await Promise.all([db.questions.toArray(), db.question_attempts.toArray()]);
    const last = new Map<string, QuestionAttempt>();
    const count = new Map<string, number>();
    for (const a of atts.filter((x) => !x.deleted && !x.mockId).sort((x, y) => x.at.localeCompare(y.at))) {
      last.set(a.questionId, a);
      count.set(a.questionId, (count.get(a.questionId) ?? 0) + 1);
    }
    return qs.filter((q) => !q.deleted).map((q) => ({ q, last: last.get(q.id), attempts: count.get(q.id) ?? 0 }));
  }, []);
}

function Bank() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const topicFilter = params.get('topic');
  const bank = useBank() ?? [];
  const topics = useLiveQuery(() => db.topics.toArray(), []) ?? [];
  const [editing, setEditing] = useState<Partial<Question> | null>(null);
  const [subject, setSubject] = useState<SubjectId | 'all'>('all');
  const [search, setSearch] = useState('');
  const [exam, setExam] = useState<string>('all');
  const exams = [...new Map(bank.filter((x) => x.q.examId).map((x) => [x.q.examId!, x.q.examName ?? x.q.examId!])).entries()];

  const list = bank
    .filter(
      ({ q }) =>
        (!topicFilter || q.topicId === topicFilter) &&
        (subject === 'all' || q.subject === subject) &&
        (exam === 'all' || q.examId === exam) &&
        (!search || q.statement.toLowerCase().includes(search.toLowerCase())),
    )
    .sort((a, b) => (a.q.examId ?? '').localeCompare(b.q.examId ?? '') || (a.q.number ?? 0) - (b.q.number ?? 0));
  const wrong = list.filter((x) => x.last && !x.last.correct).length;
  const qs = new URLSearchParams();
  if (topicFilter) qs.set('topic', topicFilter);
  if (subject !== 'all') qs.set('subject', subject);
  if (exam !== 'all') qs.set('exam', exam);

  return (
    <Page title="Banco de questões" actions={<button className="btn-primary" onClick={() => setEditing({ subject: (topics.find((t) => t.id === topicFilter)?.subject as SubjectId) ?? 'mat', topicId: topicFilter })}><Icon name="plus" /> Nova</button>}>
      <p className="text-sm text-muted mb-4">Suas questões: importe provas em PDF, cadastre ou cole (enunciado, alternativas A–D, gabarito).</p>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <button className="btn-ghost" onClick={() => nav('/questoes/importar')}>
          <Icon name="upload" /> Importar prova (PDF)
        </button>
        <button
          className="btn-ghost"
          disabled={!list.length}
          onClick={() => nav(`/listas/nova?${new URLSearchParams({ ...(topicFilter ? { topic: topicFilter } : {}), ...(subject !== 'all' ? { subject } : {}), ...(exam !== 'all' ? { exam } : {}) })}`)}
        >
          <Icon name="download" /> Gerar PDF de lista
        </button>
      </div>
      {exams.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button className={exam === 'all' ? 'chip-on' : 'chip'} onClick={() => setExam('all')}>Todas as fontes</button>
          {exams.map(([id, label]) => (
            <button key={id} className={exam === id ? 'chip-on whitespace-nowrap' : 'chip whitespace-nowrap'} onClick={() => setExam(id)}>
              {label}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 mb-5">
        <button className="btn-primary" disabled={!list.length} onClick={() => nav(`/questoes/praticar?${qs}`)}>
          <Icon name="play" /> Praticar ({list.length})
        </button>
        <button className="btn-ghost" disabled={!wrong} onClick={() => nav(`/questoes/praticar?${qs}&modo=erradas`)}>
          <Icon name="sync" /> Refazer erradas ({wrong})
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-3">
        <button className={subject === 'all' ? 'chip-on' : 'chip'} onClick={() => setSubject('all')}>Todas</button>
        {SUBJECT_ORDER.filter((s) => s !== 'red').map((s) => (
          <button key={s} className={subject === s ? 'chip-on whitespace-nowrap' : 'chip whitespace-nowrap'} onClick={() => setSubject(s)}>
            {SUBJECT_SHORT[s]}
          </button>
        ))}
      </div>
      <input className="input mb-4" placeholder="Buscar no enunciado…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar" />
      <Section title={`${list.length} questões`}>
        {list.length === 0 && <Empty>Nenhuma questão aqui ainda.</Empty>}
        <ul className="space-y-2">
          {list.map(({ q, last, attempts }) => (
            <li key={q.id}>
              <button className="card !p-3 w-full text-left" onClick={() => setEditing(q)}>
                <p className="line-clamp-2">{q.statement}</p>
                <p className="text-xs text-muted mt-1">
                  {SUBJECT_SHORT[q.subject]}
                  {q.topicId && ` · ${topics.find((t) => t.id === q.topicId)?.name ?? ''}`}
                  {attempts > 0 && ` · ${attempts} tentativa(s)`}
                  {last && (last.correct ? ' · última: acertou' : ' · última: errou')}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </Section>
      <QuestionEditor value={editing} onClose={() => setEditing(null)} />
    </Page>
  );
}

function QuestionEditor({ value, onClose }: { value: Partial<Question> | null; onClose: () => void }) {
  const topics = useLiveQuery(() => db.topics.toArray(), []) ?? [];
  const [q, setQ] = useState<Partial<Question>>({});
  const [paste, setPaste] = useState('');
  const [mode, setMode] = useState<'colar' | 'campos'>('campos');
  useEffect(() => {
    if (!value) return;
    setQ({ options: { A: '', B: '', C: '', D: '' }, answer: 'A', solution: '', source: '', statement: '', ...value });
    setMode(value.id ? 'campos' : 'colar');
    setPaste('');
  }, [value]);
  if (!value) return null;
  const subject = (q.subject ?? 'mat') as SubjectId;
  const apply = () => {
    const p = parseQuestion(paste);
    setQ({ ...q, statement: p.statement, options: p.options, answer: p.answer ?? q.answer ?? 'A' });
    setMode('campos');
  };
  const save = async () => {
    if (!q.statement?.trim()) return;
    const row = { subject, topicId: q.topicId || null, statement: q.statement, options: q.options!, answer: q.answer as Letter, solution: q.solution ?? '', source: q.source ?? '' };
    if (q.id) await repo.update<Question>('questions', q.id, row);
    else await repo.put<Question>('questions', row);
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title={q.id ? 'Editar questão' : 'Nova questão'}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <select className="input" value={subject} onChange={(e) => setQ({ ...q, subject: e.target.value as SubjectId, topicId: null })} aria-label="Disciplina">
            {SUBJECT_ORDER.filter((s) => s !== 'red').map((s) => <option key={s} value={s}>{SUBJECT_SHORT[s]}</option>)}
          </select>
          <select className="input" value={q.topicId ?? ''} onChange={(e) => setQ({ ...q, topicId: e.target.value || null })} aria-label="Tópico">
            <option value="">Tópico…</option>
            {topics.filter((t) => t.subject === subject && !t.deleted).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        {!q.id && <Segmented label="Modo" value={mode} options={[{ value: 'colar', label: 'Colar texto' }, { value: 'campos', label: 'Campos' }]} onChange={setMode} />}
        {mode === 'colar' ? (
          <>
            <textarea
              className="input min-h-[200px] font-mono text-sm"
              placeholder={'Cole aqui:\nEnunciado…\n(A) …\n(B) …\n(C) …\n(D) …\nGabarito: C'}
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
            />
            <button className="btn-primary w-full" onClick={apply}>Separar alternativas</button>
          </>
        ) : (
          <>
            <textarea className="input min-h-[120px]" placeholder="Enunciado (aceita Markdown)" value={q.statement ?? ''} onChange={(e) => setQ({ ...q, statement: e.target.value })} />
            <QuestionImages ids={q.images} />
            {LETTERS.map((L) => (
              <div key={L} className="flex gap-2 items-center">
                <button className={cx('w-12 shrink-0', q.answer === L ? 'btn-primary' : 'btn-ghost')} aria-label={`Marcar ${L} como correta`} aria-pressed={q.answer === L} onClick={() => setQ({ ...q, answer: L })}>
                  {L}
                </button>
                <input className="input" value={q.options?.[L] ?? ''} onChange={(e) => setQ({ ...q, options: { ...q.options!, [L]: e.target.value } })} aria-label={`Alternativa ${L}`} />
              </div>
            ))}
            <p className="text-xs text-muted">Toque na letra para marcar o gabarito (atual: {q.answer}).</p>
            <textarea className="input min-h-[80px]" placeholder="Resolução (opcional, Markdown)" value={q.solution ?? ''} onChange={(e) => setQ({ ...q, solution: e.target.value })} />
            <input className="input" placeholder="Fonte (ex.: apostila, lista do professor)" value={q.source ?? ''} onChange={(e) => setQ({ ...q, source: e.target.value })} />
            <button className="btn-primary w-full" onClick={() => void save()}>Salvar</button>
            {q.id && (
              <button className="btn-text text-warn" onClick={() => void repo.remove('questions', q.id!).then(onClose)}>
                <Icon name="trash" size={18} /> Excluir
              </button>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
}

function Practice() {
  const { toast } = useApp();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const bank = useBank();
  const topic = params.get('topic');
  const subject = params.get('subject');
  const exam = params.get('exam');
  const onlyWrong = params.get('modo') === 'erradas';
  const [queue, setQueue] = useState<string[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [chosen, setChosen] = useState<Letter | null>(null);
  const [shownAt, setShownAt] = useState(Date.now());
  const [stats, setStats] = useState({ c: 0, w: 0 });
  const [errOpen, setErrOpen] = useState(false);
  const [startedAt] = useState(() => new Date().toISOString());

  useEffect(() => {
    if (!bank || queue) return;
    const ids = bank
      .filter(({ q }) => (!topic || q.topicId === topic) && (!subject || q.subject === subject) && (!exam || q.examId === exam))
      .filter((x) => !onlyWrong || (x.last && !x.last.correct))
      .sort((a, b) => (a.q.number ?? 0) - (b.q.number ?? 0))
      .map((x) => x.q.id);
    // de um material ou prova: na ordem; senão, embaralha
    if (!exam)
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
    setQueue(ids);
  }, [bank, queue, topic, subject, exam, onlyWrong]);

  const q = useMemo(() => bank?.find((x) => x.q.id === queue?.[idx])?.q, [bank, queue, idx]);

  const answer = async (L: Letter) => {
    if (!q || chosen) return;
    setChosen(L);
    const correct = L === q.answer;
    void buzz(correct ? 'tap' : 'done');
    setStats((s) => ({ c: s.c + (correct ? 1 : 0), w: s.w + (correct ? 0 : 1) }));
    await repo.append<QuestionAttempt>('question_attempts', {
      questionId: q.id,
      subject: q.subject,
      topicId: q.topicId,
      chosen: L,
      correct,
      seconds: Math.round((Date.now() - shownAt) / 1000),
      day: dayKey(),
      at: nowIso(),
    });
  };
  const next = () => {
    setChosen(null);
    setIdx(idx + 1);
    setShownAt(Date.now());
  };
  const finish = async () => {
    const minutes = Math.round((Date.now() - Date.parse(startedAt)) / 60000);
    const first = bank?.find((x) => x.q.id === queue?.[0])?.q;
    if (minutes >= 1 && stats.c + stats.w > 0)
      await completeStudy({ topicId: topic, subject: (subject as SubjectId) ?? first?.subject ?? 'mat', minutes, kind: 'questions' });
    toast(`${stats.c} acertos, ${stats.w} erros. Go, Julls!`);
    nav(-1);
  };

  if (!queue) return <Page title="Praticar"><p className="text-muted">Carregando…</p></Page>;
  return (
    <Page title={onlyWrong ? 'Refazer erradas' : 'Praticar'} back={() => void finish()}>
      {!q ? (
        <Card className="text-center py-10">
          <p className="text-xl font-bold">Fim da lista!</p>
          <p className="text-muted">
            {stats.c} acertos · {stats.w} erros
          </p>
          <button className="btn-primary mt-4" onClick={() => void finish()}>Concluir</button>
        </Card>
      ) : (
        <div className="max-w-2xl">
          <p className="text-sm text-muted mb-2">
            Questão {idx + 1} de {queue.length} · {SUBJECT_SHORT[q.subject]} · {stats.c}✓ {stats.w}✗
          </p>
          <Card>
            {q.examName && <p className="text-xs text-accent font-semibold mb-1">{q.examName} · questão {q.number}</p>}
            <Markdown text={q.statement} />
            <QuestionImages ids={q.images} />
          </Card>
          <div className="space-y-2 mt-3">
            {LETTERS.map((L) => {
              const isAns = chosen && L === q.answer;
              const isWrong = chosen === L && L !== q.answer;
              return (
                <button
                  key={L}
                  onClick={() => void answer(L)}
                  className={cx('card !p-3 w-full text-left flex gap-3 items-start min-h-[52px]', isAns && 'ring-2 ring-pinks', isWrong && 'ring-2 ring-warn')}
                  aria-label={`Alternativa ${L}${isAns ? ', correta' : ''}${isWrong ? ', sua resposta, errada' : ''}`}
                >
                  <span className="font-black w-6">{L}</span>
                  <span className="flex-1">{q.options[L]}</span>
                  {isAns && <Icon name="check" className="text-pinks" />}
                  {isWrong && <Icon name="x" className="text-warn" />}
                </button>
              );
            })}
          </div>
          {chosen && (
            <div className="mt-4 space-y-3">
              <p className={cx('font-bold', chosen === q.answer ? 'text-pinks' : 'text-warn')}>{chosen === q.answer ? 'Acertou! ✓' : `Errou. Gabarito: ${q.answer}`}</p>
              {q.solution && (
                <Card>
                  <p className="label">Resolução</p>
                  <Markdown text={q.solution} />
                </Card>
              )}
              <div className="flex gap-2">
                {chosen !== q.answer && (
                  <button className="btn-ghost" onClick={() => setErrOpen(true)}>
                    <Icon name="bug" /> Anotar motivo
                  </button>
                )}
                <button className="btn-primary flex-1" onClick={next}>Próxima</button>
              </div>
            </div>
          )}
          <ErrorSheet open={errOpen} onClose={() => setErrOpen(false)} defaultTopic={q.topicId} defaultSubject={q.subject} questionId={q.id} />
        </div>
      )}
    </Page>
  );
}
