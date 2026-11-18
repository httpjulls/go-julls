import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useApp, useSnapshot } from '../app/AppContext';
import { plannerBase } from '../db/state';
import { buildSchedule, minutesBySubject } from '../core/schedule';
import { SUBJECT_SHORT, type SubjectId } from '../core/exam';
import { formatDay, formatMinutes, weekStart } from '../core/dates';
import { SUBJECT_ORDER } from '../data/seed';
import type { DayPlan } from '../core/planner';
import { Bar, Card, Icon, Page, Section, Segmented, cx } from '../ui/kit';

const KIND: Record<string, string> = { study: 'novo', review: 'revisão', essay: 'redação', mock: 'simulado', light: 'leve' };

export default function Schedule() {
  const { settings, today } = useApp();
  const snap = useSnapshot();
  const todayItems = useLiveQuery(() => db.plan_items.where('day').equals(today).toArray(), [today]) ?? [];
  const [view, setView] = useState<'lista' | 'materias'>('lista');

  const days = useMemo(() => {
    if (!snap || !settings) return [];
    const saved = todayItems.filter((i) => !i.deleted).sort((a, b) => a.index - b.index);
    const base = plannerBase(snap, today);
    const first = buildSchedule({ ...base, from: today, minutesByWeekday: settings.minutesByWeekday })[0];
    const firstDayPlan: DayPlan | undefined = saved.length
      ? { ...first, blocks: saved.map((i) => ({ topicId: i.topicId, subject: i.subject, minutes: i.minutes, kind: i.kind, title: i.title, reason: i.reason, value: 0 })) }
      : undefined;
    return buildSchedule({ ...base, from: today, minutesByWeekday: settings.minutesByWeekday, firstDayPlan });
  }, [snap, settings, today, todayItems]);

  if (!settings || !snap) return <Page title="Cronograma"><p className="text-muted">Carregando…</p></Page>;

  const bySubject = minutesBySubject(days);
  const totalMin = Object.values(bySubject).reduce((a, b) => a + (b ?? 0), 0);
  const maxMin = Math.max(1, ...Object.values(bySubject).map((x) => x ?? 0));

  // agrupa por semana (segunda a domingo)
  const weeks = new Map<string, DayPlan[]>();
  for (const d of days) weeks.set(weekStart(d.day), [...(weeks.get(weekStart(d.day)) ?? []), d]);

  return (
    <Page title="Cronograma">
      <Card className="mb-4 text-sm">
        <p>
          Previsão do que estudar em cada dia até a prova, supondo que você cumpra os blocos. <strong className="text-accent">Ela se ajusta sozinha</strong>: se um dia não der, o plano dos próximos é refeito a partir do que você realmente estudou.
        </p>
        <p className="text-muted mt-2">
          Total previsto: {formatMinutes(totalMin)} em {days.filter((d) => d.blocks.length).length} dias de estudo. Ajuste as horas por dia em Configurações.
        </p>
      </Card>

      <Segmented label="Visão" value={view} onChange={setView} options={[{ value: 'lista', label: 'Dia a dia' }, { value: 'materias', label: 'Por matéria' }]} />

      {view === 'materias' ? (
        <Card className="mt-4 space-y-2">
          {SUBJECT_ORDER.map((s: SubjectId) => (
            <div key={s} className="flex items-center gap-3 text-sm">
              <span className="w-24 shrink-0">{SUBJECT_SHORT[s]}</span>
              <Bar value={bySubject[s] ?? 0} max={maxMin} className="flex-1" />
              <span className="w-16 text-right tabular-nums text-muted">{formatMinutes(bySubject[s] ?? 0)}</span>
            </div>
          ))}
          <p className="text-xs text-muted pt-2">Mais tempo para o que vale mais ponto por hora: Redação (37), Matemática e Física (15 cada).</p>
        </Card>
      ) : (
        <div className="mt-4">
          {[...weeks.entries()].map(([ws, list]) => (
            <Section key={ws} title={`Semana de ${formatDay(ws)}`}>
              <div className="grid tab:grid-cols-2 gap-2">
                {list.map((d) => (
                  <Card key={d.day} className={cx('!p-3', d.day === today && 'ring-2 ring-pink')}>
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <p className="font-bold capitalize">
                        {formatDay(d.day, { weekday: 'short', day: '2-digit', month: '2-digit' })}
                        {d.day === today && <span className="text-accent"> · hoje</span>}
                      </p>
                      <span className="text-xs text-muted">{d.daysLeft > 0 ? `faltam ${d.daysLeft}` : 'prova'}</span>
                    </div>
                    {d.blocks.length === 0 ? (
                      <p className="text-sm text-muted">
                        {d.phase === 'exam-day' ? 'Dia da prova. Go, Julls!' : d.phase === 'rest' ? 'Descanso (sem horas planejadas).' : d.headline}
                      </p>
                    ) : (
                      <ul className="space-y-1">
                        {d.blocks.map((b, i) => (
                          <li key={i} className="flex gap-2 text-sm items-start">
                            <span className="tabular-nums text-muted w-12 shrink-0">{b.minutes} min</span>
                            <span className="flex-1 leading-snug">
                              {b.kind === 'essay' ? 'Redação: treino cronometrado' : b.kind === 'mock' ? b.title : b.title}
                              <span className="text-xs text-accent"> · {KIND[b.kind]}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {d.phase === 'eve' && <p className="text-xs text-muted mt-1">Véspera: revisão leve e descanso.</p>}
                  </Card>
                ))}
              </div>
            </Section>
          ))}
        </div>
      )}
      <p className="text-xs text-muted mt-4 flex gap-2">
        <Icon name="alert" size={14} className="text-warn shrink-0 mt-0.5" /> É uma previsão: o plano oficial de cada dia é o da tela Hoje.
      </p>
    </Page>
  );
}
