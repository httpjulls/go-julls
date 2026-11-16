import { useState } from 'react';
import { db } from '../db/db';
import { useApp, engine } from '../app/AppContext';
import { DEFAULT_PARAMS } from '../core/planner';
import { WEEKDAYS, dayKey, formatMinutes } from '../core/dates';
import { Card, Icon, Page, Section, Segmented, Stepper, Toggle } from '../ui/kit';
import { exportCsv, exportJson, importJson } from '../db/backup';
import { ensureNotificationPermission, pickTextFile, saveTextFile } from '../native/native';
import { APP_VERSION, checkForUpdate } from '../native/update';
import { supabaseConfigured } from '../sync/supabase';

export default function Settings() {
  const { settings, saveSettings, toast, auth, session, signOut, sync } = useApp();
  const [newTime, setNewTime] = useState('07:30');
  if (!settings) return null;
  const p = { ...DEFAULT_PARAMS, ...settings.plannerParams };
  const setParam = (k: keyof typeof DEFAULT_PARAMS, v: number) => void saveSettings({ plannerParams: { ...settings.plannerParams, [k]: v } });

  return (
    <Page title="Configurações">
      <div className="tab:grid tab:grid-cols-2 tab:gap-6">
        <div>
          <Section title="Prova">
            <Card className="space-y-4">
              <div>
                <label className="label" htmlFor="exam">Data da prova</label>
                <input id="exam" type="date" className="input" value={settings.examDate} onChange={(e) => void saveSettings({ examDate: e.target.value })} />
              </div>
              <div>
                <span className="label">Língua estrangeira</span>
                <Segmented
                  label="Língua estrangeira"
                  value={settings.foreignLanguage}
                  options={[{ value: 'ingles', label: 'Inglês' }, { value: 'espanhol', label: 'Espanhol' }]}
                  onChange={(v) => void saveSettings({ foreignLanguage: v })}
                />
              </div>
              <Toggle label="Inscrição confirmada" checked={settings.inscriptionConfirmed} onChange={(v) => void saveSettings({ inscriptionConfirmed: v })} />
            </Card>
          </Section>

          <Section title="Tempo de estudo por dia">
            <Card className="space-y-2">
              {WEEKDAYS.map((w, i) => (
                <div key={w} className="flex items-center justify-between gap-2">
                  <span className="w-24">{w}</span>
                  <span className="text-muted text-sm">{formatMinutes(settings.minutesByWeekday[i])}</span>
                  <Stepper
                    label={`minutos de ${w}`}
                    value={settings.minutesByWeekday[i]}
                    step={15}
                    max={600}
                    onChange={(v) => void saveSettings({ minutesByWeekday: settings.minutesByWeekday.map((x, j) => (j === i ? v : x)) })}
                  />
                </div>
              ))}
            </Card>
          </Section>

          <Section title="Lembretes">
            <Card className="space-y-3">
              <Toggle
                label="Lembretes diários"
                checked={settings.remindersOn}
                onChange={(v) => {
                  if (v) void ensureNotificationPermission();
                  void saveSettings({ remindersOn: v });
                }}
              />
              <div className="flex flex-wrap gap-2">
                {settings.reminderTimes.map((t) => (
                  <button key={t} className="chip" onClick={() => void saveSettings({ reminderTimes: settings.reminderTimes.filter((x) => x !== t) })} aria-label={`Remover lembrete das ${t}`}>
                    {t} <Icon name="x" size={14} />
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="time" className="input" value={newTime} onChange={(e) => setNewTime(e.target.value)} aria-label="Novo horário" />
                <button className="btn-ghost" onClick={() => !settings.reminderTimes.includes(newTime) && void saveSettings({ reminderTimes: [...settings.reminderTimes, newTime].sort() })}>
                  <Icon name="plus" /> Adicionar
                </button>
              </div>
            </Card>
          </Section>

          <Section title="Foco (Pomodoro)">
            <Card className="space-y-2">
              <div className="flex justify-between items-center">
                <span>Foco (min)</span>
                <Stepper label="minutos de foco" value={settings.pomodoroWork} min={10} max={60} step={5} onChange={(v) => void saveSettings({ pomodoroWork: v })} />
              </div>
              <div className="flex justify-between items-center">
                <span>Pausa (min)</span>
                <Stepper label="minutos de pausa" value={settings.pomodoroBreak} min={1} max={20} onChange={(v) => void saveSettings({ pomodoroBreak: v })} />
              </div>
            </Card>
          </Section>

          <Section title="Aparência">
            <Card className="space-y-3">
              <Segmented label="Tema" value={settings.theme} options={[{ value: 'dark', label: 'Escuro' }, { value: 'light', label: 'Claro rosado' }]} onChange={(v) => void saveSettings({ theme: v })} />
              <div className="flex justify-between items-center">
                <span>Caracteres por linha na folha de redação</span>
                <Stepper label="caracteres por linha" value={settings.charsPerLine} min={50} max={110} step={2} onChange={(v) => void saveSettings({ charsPerLine: v })} />
              </div>
              <p className="text-xs text-muted">O tamanho do texto segue o tamanho de fonte do sistema.</p>
            </Card>
          </Section>
        </div>

        <div>
          <Section title="Planejador (avançado)">
            <Card className="space-y-2 text-sm">
              {(
                [
                  ['minBlock', 'Bloco mínimo (min)', 15, 40, 5],
                  ['maxBlock', 'Bloco máximo (min)', 30, 90, 5],
                  ['essayEveryDays', 'Redação a cada (dias)', 1, 7, 1],
                  ['essayMinutes', 'Duração do treino de redação (min)', 30, 120, 10],
                  ['staleDays', 'Revisar tópico parado após (dias)', 3, 21, 1],
                  ['finalWeekDays', 'Reta final (dias antes)', 3, 14, 1],
                  ['rotationMinMinutes', 'Rotação de matérias menores a partir de (min/dia)', 50, 300, 10],
                ] as const
              ).map(([k, label, min, max, step]) => (
                <div key={k} className="flex justify-between items-center gap-2">
                  <span>{label}</span>
                  <Stepper label={label} value={p[k] as number} min={min} max={max} step={step} onChange={(v) => setParam(k, v)} />
                </div>
              ))}
              <button className="btn-text" onClick={() => void saveSettings({ plannerParams: {} })}>Restaurar padrões</button>
              <p className="text-xs text-muted">Valor do tópico ≈ (pontos da disciplina ÷ nº de tópicos) × frequência × (1 − domínio/5) + bônus de revisão. Pisos: Matemática e Física a cada 3 dias, Português a cada 5, redação conforme acima.</p>
            </Card>
          </Section>

          <Section title="Conta e sincronização">
            <Card className="space-y-3">
              {!supabaseConfigured && <p className="text-sm text-muted">Supabase não configurado neste build (veja o README). Os dados ficam só neste aparelho.</p>}
              {auth === 'signedIn' && (
                <>
                  <p className="text-sm">
                    Conectada como <strong>{session?.user.email}</strong>
                  </p>
                  <p className="text-sm text-muted">
                    Estado: {sync.state} · pendências: {sync.pending}
                    {sync.lastSync && ` · última: ${new Date(sync.lastSync).toLocaleTimeString('pt-BR')}`}
                  </p>
                  {sync.error && <p className="text-sm text-warn">{sync.error}</p>}
                  <div className="flex gap-2 flex-wrap">
                    <button className="btn-ghost" onClick={() => void engine.sync()}>
                      <Icon name="sync" /> Sincronizar agora
                    </button>
                    <button className="btn-text" onClick={() => void engine.resetCursors().then(() => engine.sync())}>Baixar tudo de novo</button>
                    <button className="btn-text" onClick={() => void signOut()}>Sair</button>
                  </div>
                </>
              )}
              {auth === 'local' && supabaseConfigured && (
                <button className="btn-ghost" onClick={() => void db.meta.put({ key: 'localMode', value: false }).then(() => location.reload())}>
                  Entrar para sincronizar
                </button>
              )}
            </Card>
          </Section>

          <Section title="Dados">
            <Card className="space-y-2">
              <button
                className="btn-ghost w-full"
                onClick={async () => {
                  const where = await saveTextFile(`go-julls-backup-${dayKey()}.json`, await exportJson(db));
                  toast(`Backup salvo em ${where}`);
                }}
              >
                <Icon name="download" /> Exportar backup (JSON)
              </button>
              <button
                className="btn-ghost w-full"
                onClick={async () => {
                  const c = await exportCsv(db);
                  await saveTextFile(`go-julls-sessoes-${dayKey()}.csv`, c.sessions, 'text/csv');
                  await saveTextFile(`go-julls-questoes-${dayKey()}.csv`, c.attempts, 'text/csv');
                  const where = await saveTextFile(`go-julls-erros-${dayKey()}.csv`, c.errors, 'text/csv');
                  toast(`CSVs salvos (${where.replace(/[^/]+$/, '')})`);
                }}
              >
                <Icon name="download" /> Exportar CSV (sessões, questões, erros)
              </button>
              <button
                className="btn-ghost w-full"
                onClick={async () => {
                  const txt = await pickTextFile();
                  if (!txt) return;
                  try {
                    const r = await importJson(db, txt);
                    toast(`Importado: ${r.applied} registros (${r.skipped} já estavam atualizados)`);
                  } catch (e) {
                    toast(e instanceof Error ? e.message : 'Falha ao importar');
                  }
                }}
              >
                <Icon name="upload" /> Importar backup
              </button>
              <p className="text-xs text-muted">No Android os arquivos vão para Documentos/GoJulls. Com a conta conectada, trocar de aparelho é só fazer login.</p>
            </Card>
          </Section>

          <Section title="Modo Aluna CEDERJ">
            <Card>
              <Toggle label="Ativar (para depois do resultado)" checked={settings.studentMode} onChange={(v) => void saveSettings({ studentMode: v })} />
            </Card>
          </Section>

          <Section title="Sobre">
            <Card className="space-y-2 text-sm">
              <p>Go, Julls! v{APP_VERSION}</p>
              <button className="btn-ghost" onClick={async () => toast((await checkForUpdate()) ? 'Tem versão nova! Veja na tela Hoje.' : 'Você está na versão mais recente (ou sem internet).')}>
                Verificar atualização
              </button>
              <p className="text-xs text-muted">Sem rastreadores e sem anúncios. Dados no aparelho e na sua conta Supabase.</p>
            </Card>
          </Section>
        </div>
      </div>
    </Page>
  );
}
