import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { repo, nowIso } from '../db/repo';
import type { MasteryLog, Settings } from '../db/types';
import { useApp } from '../app/AppContext';
import { Logo } from '../app/Layout';
import { MasteryPicker, Segmented, Stepper, cx } from '../ui/kit';
import { SUBJECT_ORDER } from '../data/seed';
import { SUBJECT_NAMES, SUBJECT_POINTS, fmt, type SubjectId } from '../core/exam';
import { WEEKDAYS, dayKey, formatMinutes } from '../core/dates';
import { ensureNotificationPermission } from '../native/native';

const LEVELS = ['não sei / nunca vi', 'vi pouco', 'básico', 'razoável', 'bom', 'domino'];

export default function Onboarding() {
  const { settings, saveSettings } = useApp();
  const topics = useLiveQuery(() => db.topics.toArray(), []) ?? [];
  const [step, setStep] = useState(0);
  const [examDate, setExamDate] = useState(settings!.examDate);
  const [lang, setLang] = useState<Settings['foreignLanguage']>(settings!.foreignLanguage);
  const [mins, setMins] = useState<number[]>(settings!.minutesByWeekday);
  const [bySubject, setBySubject] = useState<Partial<Record<SubjectId, number>>>({});
  const [byTopic, setByTopic] = useState<Record<string, number>>({});
  const [reminder, setReminder] = useState(settings!.reminderTimes[0] ?? '19:00');
  const [busy, setBusy] = useState(false);

  const total = mins.reduce((a, b) => a + b, 0);

  const finish = async () => {
    setBusy(true);
    const today = dayKey();
    for (const t of topics) {
      const m = byTopic[t.id] ?? bySubject[t.subject];
      if (m === undefined) continue;
      await repo.append<MasteryLog>('mastery_log', { topicId: t.id, subject: t.subject, mastery: m, day: today, at: nowIso(), source: 'onboarding' });
    }
    await saveSettings({ examDate, foreignLanguage: lang, minutesByWeekday: mins, reminderTimes: [reminder], onboarded: true });
    void ensureNotificationPermission();
    setBusy(false);
  };

  const steps = [
    {
      title: 'Bora montar seu norte',
      body: (
        <div className="space-y-5">
          <p className="text-muted">Quatro perguntas rápidas e o app diz todo dia o que estudar, por quanto tempo e por quê.</p>
          <div>
            <label className="label" htmlFor="exam">Data da prova</label>
            <input id="exam" type="date" className="input" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
            <p className="text-xs text-muted mt-1">Edital 2027.1: domingo, 06/12/2026, às 10h, 3 horas.</p>
          </div>
          <div>
            <span className="label">Língua estrangeira</span>
            <Segmented label="Língua estrangeira" value={lang} onChange={setLang} options={[{ value: 'ingles', label: 'Inglês' }, { value: 'espanhol', label: 'Espanhol' }]} />
          </div>
        </div>
      ),
    },
    {
      title: 'Quanto tempo por dia?',
      body: (
        <div className="space-y-2">
          <p className="text-muted mb-2">Seja realista: é melhor cumprir 1h do que planejar 4h. Total: <strong className="text-accent">{formatMinutes(total)}/semana</strong>.</p>
          {WEEKDAYS.map((w, i) => (
            <div key={w} className="flex items-center justify-between gap-2">
              <span className="w-24">{w}</span>
              <span className="text-muted text-sm w-16 text-right">{formatMinutes(mins[i])}</span>
              <Stepper label={`minutos de ${w}`} value={mins[i]} step={15} max={600} onChange={(v) => setMins((prev) => prev.map((x, j) => (j === i ? v : x)))} />
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'Como você está em cada matéria?',
      body: (
        <div className="space-y-4">
          <p className="text-muted">0 = não sei / nunca vi · 5 = domino. Sem pressão: isso só calibra o plano.</p>
          {SUBJECT_ORDER.map((s) => (
            <div key={s}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-semibold">{SUBJECT_NAMES[s]}</span>
                <span className="text-muted">vale {fmt(SUBJECT_POINTS[s])} pts</span>
              </div>
              <MasteryPicker label={SUBJECT_NAMES[s]} value={bySubject[s] ?? null} onChange={(v) => setBySubject((prev) => ({ ...prev, [s]: v }))} />
              {bySubject[s] !== undefined && <p className="text-xs text-muted mt-1">{LEVELS[bySubject[s]!]}</p>}
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'Detalhar Matemática, Física e Redação?',
      optional: true,
      body: (
        <div className="space-y-5">
          <p className="text-muted">Opcional: são 82 dos 100 pontos. Pule se preferir; dá para ajustar depois no Mapa.</p>
          {(['mat', 'fis', 'red'] as SubjectId[]).map((s) => (
            <div key={s}>
              <h3 className="font-bold text-accent mb-2">{SUBJECT_NAMES[s]}</h3>
              <div className="space-y-3">
                {topics
                  .filter((t) => t.subject === s)
                  .sort((a, b) => a.order - b.order)
                  .map((t) => (
                    <div key={t.id}>
                      <p className="text-sm mb-1">{t.name}</p>
                      <MasteryPicker label={t.name} value={byTopic[t.id] ?? bySubject[s] ?? null} onChange={(v) => setByTopic((prev) => ({ ...prev, [t.id]: v }))} />
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'Lembrete diário',
      body: (
        <div className="space-y-4">
          <p className="text-muted">Uma notificação no horário que você escolher, com o bloco do dia. Funciona offline.</p>
          <input type="time" className="input" value={reminder} onChange={(e) => setReminder(e.target.value)} aria-label="Horário do lembrete" />
          <p className="text-sm text-muted">Dá para adicionar mais horários em Configurações.</p>
        </div>
      ),
    },
  ];

  const cur = steps[step];
  const last = step === steps.length - 1;

  return (
    <div className="min-h-screen max-w-xl mx-auto px-4 py-6 safe-top flex flex-col">
      <Logo />
      <div className="flex gap-1 my-5" aria-label={`Passo ${step + 1} de ${steps.length}`}>
        {steps.map((_, i) => (
          <span key={i} className={cx('h-1.5 flex-1 rounded-full', i <= step ? 'bg-pink' : 'bg-elevated')} />
        ))}
      </div>
      <h1 className="text-2xl font-extrabold mb-4">{cur.title}</h1>
      <div className="flex-1">{cur.body}</div>
      <div className="flex gap-2 mt-6 sticky bottom-0 bg-bg py-3 safe-bottom">
        {step > 0 && (
          <button className="btn-ghost" onClick={() => setStep(step - 1)}>
            Voltar
          </button>
        )}
        {'optional' in cur && cur.optional && (
          <button className="btn-text" onClick={() => setStep(step + 1)}>
            Pular
          </button>
        )}
        <button className="btn-primary flex-1" disabled={busy} onClick={() => (last ? void finish() : setStep(step + 1))}>
          {last ? (busy ? 'Salvando…' : 'Começar. Go, Julls!') : 'Continuar'}
        </button>
      </div>
    </div>
  );
}
