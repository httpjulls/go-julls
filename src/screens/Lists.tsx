import { useEffect, useMemo, useState } from 'react';
import { Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { repo } from '../db/repo';
import type { ErrorReason, Letter, MockExam, Question } from '../db/types';
import { useApp, useSnapshot } from '../app/AppContext';
import { gradeMock, isCorrect, type SlotMark } from '../app/grading';
import { syncAttachments } from '../app/attachments';
import { SUBJECT_NAMES, SUBJECT_SHORT, fmt, type SubjectId } from '../core/exam';
import { dayKey, formatDay } from '../core/dates';
import { buildListDoc, figureIds, needsFigure, topicIntroMd } from '../pdf/generators';
import { printHtml } from '../pdf/print';
import type { Tema } from '../pdf/template';
import { Card, Empty, Icon, Page, Section, Segmented, Stepper, cx } from '../ui/kit';
import { REASONS } from './Errors';

const LETTERS: Letter[] = ['A', 'B', 'C', 'D'];

export default function Lists() {
  return (
    <Routes>
      <Route index element={<Home />} />
      <Route path="nova" element={<NewList />} />
      <Route path=":id" element={<Grade />} />
    </Routes>
  );
}

function useList(id?: string) {
  return useLiveQuery(async () => {
    if (!id) return undefined;
    const mock = await db.mock_exams.get(id);
    if (!mock) return null;
    const ids = mock.slots.map((s) => s.questionId).filter(Boolean) as string[];
    const qs = new Map((await db.questions.bulkGet(ids)).filter(Boolean).map((q) => [q!.id, q!]));
    return { mock, qs };
  }, [id]);
}

async function loadImages(qs: Question[]): Promise<Map<string, string>> {
  const ids = [...new Set(qs.filter(needsFigure).flatMap(figureIds))];
  if (!ids.length) return new Map();
  await syncAttachments(ids);
  return new Map((await db.attachments.bulkGet(ids)).filter(Boolean).map((a) => [a!.id, a!.dataUrl]));
}

/** Gera o PDF de uma lista/prova já salva. */
export async function printList(mock: MockExam, qs: Map<string, Question>, tema: Tema, introMd?: string) {
  const ordered = mock.slots.map((s) => (s.questionId ? qs.get(s.questionId) : undefined)).filter(Boolean) as Question[];
  const subjects = [...new Set(ordered.map((q) => q.subject))];
  const html = buildListDoc({
    titulo: mock.title ?? 'Lista de exercícios',
    subtitulo: `${ordered.length} questões${mock.examId ? ' · na ordem do caderno' : ''} · gabarito no fim`,
    subject: subjects.length === 1 ? subjects[0] : undefined,
    questions: ordered,
    images: await loadImages(ordered),
    introMd,
    answerCard: true,
    tema,
    tempo: mock.durationMin ? `${Math.round(mock.durationMin / 60)}h` : undefined,
  });
  const name = `go-julls-${(mock.title ?? 'lista').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return printHtml(html, name);
}

function Home() {
  const nav = useNavigate();
  const lists = (useLiveQuery(() => db.mock_exams.orderBy('day').reverse().toArray(), []) ?? []).filter((m) => !m.deleted && m.kind === 'lista');
  return (
    <Page title="Listas e PDFs" actions={<button className="btn-primary" onClick={() => nav('/listas/nova')}><Icon name="plus" /> Nova</button>}>
      <Card className="mb-5 text-sm space-y-1">
        <p>Gere PDFs no estilo Go, Julls! com questões do seu banco (por matéria, tópico, prova importada ou só as que você errou) e o pacote de estudo de um tópico.</p>
        <p className="text-muted">
          Depois de resolver no papel, toque em <strong>Corrigir</strong> e diga o que acertou e errou <strong>pelo número</strong>: o app registra as tentativas e manda as erradas para o banco de erros.
        </p>
      </Card>
      <Section title="Suas listas">
        {lists.length === 0 && <Empty>Nenhuma lista ainda.</Empty>}
        <ul className="space-y-2">
          {lists.map((m) => {
            const total = m.slots.filter((s) => s.questionId).length;
            const ok = m.result?.bySubject.reduce((s, x) => s + x.correct, 0) ?? 0;
            const done = m.result?.bySubject.reduce((s, x) => s + x.total, 0) ?? 0;
            return (
              <li key={m.id}>
                <button className="card !p-3 w-full text-left flex items-center gap-3" onClick={() => nav(`/listas/${m.id}`)}>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{m.title}</p>
                    <p className="text-xs text-muted">
                      {formatDay(m.day)} · {total} questões · {m.finishedAt ? `corrigida: ${ok}/${done} certas` : 'aguardando correção'}
                    </p>
                  </div>
                  {m.finishedAt ? <Icon name="check" className="text-pinks" label="Corrigida" /> : <span className="chip text-xs">Corrigir</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </Section>
    </Page>
  );
}

function NewList() {
  const { toast, settings } = useApp();
  const snap = useSnapshot();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const topicId = params.get('topic');
  const examId = params.get('exam');
  const pacote = params.get('pacote') === '1';
  const provaInteira = params.get('prova') === '1';
  const [subject, setSubject] = useState<SubjectId | 'all'>((params.get('subject') as SubjectId) ?? 'all');
  const [modo, setModo] = useState<'prioridade' | 'erradas' | 'aleatorio'>(params.get('modo') === 'erradas' ? 'erradas' : 'prioridade');
  const [qtd, setQtd] = useState(provaInteira ? 45 : 10);
  const [tema, setTema] = useState<Tema>('claro');
  const [busy, setBusy] = useState(false);

  const data = useLiveQuery(async () => {
    const [qs, atts, topics, notes] = await Promise.all([db.questions.toArray(), db.question_attempts.toArray(), db.topics.toArray(), db.notes.toArray()]);
    return { qs: qs.filter((q) => !q.deleted), atts: atts.filter((a) => !a.deleted), topics, notes: notes.filter((n) => !n.deleted) };
  }, []);

  const topic = data?.topics.find((t) => t.id === topicId);
  const lang = settings?.foreignLanguage;
  const pool = useMemo(() => {
    if (!data) return [];
    return data.qs
      .filter((q) => q.subject !== 'lem' || !q.language || q.language === lang)
      .filter((q) => (!topicId || q.topicId === topicId) && (!examId || q.examId === examId) && (subject === 'all' || q.subject === subject));
  }, [data, topicId, examId, subject, lang]);

  const last = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const a of [...(data?.atts ?? [])].sort((x, y) => x.at.localeCompare(y.at))) m.set(a.questionId, a.correct);
    return m;
  }, [data]);

  const pick = (): Question[] => {
    if (provaInteira) return [...pool].sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
    let list = [...pool];
    if (modo === 'erradas') list = list.filter((q) => last.get(q.id) === false);
    const rnd = new Map(list.map((q) => [q.id, Math.random()]));
    // prioridade: erradas > nunca feitas > acertadas; dentro de cada grupo, aleatório
    const rank = (q: Question) => (modo === 'aleatorio' ? 0 : last.get(q.id) === false ? 0 : last.has(q.id) ? 2 : 1);
    list.sort((a, b) => rank(a) - rank(b) || rnd.get(a.id)! - rnd.get(b.id)!);
    return list.slice(0, qtd);
  };

  const titleAuto = provaInteira
    ? `${pool[0]?.examName ?? 'Prova'} (para fazer no papel)`
    : topic
      ? `${pacote ? 'Estudo' : 'Lista'}: ${topic.name}`
      : `${modo === 'erradas' ? 'Refazer erradas' : 'Lista'}${subject !== 'all' ? ` de ${SUBJECT_SHORT[subject]}` : ''}${examId ? ` · ${pool[0]?.examName ?? ''}` : ''}`;
  const [title, setTitle] = useState('');

  const generate = async () => {
    const qs = pick();
    if (!qs.length && !pacote) return;
    setBusy(true);
    const m = await repo.put<MockExam>('mock_exams', {
      kind: 'lista',
      title: title.trim() || titleAuto,
      examId: provaInteira ? examId ?? undefined : undefined,
      durationMin: provaInteira ? 180 : undefined,
      day: dayKey(),
      startedAt: new Date().toISOString(),
      finishedAt: null,
      noCalc: true,
      slots: qs.map((q) => ({ subject: q.subject, questionId: q.id })),
      answers: qs.map(() => null),
      essayId: null,
      essayScore: null,
      result: null,
    });
    let intro: string | undefined;
    if (pacote && topic && data) {
      const formula = data.notes.find((n) => n.kind === 'formula' && n.topicId === topic.id);
      const notes = data.notes.filter((n) => n.kind === 'note' && n.topicId === topic.id);
      intro = topicIntroMd(topic, snap?.states.get(topic.id)?.mastery ?? 0, formula, notes);
    }
    const how = await printList(m, new Map(qs.map((q) => [q.id, q])), tema, intro);
    setBusy(false);
    toast(how === 'html' ? 'Salvei o HTML em Documentos/GoJulls: abra e imprima como PDF.' : 'Escolha "Salvar como PDF" na impressão.');
    nav(`/listas/${m.id}`);
  };

  if (!data) return <Page title="Nova lista"><p className="text-muted">Carregando…</p></Page>;
  const availErradas = pool.filter((q) => last.get(q.id) === false).length;

  return (
    <Page title={pacote ? 'PDF de estudo do tópico' : provaInteira ? 'Prova em PDF' : 'Nova lista em PDF'} back={() => nav(-1)}>
      <Card className="space-y-4 max-w-2xl">
        {topic && (
          <p className="text-sm">
            Tópico: <strong className="text-accent">{topic.name}</strong> ({SUBJECT_NAMES[topic.subject]})
          </p>
        )}
        {pacote && <p className="text-sm text-muted">Inclui: por que o tópico importa, seu formulário, suas anotações do tópico e exercícios do banco com gabarito.</p>}
        <div>
          <label className="label" htmlFor="tit">Título</label>
          <input id="tit" className="input" placeholder={titleAuto} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        {!topicId && !provaInteira && (
          <div>
            <span className="label">Matéria</span>
            <div className="flex flex-wrap gap-2">
              <button className={subject === 'all' ? 'chip-on' : 'chip'} onClick={() => setSubject('all')}>Todas</button>
              {(['mat', 'fis', 'por', 'bio', 'qui', 'geo', 'his', 'lem'] as SubjectId[]).map((s) => (
                <button key={s} className={subject === s ? 'chip-on' : 'chip'} onClick={() => setSubject(s)}>
                  {SUBJECT_SHORT[s]}
                </button>
              ))}
            </div>
          </div>
        )}
        {!provaInteira && (
          <>
            <div>
              <span className="label">Quais questões</span>
              <Segmented
                label="Seleção"
                value={modo}
                onChange={setModo}
                options={[
                  { value: 'prioridade', label: 'Erradas e novas primeiro' },
                  { value: 'erradas', label: `Só erradas (${availErradas})` },
                  { value: 'aleatorio', label: 'Aleatório' },
                ]}
              />
            </div>
            <div className="flex items-center justify-between">
              <span>Quantidade</span>
              <Stepper label="quantidade" value={qtd} min={1} max={60} onChange={setQtd} />
            </div>
          </>
        )}
        <div>
          <span className="label">Visual</span>
          <Segmented label="Tema" value={tema} onChange={setTema} options={[{ value: 'claro', label: 'Claro (imprimir)' }, { value: 'escuro', label: 'Escuro (tablet)' }]} />
        </div>
        <p className="text-sm text-muted">
          {pool.length} questões disponíveis com esse filtro. A lista sai com cartão-resposta e gabarito no fim; figuras das provas importadas entram como imagem da página.
        </p>
        <button className="btn-primary w-full" disabled={busy || (!pool.length && !pacote)} onClick={() => void generate()}>
          <Icon name="download" /> {busy ? 'Gerando…' : 'Gerar PDF'}
        </button>
        {!pool.length && !pacote && (
          <p className="text-sm text-warn">Nenhuma questão com esse filtro. Importe uma prova ou cadastre questões no Banco de questões.</p>
        )}
      </Card>
    </Page>
  );
}

/** Correção pelo número: letra marcada (confere com o gabarito) ou só certo/errado. */
function Grade() {
  const { id } = useParams();
  const nav = useNavigate();
  const { toast } = useApp();
  const data = useList(id);
  const [mode, setMode] = useState<'letras' | 'certo'>('certo');
  const [marks, setMarks] = useState<(SlotMark | undefined)[]>([]);
  const [quick, setQuick] = useState('');
  const [saving, setSaving] = useState(false);
  const [tema, setTema] = useState<Tema>('claro');

  useEffect(() => {
    if (data?.mock) setMarks(data.mock.slots.map(() => undefined));
  }, [data?.mock?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (data === undefined) return <Page title="Corrigir"><p className="text-muted">Carregando…</p></Page>;
  if (data === null) return <Page title="Corrigir" back={() => nav('/listas')}><Empty>Lista não encontrada.</Empty></Page>;
  const { mock, qs } = data;
  const slots = mock.slots.map((s, i) => ({ i, q: s.questionId ? qs.get(s.questionId) : undefined })).filter((x) => x.q) as { i: number; q: Question }[];

  const setMark = (i: number, m: SlotMark | undefined) => setMarks((prev) => prev.map((x, j) => (j === i ? m : x)));

  /** "3, 7, 12-14" → essas erradas, o resto certo. */
  const applyQuick = () => {
    const wrong = new Set<number>();
    for (const part of quick.split(/[,;\s]+/).filter(Boolean)) {
      const r = part.match(/^(\d+)\s*-\s*(\d+)$/);
      if (r) for (let k = Number(r[1]); k <= Number(r[2]); k++) wrong.add(k);
      else if (/^\d+$/.test(part)) wrong.add(Number(part));
    }
    setMarks(mock.slots.map((s, i) => (s.questionId ? { correct: !wrong.has(i + 1) } : undefined)));
    setMode('certo');
  };

  const answered = slots.filter(({ i, q }) => isCorrect(q, marks[i]) !== null).length;
  const wrongCount = slots.filter(({ i, q }) => isCorrect(q, marks[i]) === false).length;

  const save = async () => {
    setSaving(true);
    const { wrong } = await gradeMock(mock, qs, marks);
    setSaving(false);
    toast(`Correção salva. ${wrong} ${wrong === 1 ? 'errada foi' : 'erradas foram'} para o banco de erros.`);
  };

  const result = mock.result;
  return (
    <Page
      title={mock.title ?? 'Lista'}
      back={() => nav('/listas')}
      actions={
        <button className="btn-ghost" onClick={() => void printList(mock, qs, tema).then((h) => toast(h === 'html' ? 'HTML salvo em Documentos/GoJulls.' : 'Escolha "Salvar como PDF".'))}>
          <Icon name="download" /> PDF
        </button>
      }
    >
      <div className="mb-4 max-w-sm">
        <Segmented label="Tema do PDF" value={tema} onChange={setTema} options={[{ value: 'claro', label: 'PDF claro' }, { value: 'escuro', label: 'PDF escuro' }]} />
      </div>

      {mock.finishedAt && result ? (
        <Card className="space-y-3">
          <p className="font-semibold flex items-center gap-2">
            <Icon name="check" className="text-pinks" /> Corrigida em {formatDay(mock.finishedAt.slice(0, 10))}
          </p>
          <div className="grid grid-cols-2 tab:grid-cols-4 gap-2 text-sm">
            {result.bySubject.map((s) => (
              <span key={s.subject} className="chip justify-between">
                {SUBJECT_SHORT[s.subject as SubjectId]} <strong>{s.correct}/{s.total}</strong>
              </span>
            ))}
          </div>
          {mock.examId && result.bySubject.reduce((a, s) => a + s.total, 0) >= 40 && (
            <p className="text-sm">
              Nota das objetivas (N1): <strong className="text-accent">{fmt(result.n1)}/63</strong>
            </p>
          )}
          <p className="text-sm text-muted">As erradas estão no Banco de erros com o número da questão. Para treinar de novo: Questões → Refazer erradas.</p>
          <button className="btn-ghost" onClick={() => nav('/erros')}>
            <Icon name="bug" /> Ver banco de erros
          </button>
        </Card>
      ) : (
        <>
          <Card className="mb-4 space-y-3">
            <p className="font-semibold">Jeito rápido: diga só as que você errou</p>
            <div className="flex gap-2">
              <input className="input" inputMode="numeric" placeholder="Ex.: 3, 7, 12-14" value={quick} onChange={(e) => setQuick(e.target.value)} aria-label="Números das questões erradas" />
              <button className="btn-primary" onClick={applyQuick}>Aplicar</button>
            </div>
            <p className="text-xs text-muted">As outras ficam como certas. Depois você ajusta qualquer número abaixo.</p>
          </Card>
          <Segmented
            label="Modo"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'certo', label: 'Certo / errado' },
              { value: 'letras', label: 'Marcar a letra (confere o gabarito)' },
            ]}
          />
          <div className="grid tab:grid-cols-2 gap-2 mt-4">
            {slots.map(({ i, q }) => {
              const ok = isCorrect(q, marks[i]);
              return (
                <Card key={i} className={cx('!p-3', ok === false && 'border-warn/70', ok === true && 'border-pinks/70')}>
                  <div className="flex items-center gap-2">
                    <span className="font-black w-8 text-accent">{i + 1}</span>
                    <span className="text-xs text-muted flex-1 truncate">
                      {SUBJECT_SHORT[q.subject]}
                      {q.examName ? ` · nº ${q.number}` : ''}
                    </span>
                    {mode === 'certo' ? (
                      <>
                        <button className={cx('w-12 !min-h-[44px]', ok === true ? 'btn-primary' : 'btn-ghost')} aria-pressed={ok === true} aria-label={`Questão ${i + 1} certa`} onClick={() => setMark(i, ok === true ? undefined : { correct: true })}>
                          <Icon name="check" size={18} />
                        </button>
                        <button className={cx('w-12 !min-h-[44px]', ok === false ? 'btn-primary !bg-warn' : 'btn-ghost')} aria-pressed={ok === false} aria-label={`Questão ${i + 1} errada`} onClick={() => setMark(i, ok === false ? undefined : { correct: false, reason: marks[i]?.reason })}>
                          <Icon name="x" size={18} />
                        </button>
                      </>
                    ) : (
                      LETTERS.map((L) => (
                        <button
                          key={L}
                          className={cx('w-10 !min-h-[44px] px-0', marks[i]?.chosen === L ? 'btn-primary' : 'btn-ghost')}
                          aria-pressed={marks[i]?.chosen === L}
                          aria-label={`Questão ${i + 1}: marquei ${L}`}
                          onClick={() => setMark(i, marks[i]?.chosen === L ? undefined : { chosen: L, reason: marks[i]?.reason })}
                        >
                          {L}
                        </button>
                      ))
                    )}
                  </div>
                  {ok === false && (
                    <div className="flex flex-wrap gap-1.5 mt-2" role="radiogroup" aria-label={`Motivo do erro na questão ${i + 1}`}>
                      {REASONS.map((r) => (
                        <button
                          key={r.value}
                          role="radio"
                          aria-checked={(marks[i]?.reason ?? 'conceito') === r.value}
                          className={(marks[i]?.reason ?? 'conceito') === r.value ? 'chip-on text-xs' : 'chip text-xs'}
                          onClick={() => setMark(i, { ...marks[i], reason: r.value as ErrorReason })}
                        >
                          {r.label}
                        </button>
                      ))}
                      {mode === 'letras' && <span className="text-xs text-muted self-center">gabarito: {q.answer}</span>}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
          <Card className="mt-4 sticky bottom-20 tab:bottom-4 flex items-center gap-3">
            <p className="flex-1 text-sm">
              {answered}/{slots.length} corrigidas · <strong className="text-warn">{wrongCount} erradas</strong>
            </p>
            <button className="btn-text text-sm" onClick={() => setMarks(mock.slots.map(() => undefined))}>
              Limpar
            </button>
            <button className="btn-primary" disabled={!answered || saving} onClick={() => void save()}>
              <Icon name="check" /> {saving ? 'Salvando…' : 'Salvar correção'}
            </button>
          </Card>
        </>
      )}
    </Page>
  );
}
