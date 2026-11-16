import { useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { repo } from '../db/repo';
import type { Achievement } from '../db/types';
import { useApp, useSnapshot } from '../app/AppContext';
import { lastEssayDay, projectionInputs, streak } from '../db/state';
import { assessRisks, projectScore, weightedMastery } from '../core/projection';
import { SUBJECT_NAMES, SUBJECT_SHORT, fmt, type SubjectId } from '../core/exam';
import { addDays, dayKey, diffDays, formatDay, formatMinutes, weekStart } from '../core/dates';
import { SUBJECT_ORDER } from '../data/seed';
import { Bar, Card, Disclaimer, Icon, Page, Section, Stepper, cx } from '../ui/kit';

export const ACHIEVEMENTS: { key: string; label: string; test: (x: AchInput) => boolean }[] = [
  { key: 'primeiro-bloco', label: 'Primeiro bloco concluído', test: (x) => x.sessions >= 1 },
  { key: 'sequencia-3', label: '3 dias seguidos', test: (x) => x.streak >= 3 },
  { key: 'sequencia-7', label: '7 dias seguidos', test: (x) => x.streak >= 7 },
  { key: 'horas-10', label: '10 horas estudadas', test: (x) => x.minutes >= 600 },
  { key: 'questoes-100', label: '100 questões resolvidas', test: (x) => x.attempts >= 100 },
  { key: 'redacao-1', label: 'Primeira redação', test: (x) => x.essays >= 1 },
  { key: 'redacao-5', label: '5 redações', test: (x) => x.essays >= 5 },
  { key: 'simulado', label: 'Simulado concluído', test: (x) => x.mocks >= 1 },
];
interface AchInput { sessions: number; streak: number; minutes: number; attempts: number; essays: number; mocks: number }

export default function Progress() {
  const { settings, saveSettings, today } = useApp();
  const snap = useSnapshot();
  const achieved = useLiveQuery(() => db.achievements.toArray(), []) ?? [];

  const data = useMemo(() => {
    if (!snap || !settings) return null;
    const pi = projectionInputs(snap);
    const activeTopics = pi.topics;
    const projection = projectScore(activeTopics, pi.attempts, pi.essay);
    const le = lastEssayDay(snap.essays);
    const risks = assessRisks({
      projection,
      masteryBySubject: { por: weightedMastery(activeTopics, 'por'), mat: weightedMastery(activeTopics, 'mat'), fis: weightedMastery(activeTopics, 'fis') },
      daysSinceEssay: le ? diffDays(le, today) : Infinity,
      inscriptionConfirmed: settings.inscriptionConfirmed,
    });
    const minutesBySubject = new Map<SubjectId, number>();
    for (const s of snap.sessions) minutesBySubject.set(s.subject, (minutesBySubject.get(s.subject) ?? 0) + s.minutes);
    const totalMin = snap.sessions.reduce((a, s) => a + s.minutes, 0);
    // semana atual (segunda a domingo)
    const ws = weekStart(today);
    const weekMin = snap.sessions.filter((s) => s.day >= ws).reduce((a, s) => a + s.minutes, 0);
    const weekQ = snap.attempts.filter((a) => a.day >= ws).length + snap.sessions.filter((s) => s.day >= ws).reduce((a, s) => a + (s.correct ?? 0) + (s.wrong ?? 0), 0);
    // últimos 14 dias
    const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
    const perDay = days.map((d) => ({ d, m: snap.sessions.filter((s) => s.day === d).reduce((a, s) => a + s.minutes, 0) }));
    // acerto por tópico
    const byTopic = new Map<string, { c: number; n: number; sec: number }>();
    for (const a of snap.attempts) {
      if (!a.topicId) continue;
      const x = byTopic.get(a.topicId) ?? { c: 0, n: 0, sec: 0 };
      x.n++;
      if (a.correct) x.c++;
      x.sec += a.seconds;
      byTopic.set(a.topicId, x);
    }
    const topicStats = [...byTopic.entries()]
      .map(([id, x]) => ({ id, name: snap.topics.find((t) => t.id === id)?.name ?? id, rate: x.c / x.n, n: x.n, avgSec: x.sec / x.n }))
      .sort((a, b) => a.rate - b.rate);
    // melhores horários: minutos e acerto por faixa de hora de início
    const hours = new Map<number, number>();
    for (const s of snap.sessions) {
      const h = new Date(s.startedAt).getHours();
      hours.set(h, (hours.get(h) ?? 0) + s.minutes);
    }
    const bestHours = [...hours.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    const totalAttempts = snap.attempts.length;
    const avgSec = totalAttempts ? snap.attempts.reduce((a, x) => a + x.seconds, 0) / totalAttempts : 0;
    const accuracy = totalAttempts ? snap.attempts.filter((a) => a.correct).length / totalAttempts : null;
    const st = streak(snap.sessions, today);
    const ach: AchInput = {
      sessions: snap.sessions.length,
      streak: st,
      minutes: totalMin,
      attempts: totalAttempts,
      essays: snap.essays.length,
      mocks: snap.mocks.filter((m) => m.finishedAt).length,
    };
    return { projection, risks, minutesBySubject, totalMin, weekMin, weekQ, perDay, topicStats, bestHours, avgSec, accuracy, st, ach, activeTopics };
  }, [snap, settings, today]);

  // conquistas discretas (registradas uma vez)
  useEffect(() => {
    if (!data) return;
    const have = new Set(achieved.map((a) => a.key));
    for (const a of ACHIEVEMENTS) if (!have.has(a.key) && a.test(data.ach)) void repo.append<Achievement>('achievements', { id: `ach-${a.key}`, key: a.key, day: dayKey() });
  }, [data, achieved]);

  if (!data || !settings) return <Page title="Progresso"><p className="text-muted">Carregando…</p></Page>;
  const { projection } = data;
  const maxDay = Math.max(30, ...data.perDay.map((x) => x.m));

  return (
    <Page title="Progresso">
      <div className="tab:grid tab:grid-cols-2 tab:gap-6">
        <div>
          <Section title="Projeção de nota (estimativa)">
            <Card>
              <div className="grid grid-cols-3 gap-2 text-center mb-4">
                <div>
                  <p className="text-3xl font-black">{fmt(projection.n1)}</p>
                  <p className="text-xs text-muted">objetivas / 63</p>
                </div>
                <div>
                  <p className="text-3xl font-black">{projection.n2 === null ? '—' : fmt(projection.n2, 0)}</p>
                  <p className="text-xs text-muted">redação / 100</p>
                </div>
                <div>
                  <p className="text-3xl font-black text-accent">{fmt(projection.nf)}</p>
                  <p className="text-xs text-muted">nota final / 100</p>
                </div>
              </div>
              <ul className="space-y-2">
                {projection.subjects.map((s) => (
                  <li key={s.subject}>
                    <div className="flex justify-between text-sm">
                      <span>{SUBJECT_SHORT[s.subject]}</span>
                      <span className="text-muted tabular-nums">
                        {fmt(s.expectedCorrect)} acertos · {fmt(s.expectedPoints)}/{fmt(s.maxPoints)} pts
                      </span>
                    </div>
                    <Bar value={s.expectedPoints} max={s.maxPoints} />
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted mt-3">
                NF = N1 + N2 × 0,37 (item 8.3). Redação usa a média das suas 3 últimas autoavaliações{projection.n2 === null && ' (ainda sem redação avaliada)'}. {!projection.essayLikelyCorrected && 'Com N1 ≤ 31 a redação pode não ser corrigida (item 6.3.2).'}
              </p>
              <div className="mt-3">
                <Disclaimer />
              </div>
            </Card>
          </Section>

          <Section title="Painel de risco">
            {data.risks.length === 0 ? (
              <Card className="flex gap-3 items-center">
                <Icon name="check" className="text-pinks" />
                <p>Sem alertas agora. Segue o plano!</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {data.risks.map((r) => (
                  <Card key={r.id} className={cx('flex gap-3 items-start', r.level === 'alto' && 'border-warn/60')}>
                    <Icon name="alert" className={r.level === 'alto' ? 'text-warn shrink-0' : 'text-pinks shrink-0'} label={r.level === 'alto' ? 'Risco alto' : 'Atenção'} />
                    <div>
                      <p className="font-semibold">{r.title}</p>
                      <p className="text-sm text-muted">{r.detail}</p>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Section>

          <Section title="Domínio por disciplina">
            <Card className="space-y-2">
              {SUBJECT_ORDER.map((s) => {
                const m = weightedMastery(data.activeTopics, s);
                return (
                  <div key={s}>
                    <div className="flex justify-between text-sm">
                      <span>{SUBJECT_NAMES[s]}</span>
                      <span className="tabular-nums text-muted">{m.toFixed(1)}/5</span>
                    </div>
                    <Bar value={m} max={5} />
                  </div>
                );
              })}
            </Card>
          </Section>
        </div>

        <div>
          <Section title="Meta da semana">
            <Card className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Horas</span>
                  <span className="text-muted">
                    {formatMinutes(data.weekMin)} / {formatMinutes(settings.weeklyGoalMinutes)}
                  </span>
                </div>
                <Bar value={data.weekMin} max={settings.weeklyGoalMinutes} />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Questões</span>
                  <span className="text-muted">
                    {data.weekQ} / {settings.weeklyGoalQuestions}
                  </span>
                </div>
                <Bar value={data.weekQ} max={settings.weeklyGoalQuestions} />
              </div>
              <div className="flex flex-wrap gap-4 justify-between">
                <div className="flex items-center gap-2 text-sm">
                  Meta (h)
                  <Stepper label="meta de horas" value={Math.round(settings.weeklyGoalMinutes / 60)} min={1} max={60} onChange={(v) => void saveSettings({ weeklyGoalMinutes: v * 60 })} />
                </div>
                <div className="flex items-center gap-2 text-sm">
                  Questões
                  <Stepper label="meta de questões" value={settings.weeklyGoalQuestions} step={10} min={0} max={1000} onChange={(v) => void saveSettings({ weeklyGoalQuestions: v })} />
                </div>
              </div>
            </Card>
          </Section>

          <Section title="Últimos 14 dias">
            <Card>
              <div className="flex items-end gap-1 h-28" aria-label="Minutos estudados por dia">
                {data.perDay.map(({ d, m }) => (
                  <div key={d} className="flex-1 flex flex-col items-center gap-1">
                    <div className={cx('w-full rounded-t', d === today ? 'bg-pink' : 'bg-pink/50')} style={{ height: `${Math.max(2, (m / maxDay) * 100)}%` }} title={`${formatDay(d)}: ${formatMinutes(m)}`} />
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-muted mt-1">
                <span>{formatDay(data.perDay[0].d)}</span>
                <span>hoje</span>
              </div>
              <p className="mt-3 text-sm">
                Sequência: <strong className="text-accent">{data.st} {data.st === 1 ? 'dia' : 'dias'}</strong> · Total: <strong>{formatMinutes(data.totalMin)}</strong>
              </p>
            </Card>
          </Section>

          <Section title="Horas por disciplina">
            <Card className="space-y-2">
              {SUBJECT_ORDER.map((s) => (
                <div key={s} className="flex items-center gap-3 text-sm">
                  <span className="w-24 shrink-0">{SUBJECT_SHORT[s]}</span>
                  <Bar value={data.minutesBySubject.get(s) ?? 0} max={Math.max(60, ...data.minutesBySubject.values())} className="flex-1" />
                  <span className="w-14 text-right text-muted tabular-nums">{formatMinutes(data.minutesBySubject.get(s) ?? 0)}</span>
                </div>
              ))}
            </Card>
          </Section>

          <Section title="Estatísticas">
            <Card className="space-y-3 text-sm">
              <p>
                Acerto geral: <strong>{data.accuracy === null ? '—' : `${Math.round(data.accuracy * 100)}%`}</strong> · Tempo médio por questão: <strong>{data.avgSec ? `${Math.round(data.avgSec)} s` : '—'}</strong>
              </p>
              <p>
                Horários em que você mais estuda: <strong>{data.bestHours.length ? data.bestHours.map(([h]) => `${h}h`).join(', ') : '—'}</strong>
              </p>
              {data.topicStats.length > 0 && (
                <div>
                  <p className="text-muted mb-1">Acerto por tópico (piores primeiro)</p>
                  <ul className="space-y-1">
                    {data.topicStats.slice(0, 8).map((t) => (
                      <li key={t.id} className="flex justify-between gap-2">
                        <span className="truncate">{t.name}</span>
                        <span className="tabular-nums text-muted shrink-0">
                          {Math.round(t.rate * 100)}% ({t.n}) · {Math.round(t.avgSec)} s
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          </Section>

          <Section title="Conquistas">
            <div className="flex flex-wrap gap-2">
              {ACHIEVEMENTS.map((a) => {
                const got = achieved.some((x) => x.key === a.key);
                return (
                  <span key={a.key} className={got ? 'chip text-accent border-pink/60' : 'chip opacity-50'}>
                    <Icon name={got ? 'trophy' : 'more'} size={14} /> {a.label}
                  </span>
                );
              })}
            </div>
          </Section>
        </div>
      </div>
    </Page>
  );
}
