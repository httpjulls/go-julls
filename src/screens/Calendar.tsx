import { useApp } from '../app/AppContext';
import { MILESTONES } from '../core/exam';
import { diffDays, formatDay } from '../core/dates';
import { Card, Icon, Page, cx } from '../ui/kit';

export default function Calendar() {
  const { settings, today, saveSettings } = useApp();
  if (!settings) return null;
  const days = diffDays(today, settings.examDate);
  const weeks = Math.floor(Math.max(0, days) / 7);

  return (
    <Page title="Calendário">
      <Card className="text-center mb-6 bg-elevated">
        <p className="text-muted">Prova em {formatDay(settings.examDate, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}, 10h</p>
        <p className="text-7xl font-black text-accent my-2 tabular-nums">{Math.max(0, days)}</p>
        <p className="font-semibold">{days > 1 ? `dias (${weeks} ${weeks === 1 ? 'semana' : 'semanas'} e ${days % 7} dias)` : days === 1 ? 'dia: é amanhã!' : days === 0 ? 'É hoje. Go, Julls!' : 'Prova realizada'}</p>
      </Card>

      {!settings.inscriptionConfirmed && (
        <Card className="mb-6 border-warn/60">
          <div className="flex gap-3 items-start">
            <Icon name="alert" className="text-warn shrink-0" label="Atenção" />
            <div className="flex-1">
              <p className="font-semibold">Inscrição e confirmação</p>
              <p className="text-sm text-muted">
                O edital fixa o encerramento das inscrições em 29/10/2026; há notícias de prorrogação até 15/11/2026 (não verificadas no site oficial). A
                impressão do Cartão de Confirmação de Inscrição vai de 30/11 a 04/12/2026. Confira em cecierj.edu.br.
              </p>
              <button className="btn-primary mt-3" onClick={() => void saveSettings({ inscriptionConfirmed: true })}>
                <Icon name="check" /> Já confirmei
              </button>
            </div>
          </div>
        </Card>
      )}

      <h2 className="text-sm font-bold uppercase tracking-wider text-muted mb-2">Marcos do edital 2027.1 (Anexo 1)</h2>
      <ol className="relative border-l-2 border-line ml-3 space-y-4">
        {MILESTONES.map((m) => {
          const past = (m.end ?? m.date) < today;
          const now = m.date <= today && (m.end ?? m.date) >= today;
          return (
            <li key={m.label + m.date} className="ml-5">
              <span className={cx('absolute -left-[9px] mt-1.5 w-4 h-4 rounded-full border-2', now ? 'bg-pink border-pink' : past ? 'bg-line border-line' : 'bg-bg border-pink')} aria-hidden />
              <p className={cx('font-semibold', past && 'text-muted line-through', /PROVA|RESULTADO/.test(m.label) && !past && 'text-accent')}>{m.label}</p>
              <p className="text-sm text-muted">
                {formatDay(m.date, { day: '2-digit', month: '2-digit', year: 'numeric' })}
                {m.end && ` a ${formatDay(m.end, { day: '2-digit', month: '2-digit', year: 'numeric' })}`}
                {!past && ` · em ${diffDays(today, m.date)} dias`}
                {now && ' · agora'}
              </p>
            </li>
          );
        })}
      </ol>
      <p className="text-xs text-muted mt-6">Fonte: Edital 2027.1, Anexo 1 – Calendário de Atividades (p. 29–30). Datas “previstas” pelo edital; confira atualizações no site oficial.</p>
    </Page>
  );
}
