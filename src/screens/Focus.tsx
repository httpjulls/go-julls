import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { PlanItem } from '../db/types';
import { useApp } from '../app/AppContext';
import { cheer, completeStudy } from '../app/actions';
import { CloseBlockSheet } from './Today';
import { Card, Icon, Page, Stepper, cx } from '../ui/kit';
import { buzz, keepAwake, scheduleTimerEnd } from '../native/native';
import { SUBJECT_NAMES, type SubjectId } from '../core/exam';
import { SUBJECT_ORDER } from '../data/seed';

type Phase = 'work' | 'break';
interface TimerState {
  itemId: string | null;
  subject: SubjectId;
  topicId: string | null;
  title: string;
  targetMin: number;
  phase: Phase;
  endAt: number | null; // em execução
  remainingMs: number; // pausado
  workedMs: number;
  phaseStartedAt: number | null;
  startedAt: string;
}

const KEY = 'gojulls-timer';
const load = (): TimerState | null => {
  try {
    const s = localStorage.getItem(KEY);
    return s ? (JSON.parse(s) as TimerState) : null;
  } catch {
    return null;
  }
};
const store = (s: TimerState | null) => {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {
    /* sem storage: o cronômetro funciona só enquanto a tela está aberta */
  }
};

export default function Focus() {
  const { settings, toast } = useApp();
  const [params] = useSearchParams();
  const itemId = params.get('item');
  const item = useLiveQuery(() => (itemId ? db.plan_items.get(itemId) : undefined), [itemId]);
  const topics = useLiveQuery(() => db.topics.toArray(), []) ?? [];
  const [t, setT] = useState<TimerState | null>(load);
  const [now, setNow] = useState(Date.now());
  const [closing, setClosing] = useState<PlanItem | null>(null);
  const saved = useRef(false);

  // livre: escolher disciplina/tópico
  const [freeSubject, setFreeSubject] = useState<SubjectId>('mat');
  const [freeTopic, setFreeTopic] = useState<string>('');
  const [freeMin, setFreeMin] = useState(50);

  const work = settings?.pomodoroWork ?? 25;
  const brk = settings?.pomodoroBreak ?? 5;

  useEffect(() => store(t), [t]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    void keepAwake(!!t?.endAt);
    return () => void keepAwake(false);
  }, [t?.endAt]);

  const remaining = t ? (t.endAt ? Math.max(0, t.endAt - now) : t.remainingMs) : 0;
  const workedMs = t ? t.workedMs + (t.endAt && t.phase === 'work' && t.phaseStartedAt ? now - t.phaseStartedAt : 0) : 0;

  // Transição de fase
  useEffect(() => {
    if (!t?.endAt || remaining > 0) return;
    void buzz('done');
    const worked = t.workedMs + (t.phase === 'work' && t.phaseStartedAt ? t.endAt - t.phaseStartedAt : 0);
    if (worked >= t.targetMin * 60000 - 1000) {
      finish({ ...t, workedMs: worked, endAt: null, phaseStartedAt: null, remainingMs: 0 });
      return;
    }
    if (t.phase === 'work') {
      const next = Date.now() + brk * 60000;
      setT({ ...t, phase: 'break', workedMs: worked, endAt: next, phaseStartedAt: null });
      void scheduleTimerEnd(new Date(next), 'Pausa acabou. Bora pro próximo pomodoro!');
    } else {
      const left = t.targetMin * 60000 - t.workedMs;
      const len = Math.min(work * 60000, left);
      const next = Date.now() + len;
      setT({ ...t, phase: 'work', endAt: next, phaseStartedAt: Date.now() });
      void scheduleTimerEnd(new Date(next), 'Pomodoro concluído!');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, t]);

  const begin = (base: Omit<TimerState, 'phase' | 'endAt' | 'remainingMs' | 'workedMs' | 'phaseStartedAt' | 'startedAt'>) => {
    const len = Math.min(work, base.targetMin) * 60000;
    const endAt = Date.now() + len;
    saved.current = false;
    setT({ ...base, phase: 'work', endAt, remainingMs: len, workedMs: 0, phaseStartedAt: Date.now(), startedAt: new Date().toISOString() });
    void scheduleTimerEnd(new Date(endAt), 'Pomodoro concluído!');
    void buzz();
  };

  const pause = () => {
    if (!t?.endAt) return;
    const worked = t.workedMs + (t.phase === 'work' && t.phaseStartedAt ? Date.now() - t.phaseStartedAt : 0);
    setT({ ...t, endAt: null, remainingMs: Math.max(0, t.endAt - Date.now()), workedMs: worked, phaseStartedAt: null });
    void scheduleTimerEnd(null);
  };
  const resume = () => {
    if (!t || t.endAt) return;
    const endAt = Date.now() + t.remainingMs;
    setT({ ...t, endAt, phaseStartedAt: t.phase === 'work' ? Date.now() : null });
    void scheduleTimerEnd(new Date(endAt));
  };

  const finish = (s: TimerState) => {
    void scheduleTimerEnd(null);
    const minutes = Math.max(1, Math.round(s.workedMs / 60000));
    setT(null);
    store(null);
    setClosing({
      id: s.itemId ?? 'livre',
      day: '',
      index: 0,
      topicId: s.topicId,
      subject: s.subject,
      minutes,
      kind: 'study',
      title: s.title,
      reason: '',
      done: false,
      updated_at: '',
      device_id: '',
    });
    closingMeta.current = { minutes, startedAt: s.startedAt };
  };
  const closingMeta = useRef<{ minutes: number; startedAt: string } | null>(null);

  const stopAndLog = () => {
    if (!t) return;
    finish({ ...t, workedMs: workedMs });
  };

  const fmtClock = (ms: number) => {
    const s = Math.ceil(ms / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };

  const subjectTopics = useMemo(() => topics.filter((x) => !x.deleted && x.subject === freeSubject).sort((a, b) => a.order - b.order), [topics, freeSubject]);

  return (
    <Page title="Foco">
      {!t && (
        <div className="max-w-xl">
          {item ? (
            <Card className="mb-4">
              <p className="text-sm text-muted">Bloco do plano</p>
              <p className="text-lg font-bold">{item.title}</p>
              <p className="text-sm text-muted mt-1">{item.reason}</p>
              <p className="mt-3 text-accent font-semibold">
                {item.minutes} min em pomodoros de {work}/{brk}
              </p>
              <button className="btn-primary w-full mt-4" onClick={() => begin({ itemId: item.id, subject: item.subject, topicId: item.topicId, title: item.title, targetMin: item.minutes })}>
                <Icon name="play" /> Começar
              </button>
            </Card>
          ) : (
            <Card className="space-y-4">
              <p className="font-semibold">Estudo livre</p>
              <div>
                <label className="label" htmlFor="fs">Disciplina</label>
                <select id="fs" className="input" value={freeSubject} onChange={(e) => { setFreeSubject(e.target.value as SubjectId); setFreeTopic(''); }}>
                  {SUBJECT_ORDER.map((s) => (
                    <option key={s} value={s}>{SUBJECT_NAMES[s]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="ft">Tópico (opcional)</label>
                <select id="ft" className="input" value={freeTopic} onChange={(e) => setFreeTopic(e.target.value)}>
                  <option value="">—</option>
                  {subjectTopics.map((x) => (
                    <option key={x.id} value={x.id}>{x.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span>Duração (min)</span>
                <Stepper label="duração" value={freeMin} step={5} min={5} max={240} onChange={setFreeMin} />
              </div>
              <button
                className="btn-primary w-full"
                onClick={() =>
                  begin({
                    itemId: null,
                    subject: freeSubject,
                    topicId: freeTopic || null,
                    title: freeTopic ? subjectTopics.find((x) => x.id === freeTopic)?.name ?? SUBJECT_NAMES[freeSubject] : SUBJECT_NAMES[freeSubject],
                    targetMin: freeMin,
                  })
                }
              >
                <Icon name="play" /> Começar
              </button>
            </Card>
          )}
          <p className="text-sm text-muted mt-3">A tela fica acesa durante o bloco e o celular vibra ao terminar. Pomodoro configurável em Configurações.</p>
        </div>
      )}

      {t && (
        <div className="flex flex-col items-center text-center py-6">
          <p className={cx('chip mb-4', t.phase === 'break' ? 'text-pinks' : 'text-accent')}>{t.phase === 'work' ? 'Foco' : 'Pausa'}</p>
          <p className="text-lg font-semibold max-w-md">{t.title}</p>
          <p className="font-black tabular-nums text-[22vw] tab:text-[9rem] leading-none my-6 text-ink" aria-live="off">
            {fmtClock(remaining)}
          </p>
          <p className="text-muted mb-6">
            Estudado: {Math.floor(workedMs / 60000)} de {t.targetMin} min
          </p>
          <div className="flex gap-3">
            {t.endAt ? (
              <button className="btn-ghost w-36" onClick={pause}>
                <Icon name="pause" /> Pausar
              </button>
            ) : (
              <button className="btn-primary w-36" onClick={resume}>
                <Icon name="play" /> Continuar
              </button>
            )}
            <button className="btn-ghost" onClick={stopAndLog}>
              <Icon name="check" /> Encerrar e registrar
            </button>
          </div>
        </div>
      )}

      <CloseBlockSheet
        item={closing}
        minutes={closingMeta.current?.minutes}
        startedAt={closingMeta.current?.startedAt}
        snapMastery={null}
        onDone={() => {
          saved.current = true;
          toast(cheer());
        }}
        onClose={() => {
          // registra a sessão automaticamente mesmo se ela fechar sem preencher
          if (!saved.current && closing && closingMeta.current) {
            void completeStudy({
              topicId: closing.topicId,
              subject: closing.subject,
              minutes: closingMeta.current.minutes,
              kind: 'study',
              planItemId: closing.id.startsWith('plan-') ? closing.id : undefined,
              startedAt: closingMeta.current.startedAt,
            });
            toast('Sessão registrada.');
          }
          saved.current = true;
          setClosing(null);
        }}
      />
    </Page>
  );
}
