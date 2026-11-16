import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { PlanItem } from '../db/types';
import { useApp, useSnapshot } from '../app/AppContext';
import { cheer, completeStudy, generatePlan } from '../app/actions';
import { buildPlan, lastEssayDay, projectionInputs, streak } from '../db/state';
import { assessRisks, projectScore, weightedMastery } from '../core/projection';
import { diffDays, formatDay, formatMinutes } from '../core/dates';
import { SUBJECT_SHORT } from '../core/exam';
import { replay } from '../core/sm2';
import { Card, Icon, MasteryPicker, Page, Section, Sheet, Stepper, cx } from '../ui/kit';
import { buzz, scheduleReminders } from '../native/native';
import { checkForUpdate, type LatestInfo } from '../native/update';

const KIND_LABEL: Record<string, string> = { study: 'conteúdo novo', review: 'revisão', essay: 'redação', mock: 'simulado', light: 'revisão leve' };

export default function Today() {
  const { settings, today, toast } = useApp();
  const snap = useSnapshot();
  const nav = useNavigate();
  const items = useLiveQuery(() => db.plan_items.where('day').equals(today).toArray(), [today]);
  const sessionsToday = useLiveQuery(() => db.study_sessions.where('day').equals(today).toArray(), [today]) ?? [];
  const dueCards = useLiveQuery(async () => {
    const [cards, reviews] = await Promise.all([db.flashcards.toArray(), db.flashcard_reviews.toArray()]);
    return cards.filter((c) => !c.deleted).filter((c) => replay(c.created, reviews.filter((r) => r.cardId === c.id)).due <= today).length;
  }, [today]);
  const [closing, setClosing] = useState<PlanItem | null>(null);
  const [update, setUpdate] = useState<LatestInfo | null>(null);
  const generating = useRef(false);

  useEffect(() => {
    void checkForUpdate().then(setUpdate);
  }, []);

  // Gera o plano do dia uma vez (fica estável durante o dia).
  useEffect(() => {
    if (!snap || items === undefined || generating.current) return;
    if (items.filter((i) => !i.deleted).length === 0) {
      generating.current = true;
      void generatePlan(snap).finally(() => (generating.current = false));
    }
  }, [snap, items]);

  const plan = useMemo(() => (snap ? buildPlan(snap, today) : null), [snap, today]);
  const blocks = useMemo(() => {
    const doneByItem = new Set(sessionsToday.filter((s) => !s.deleted && s.planItemId).map((s) => s.planItemId));
    return (items ?? []).filter((i) => !i.deleted).sort((a, b) => a.index - b.index).map((i) => ({ ...i, done: i.done || doneByItem.has(i.id) }));
  }, [items, sessionsToday]);

  // Lembretes com o bloco do dia
  useEffect(() => {
    if (!settings) return;
    const next = blocks.find((b) => !b.done);
    const text = next ? `Hoje: ${next.title}. ${next.minutes} minutos. Go, Julls!` : 'Plano de hoje concluído. Orgulho!';
    void scheduleReminders(settings.reminderTimes, text, settings.remindersOn, settings.examDate);
  }, [blocks, settings]);

  const risks = useMemo(() => {
    if (!snap) return [];
    const pi = projectionInputs(snap);
    const projection = projectScore(pi.topics, pi.attempts, pi.essay);
    const le = lastEssayDay(snap.essays);
    return assessRisks({
      projection,
      masteryBySubject: { por: weightedMastery(pi.topics, 'por'), mat: weightedMastery(pi.topics, 'mat'), fis: weightedMastery(pi.topics, 'fis') },
      daysSinceEssay: le ? diffDays(le, today) : Infinity,
      inscriptionConfirmed: !!settings?.inscriptionConfirmed,
    });
  }, [snap, settings, today]);

  if (!settings || !snap || !plan) return <Page title="Hoje"><p className="text-muted">Carregando…</p></Page>;

  const daysLeft = diffDays(today, settings.examDate);
  const doneMin = sessionsToday.filter((s) => !s.deleted).reduce((s, x) => s + x.minutes, 0);
  const planMin = blocks.reduce((s, b) => s + b.minutes, 0);
  const allDone = blocks.length > 0 && blocks.every((b) => b.done);
  const first = blocks.find((b) => !b.done);
  const headline =
    plan.phase === 'normal' && first
      ? `Hoje o foco é ${first.kind === 'essay' ? 'Redação' : first.title}. ${first.minutes} minutos. Go, Julls!`
      : allDone
        ? 'Plano de hoje concluído. Você é constância pura!'
        : plan.headline;

  const start = (b: PlanItem) => {
    if (b.kind === 'essay') nav(`/redacao/nova?plan=${b.id}&min=${b.minutes}`);
    else if (b.kind === 'mock') nav(`/simulado?plan=${b.id}`);
    else nav(`/foco?item=${b.id}`);
  };

  return (
    <Page
      title="Hoje"
      actions={
        <span className="chip font-bold text-accent" aria-label={`Faltam ${daysLeft} dias para a prova`}>
          {daysLeft > 0 ? `${daysLeft} dias` : daysLeft === 0 ? 'É hoje!' : 'Prova feita'}
        </span>
      }
    >
      {update && (
        <Card className="mb-4 border-pink">
          <p className="font-semibold">Nova versão {update.version} disponível</p>
          {update.notes && <p className="text-sm text-muted">{update.notes}</p>}
          <a className="btn-primary mt-3" href={update.url} target="_blank" rel="noreferrer">
            <Icon name="download" /> Baixar APK
          </a>
        </Card>
      )}

      <Card className="mb-5 bg-elevated">
        <p className="text-xl font-extrabold leading-snug">{headline}</p>
        <div className="flex flex-wrap gap-3 mt-3 text-sm text-muted">
          <span>{formatDay(today, { weekday: 'long', day: '2-digit', month: 'long' })}</span>
          <span>·</span>
          <span>
            {formatMinutes(doneMin)} de {formatMinutes(planMin)}
          </span>
          <span>·</span>
          <span>
            sequência: {streak(snap.sessions, today)} {streak(snap.sessions, today) === 1 ? 'dia' : 'dias'}
          </span>
        </div>
      </Card>

      <div className="tab:grid tab:grid-cols-[1fr_320px] tab:gap-6">
        <div>
          <Section
            title="Blocos de hoje"
            right={
              <button className="btn-text text-sm" onClick={() => void generatePlan(snap, true).then(() => toast('Plano recalculado'))}>
                <Icon name="sync" size={16} /> Recalcular
              </button>
            }
          >
            {blocks.length === 0 && <Card><p className="text-muted">{plan.headline}</p></Card>}
            <ol className="space-y-3">
              {blocks.map((b, i) => (
                <li key={b.id}>
                  <Card className={cx(b.done && 'opacity-70')}>
                    <div className="flex items-start gap-3">
                      <span className={cx('mt-0.5 w-8 h-8 rounded-full grid place-items-center shrink-0 font-bold', b.done ? 'bg-pinks text-bg' : 'bg-elevated text-accent border border-line')} aria-hidden>
                        {b.done ? <Icon name="check" size={18} /> : i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold leading-snug">
                          {b.title}
                          {b.done && <span className="sr-only"> (concluído)</span>}
                        </p>
                        <p className="text-sm text-accent font-semibold mt-0.5">
                          {b.minutes} min · {KIND_LABEL[b.kind] ?? b.kind}
                        </p>
                        <p className="text-sm text-muted mt-1">{b.reason}</p>
                      </div>
                    </div>
                    {!b.done && (
                      <div className="flex gap-2 mt-3">
                        <button className="btn-primary flex-1" onClick={() => start(b)}>
                          <Icon name="play" size={18} /> {b.kind === 'essay' ? 'Escrever' : b.kind === 'mock' ? 'Fazer simulado' : 'Iniciar foco'}
                        </button>
                        <button className="btn-ghost" onClick={() => setClosing(b)}>
                          <Icon name="check" size={18} /> Concluí
                        </button>
                      </div>
                    )}
                  </Card>
                </li>
              ))}
            </ol>
          </Section>
        </div>

        <aside>
          {risks.length > 0 && (
            <Section title="Atenção" right={<Link to="/progresso" className="btn-text text-sm">ver tudo</Link>}>
              <div className="space-y-2">
                {risks.slice(0, 3).map((r) => (
                  <Card key={r.id} className="flex gap-3 items-start">
                    <Icon name="alert" className={r.level === 'alto' ? 'text-warn shrink-0' : 'text-pinks shrink-0'} label={r.level === 'alto' ? 'Risco alto' : 'Atenção'} />
                    <div>
                      <p className="font-semibold text-sm">{r.title}</p>
                      <p className="text-xs text-muted">{r.detail}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </Section>
          )}
          <Section title="Atalhos">
            <div className="grid grid-cols-2 gap-2">
              <Link to="/flashcards/revisar" className="btn-ghost">
                <Icon name="cards" size={18} /> Revisar ({dueCards ?? 0})
              </Link>
              <Link to="/erros?novo=1" className="btn-ghost">
                <Icon name="bug" size={18} /> Errei uma
              </Link>
              <Link to="/foco" className="btn-ghost">
                <Icon name="timer" size={18} /> Estudo livre
              </Link>
              <Link to="/formulario" className="btn-ghost">
                <Icon name="sigma" size={18} /> Fórmulas
              </Link>
            </div>
          </Section>
        </aside>
      </div>

      <CloseBlockSheet item={closing} onClose={() => setClosing(null)} onDone={() => toast(cheer())} snapMastery={closing?.topicId ? snap.states.get(closing.topicId)?.mastery ?? 0 : null} />
    </Page>
  );
}

export function CloseBlockSheet({ item, onClose, onDone, snapMastery, minutes, startedAt }: { item: PlanItem | null; onClose: () => void; onDone: () => void; snapMastery: number | null; minutes?: number; startedAt?: string }) {
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [mastery, setMastery] = useState<number | null>(null);
  const [mins, setMins] = useState(minutes ?? item?.minutes ?? 25);
  useEffect(() => {
    setCorrect(0);
    setWrong(0);
    setMastery(null);
    setMins(minutes ?? item?.minutes ?? 25);
  }, [item, minutes]);
  if (!item) return null;
  const save = async () => {
    await completeStudy({
      topicId: item.topicId,
      subject: item.subject,
      minutes: mins,
      kind: item.kind,
      planItemId: item.id.startsWith('plan-') ? item.id : undefined,
      correct,
      wrong,
      mastery,
      startedAt,
    });
    void buzz('done');
    onDone();
    onClose();
  };
  return (
    <Sheet open={!!item} onClose={onClose} title="Como foi o bloco?">
      <p className="font-semibold mb-1">{item.title}</p>
      <p className="text-sm text-muted mb-4">{SUBJECT_SHORT[item.subject]} · tudo aqui é opcional</p>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span>Minutos</span>
          <Stepper label="minutos" value={mins} step={5} min={5} max={240} onChange={setMins} />
        </div>
        <div className="flex items-center justify-between">
          <span>Acertos</span>
          <Stepper label="acertos" value={correct} onChange={setCorrect} />
        </div>
        <div className="flex items-center justify-between">
          <span>Erros</span>
          <Stepper label="erros" value={wrong} onChange={setWrong} />
        </div>
        {item.topicId && (
          <div>
            <p className="mb-1">Domínio agora {snapMastery !== null && <span className="text-muted text-sm">(antes: {snapMastery}/5)</span>}</p>
            <MasteryPicker value={mastery} onChange={setMastery} />
          </div>
        )}
        {wrong > 0 && <p className="text-sm text-muted">Dica: registre os erros no Banco de erros para o planejador revisar esse tópico.</p>}
        <button className="btn-primary w-full" onClick={() => void save()}>
          <Icon name="check" /> Salvar
        </button>
      </div>
    </Sheet>
  );
}
