import { useEffect, useMemo, useState } from 'react';
import { Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { repo, nowIso } from '../db/repo';
import type { Letter, MockExam, Question, QuestionAttempt } from '../db/types';
import { useApp } from '../app/AppContext';
import { completeStudy } from '../app/actions';
import { EXAM, EXAM_ORDER, SUBJECT_SHORT, fmt, scoreExam, type ObjectiveResult, type SubjectId } from '../core/exam';
import { dayKey, formatDay } from '../core/dates';
import { Card, Disclaimer, Empty, Icon, Markdown, Page, Section, Toggle, cx } from '../ui/kit';
import { keepAwake } from '../native/native';

const LETTERS: Letter[] = ['A', 'B', 'C', 'D'];

export default function Mock() {
  return (
    <Routes>
      <Route index element={<List />} />
      <Route path=":id" element={<Run />} />
    </Routes>
  );
}

function List() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const mocks = (useLiveQuery(() => db.mock_exams.orderBy('day').reverse().toArray(), []) ?? []).filter((m) => !m.deleted);
  const questions = (useLiveQuery(() => db.questions.toArray(), []) ?? []).filter((q) => !q.deleted);
  const [noCalc, setNoCalc] = useState(true);

  const avail = EXAM_ORDER.map(({ subject, count }) => ({ subject, count, have: questions.filter((q) => q.subject === subject).length }));
  const totalHave = avail.reduce((s, a) => s + Math.min(a.have, a.count), 0);
  const running = mocks.find((m) => !m.finishedAt);

  const start = async () => {
    const used = new Set<string>();
    const attempted = new Set((await db.question_attempts.toArray()).map((a) => a.questionId));
    const slots: MockExam['slots'] = [];
    for (const { subject, count } of EXAM_ORDER) {
      const pool = shuffle(questions.filter((q) => q.subject === subject)).sort((a, b) => Number(attempted.has(a.id)) - Number(attempted.has(b.id)));
      for (let i = 0; i < count; i++) {
        const q = pool.find((x) => !used.has(x.id));
        if (q) used.add(q.id);
        slots.push({ subject, questionId: q?.id ?? null });
      }
    }
    const m = await repo.put<MockExam>('mock_exams', {
      day: dayKey(),
      startedAt: new Date().toISOString(),
      finishedAt: null,
      noCalc,
      slots,
      answers: slots.map(() => null),
      essayId: null,
      essayScore: null,
      result: null,
    });
    nav(`/simulado/${m.id}${params.get('plan') ? `?plan=${params.get('plan')}` : ''}`);
  };

  return (
    <Page title="Simulado">
      {running && (
        <Card className="mb-4 border-pink">
          <p className="font-semibold">Simulado em andamento ({formatDay(running.day)})</p>
          <button className="btn-primary mt-3" onClick={() => nav(`/simulado/${running.id}`)}>Continuar</button>
        </Card>
      )}
      <Card className="mb-5 space-y-3">
        <p className="font-semibold">Formato da prova</p>
        <p className="text-sm text-muted">
          3 horas · 45 questões (Português 1–6, Biologia 7–12, Física 13–18, Geografia 19–24, História 25–30, Matemática 31–36, Química 37–42, Língua estrangeira 43–45) + redação. Matemática e Física valem 2,5 por
          questão.
        </p>
        <div className="grid grid-cols-2 tab:grid-cols-4 gap-2 text-sm">
          {avail.map((a) => (
            <span key={a.subject} className={cx('chip justify-between', a.have < a.count && 'text-warn')}>
              {SUBJECT_SHORT[a.subject]} <strong>{Math.min(a.have, a.count)}/{a.count}</strong>
            </span>
          ))}
        </div>
        {totalHave < 45 && (
          <p className="text-sm text-warn flex gap-2">
            <Icon name="alert" size={16} className="shrink-0 mt-0.5" /> Seu banco tem {totalHave} das 45 questões. O simulado usa só as suas questões; posições sem questão ficam de fora da nota (simulado parcial).
          </p>
        )}
        <Toggle label="Modo sem calculadora e sem consulta" checked={noCalc} onChange={setNoCalc} />
        <button className="btn-primary w-full" disabled={totalHave === 0} onClick={() => void start()}>
          <Icon name="play" /> Começar simulado (3h)
        </button>
      </Card>

      <Section title="Histórico">
        {mocks.filter((m) => m.finishedAt).length === 0 && <Empty>Nenhum simulado concluído ainda.</Empty>}
        <ul className="space-y-2">
          {mocks
            .filter((m) => m.finishedAt && m.result)
            .map((m) => (
              <li key={m.id}>
                <button className="card !p-3 w-full text-left flex items-center gap-3" onClick={() => nav(`/simulado/${m.id}`)}>
                  <div className="flex-1">
                    <p className="font-semibold">{formatDay(m.day, { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                    <p className="text-xs text-muted">
                      N1 {fmt(m.result!.n1)} · N2 {m.result!.n2 ?? '—'} {m.result!.eliminated && '· eliminatória'}
                    </p>
                  </div>
                  <span className="text-2xl font-black text-accent">{fmt(m.result!.nf, 2)}</span>
                </button>
              </li>
            ))}
        </ul>
      </Section>
    </Page>
  );
}

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function Run() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { toast } = useApp();
  const mock = useLiveQuery(() => db.mock_exams.get(id!), [id]);
  const qs = useLiveQuery(async () => {
    if (!mock) return new Map<string, Question>();
    const ids = mock.slots.map((s) => s.questionId).filter(Boolean) as string[];
    return new Map((await db.questions.bulkGet(ids)).filter(Boolean).map((q) => [q!.id, q!]));
  }, [mock?.id]);
  const essay = useLiveQuery(() => (mock?.essayId ? db.essays.get(mock.essayId) : undefined), [mock?.essayId]);
  const [cur, setCur] = useState(0);
  const [now, setNow] = useState(Date.now());

  const running = mock && !mock.finishedAt;
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    void keepAwake(true);
    return () => {
      clearInterval(t);
      void keepAwake(false);
    };
  }, [running]);

  // A redação feita durante o simulado entra na nota.
  useEffect(() => {
    if (mock && essay && essay.scores && mock.essayScore === null) {
      void repo.update<MockExam>('mock_exams', mock.id, { essayScore: essay.scores.formais + essay.scores.textuais + essay.scores.discursivos });
    }
  }, [mock, essay]);

  const leftMs = mock ? Date.parse(mock.startedAt) + EXAM.durationMin * 60000 - now : 0;

  const finish = async () => {
    if (!mock || !qs) return;
    const results: ObjectiveResult[] = [];
    const attempts: Omit<QuestionAttempt, 'id' | 'updated_at' | 'device_id'>[] = [];
    for (const { subject } of EXAM_ORDER) {
      let correct = 0;
      let total = 0;
      mock.slots.forEach((s, i) => {
        if (s.subject !== subject || !s.questionId) return;
        const q = qs.get(s.questionId);
        if (!q) return;
        total++;
        const ans = mock.answers[i];
        if (ans === q.answer) correct++;
        attempts.push({ questionId: q.id, subject: q.subject, topicId: q.topicId, chosen: ans, correct: ans === q.answer, seconds: 0, day: dayKey(), at: nowIso(), mockId: mock.id });
      });
      if (total) results.push({ subject, correct, total });
    }
    const r = scoreExam(results, mock.essayScore);
    const partial = results.reduce((s, x) => s + x.total, 0) < 45;
    const reasons = partial ? [...r.reasons, 'Simulado parcial: só as posições com questão do seu banco entraram na nota.'] : r.reasons;
    if (r.eliminated && results.some((x) => x.correct === 0 && x.total < 6)) reasons.push('Com menos de 6 questões numa disciplina, o “zero” pode não refletir a prova real.');
    for (const a of attempts) await repo.append<QuestionAttempt>('question_attempts', a);
    await repo.update<MockExam>('mock_exams', mock.id, { finishedAt: new Date().toISOString(), result: { n1: r.n1, n2: r.n2, nf: r.nf, eliminated: r.eliminated, reasons, bySubject: r.bySubject } });
    const minutes = Math.round((Date.now() - Date.parse(mock.startedAt)) / 60000);
    await completeStudy({ topicId: null, subject: 'mat', minutes: Math.min(minutes, 240), kind: 'mock', planItemId: params.get('plan') ?? undefined });
    toast('Simulado concluído. Orgulho!');
  };

  // Tempo esgotado: encerra automaticamente
  useEffect(() => {
    if (running && leftMs <= 0) void finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, leftMs <= 0]);

  if (!mock || !qs) return <Page title="Simulado"><p className="text-muted">Carregando…</p></Page>;
  if (mock.finishedAt && mock.result) return <Result mock={mock} qs={qs} />;

  const slot = mock.slots[cur];
  const q = slot.questionId ? qs.get(slot.questionId) : undefined;
  const answered = mock.answers.filter(Boolean).length;
  const available = mock.slots.filter((s) => s.questionId).length;
  const setAnswer = (L: Letter) => {
    const answers = [...mock.answers];
    answers[cur] = answers[cur] === L ? null : L;
    void repo.update<MockExam>('mock_exams', mock.id, { answers });
  };
  const clock = (ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-bg overflow-y-auto safe-top safe-bottom">
      <div className="max-w-5xl mx-auto px-4 pb-10">
        <header className="sticky top-0 bg-bg z-10 py-3 flex items-center gap-2 border-b border-line">
          <button className="btn-text" onClick={() => nav('/simulado')} aria-label="Sair (o simulado continua)">
            <Icon name="back" />
          </button>
          <span className={cx('chip font-bold tabular-nums', leftMs < 30 * 60000 && 'text-warn')}>
            <Icon name="timer" size={14} /> {clock(leftMs)}
          </span>
          <span className="chip">{answered}/{available} marcadas</span>
          {mock.noCalc && <span className="chip text-xs hidden tab:inline-flex">sem calculadora · sem consulta</span>}
          <span className="flex-1" />
          <button className="btn-primary" onClick={() => confirm('Entregar o simulado agora?') && void finish()}>Entregar</button>
        </header>

        <div className="tab:grid tab:grid-cols-[1fr_300px] tab:gap-6 mt-4">
          <div>
            <p className="text-sm text-muted mb-2">
              Questão {cur + 1} · {SUBJECT_SHORT[slot.subject]} {slot.subject === 'mat' || slot.subject === 'fis' ? '· vale 2,5' : '· vale 1,0'}
            </p>
            {q ? (
              <>
                <Card>
                  <Markdown text={q.statement} />
                </Card>
                <div className="space-y-2 mt-3">
                  {LETTERS.map((L) => (
                    <button
                      key={L}
                      onClick={() => setAnswer(L)}
                      aria-pressed={mock.answers[cur] === L}
                      className={cx('card !p-3 w-full text-left flex gap-3 min-h-[52px]', mock.answers[cur] === L && 'ring-2 ring-pink bg-elevated')}
                    >
                      <span className={cx('font-black w-7 h-7 rounded-full grid place-items-center shrink-0', mock.answers[cur] === L ? 'bg-pink text-onpink' : 'border border-line')}>{L}</span>
                      <span>{q.options[L]}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <Card>
                <Empty>Sem questão de {SUBJECT_SHORT[slot.subject]} no seu banco para esta posição.</Empty>
              </Card>
            )}
            <div className="flex gap-2 mt-4">
              <button className="btn-ghost flex-1" disabled={cur === 0} onClick={() => setCur(cur - 1)}>Anterior</button>
              <button className="btn-ghost flex-1" disabled={cur === 44} onClick={() => setCur(cur + 1)}>Próxima</button>
            </div>
          </div>
          <aside className="mt-6 tab:mt-0">
            <p className="label">Cartão de respostas</p>
            <div className="grid grid-cols-9 gap-1">
              {mock.slots.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setCur(i)}
                  className={cx(
                    'aspect-square rounded-md text-xs font-bold border',
                    i === cur ? 'ring-2 ring-pink' : '',
                    mock.answers[i] ? 'bg-pink text-onpink border-pink' : s.questionId ? 'bg-elevated border-line' : 'bg-transparent border-dashed border-line text-muted',
                  )}
                  aria-label={`Questão ${i + 1}${mock.answers[i] ? `, marcada ${mock.answers[i]}` : ''}`}
                >
                  {mock.answers[i] ?? i + 1}
                </button>
              ))}
            </div>
            <Card className="mt-4">
              <p className="font-semibold">Redação</p>
              {essay ? (
                <p className="text-sm text-muted">
                  {essay.lines} linhas · autoavaliação {essay.scores ? essay.scores.formais + essay.scores.textuais + essay.scores.discursivos : '—'}
                </p>
              ) : (
                <p className="text-sm text-muted">Escreva dentro do tempo do simulado (20 a 25 linhas).</p>
              )}
              <button className="btn-ghost w-full mt-2" onClick={() => nav(`/redacao/${essay ? essay.id : `nova?mock=${mock.id}&min=${Math.max(10, Math.floor(leftMs / 60000))}`}`)}>
                <Icon name="pen" /> {essay ? 'Ver redação' : 'Escrever redação'}
              </button>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Result({ mock, qs }: { mock: MockExam; qs: Map<string, Question> }) {
  const nav = useNavigate();
  const topics = useLiveQuery(() => db.topics.toArray(), []) ?? [];
  const r = mock.result!;
  const wrongByTopic = useMemo(() => {
    const m = new Map<string, number>();
    mock.slots.forEach((s, i) => {
      const q = s.questionId ? qs.get(s.questionId) : undefined;
      if (q && mock.answers[i] !== q.answer && q.topicId) m.set(q.topicId, (m.get(q.topicId) ?? 0) + 1);
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [mock, qs]);

  return (
    <Page title="Resultado do simulado" back={() => nav('/simulado')}>
      <Card className="mb-4">
        <div className="grid grid-cols-3 text-center">
          <div>
            <p className="text-3xl font-black">{fmt(r.n1)}</p>
            <p className="text-xs text-muted">N1 / 63</p>
          </div>
          <div>
            <p className="text-3xl font-black">{r.n2 ?? '—'}</p>
            <p className="text-xs text-muted">N2 / 100</p>
          </div>
          <div>
            <p className="text-3xl font-black text-accent">{fmt(r.nf, 2)}</p>
            <p className="text-xs text-muted">NF = N1 + N2 × 0,37</p>
          </div>
        </div>
        {r.reasons.map((x) => (
          <p key={x} className="text-sm text-warn mt-3 flex gap-2">
            <Icon name="alert" size={16} className="shrink-0 mt-0.5" /> {x}
          </p>
        ))}
        <div className="mt-3">
          <Disclaimer />
        </div>
      </Card>
      <div className="tab:grid tab:grid-cols-2 tab:gap-6">
        <Section title="Por disciplina">
          <Card className="space-y-2 text-sm">
            {r.bySubject.map((s) => (
              <div key={s.subject} className="flex justify-between">
                <span>{SUBJECT_SHORT[s.subject as SubjectId]}</span>
                <span className="tabular-nums">
                  {s.correct}/{s.total} · {fmt(s.points)} pts
                </span>
              </div>
            ))}
          </Card>
        </Section>
        <Section title="Tópicos com erros">
          <Card className="space-y-1 text-sm">
            {wrongByTopic.length === 0 && <p className="text-muted">Nenhum erro com tópico definido.</p>}
            {wrongByTopic.map(([id, n]) => (
              <div key={id} className="flex justify-between gap-2">
                <span className="truncate">{topics.find((t) => t.id === id)?.name ?? id}</span>
                <span>{n}</span>
              </div>
            ))}
          </Card>
        </Section>
      </div>
      <Section title="Gabarito">
        <div className="grid grid-cols-5 tab:grid-cols-9 gap-1">
          {mock.slots.map((s, i) => {
            const q = s.questionId ? qs.get(s.questionId) : undefined;
            const ok = q && mock.answers[i] === q.answer;
            return (
              <div key={i} className={cx('rounded-md border text-center py-1 text-xs', !q ? 'border-dashed border-line text-muted' : ok ? 'border-pinks' : 'border-warn')}>
                <p className="font-bold">{i + 1}</p>
                <p>{q ? `${mock.answers[i] ?? '–'}/${q.answer}` : '—'}</p>
                <p aria-hidden>{q ? (ok ? '✓' : '✗') : ''}</p>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted mt-2">Formato: sua marcação / gabarito. As questões erradas entram em “Refazer erradas”.</p>
      </Section>
    </Page>
  );
}
