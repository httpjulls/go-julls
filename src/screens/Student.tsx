import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { repo } from '../db/repo';
import type { StudentConfig, StudentCourse, StudentEvent } from '../db/types';
import { useApp } from '../app/AppContext';
import { neededGrade, weightedAverage } from '../core/student';
import { dayKey, diffDays, formatDay } from '../core/dates';
import { Card, Empty, Icon, Page, Section, Segmented, cx } from '../ui/kit';

const EMPTY_CONFIG: StudentConfig = {
  components: [
    { key: 'ad1', label: 'AD1', weight: 1 },
    { key: 'ad2', label: 'AD2', weight: 1 },
    { key: 'ap1', label: 'AP1', weight: 1 },
    { key: 'ap2', label: 'AP2', weight: 1 },
  ],
  passGrade: null,
  notes: '',
};

export default function Student() {
  const { settings, saveSettings, today } = useApp();
  const courses = (useLiveQuery(() => db.student_courses.toArray(), []) ?? []).filter((c) => !c.deleted);
  const events = (useLiveQuery(() => db.student_events.orderBy('date').toArray(), []) ?? []).filter((e) => !e.deleted);
  const [tab, setTab] = useState<'disciplinas' | 'calendario' | 'regras'>('disciplinas');
  const [newCourse, setNewCourse] = useState('');
  const [ev, setEv] = useState<{ title: string; date: string; type: StudentEvent['type']; courseId: string }>({ title: '', date: today, type: 'AD', courseId: '' });
  if (!settings) return null;
  const cfg = settings.student ?? EMPTY_CONFIG;
  const setCfg = (patch: Partial<StudentConfig>) => void saveSettings({ student: { ...cfg, ...patch } });
  const configured = cfg.passGrade !== null;

  return (
    <Page title="Aluna CEDERJ">
      {!configured && (
        <Card className="mb-4 border-warn/60 flex gap-3">
          <Icon name="alert" className="text-warn shrink-0" label="Atenção" />
          <p className="text-sm">
            Configure a fórmula da média e a nota de aprovação conforme o <strong>regulamento oficial do seu curso</strong> (aba Regras). O app não inventa regras: os pesos abaixo são só um ponto de partida.
          </p>
        </Card>
      )}
      <Segmented label="Seção" value={tab} onChange={setTab} options={[{ value: 'disciplinas', label: 'Disciplinas e notas' }, { value: 'calendario', label: 'AD e AP' }, { value: 'regras', label: 'Regras' }]} />

      {tab === 'disciplinas' && (
        <div className="mt-4 space-y-3">
          <div className="flex gap-2">
            <input className="input" placeholder="Nova disciplina (ex.: Cálculo I)" value={newCourse} onChange={(e) => setNewCourse(e.target.value)} />
            <button
              className="btn-primary"
              aria-label="Adicionar disciplina"
              onClick={() => newCourse.trim() && void repo.put<StudentCourse>('student_courses', { name: newCourse.trim(), period: '', grades: {} }).then(() => setNewCourse(''))}
            >
              <Icon name="plus" />
            </button>
          </div>
          {courses.length === 0 && <Empty>Adicione as disciplinas do período.</Empty>}
          {courses.map((c) => (
            <CourseCard key={c.id} course={c} cfg={cfg} />
          ))}
        </div>
      )}

      {tab === 'calendario' && (
        <div className="mt-4 space-y-3">
          <Card className="space-y-2">
            <input className="input" placeholder="Título (ex.: AP1 Cálculo I)" value={ev.title} onChange={(e) => setEv({ ...ev, title: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input type="date" className="input" value={ev.date} onChange={(e) => setEv({ ...ev, date: e.target.value })} aria-label="Data" />
              <select className="input" value={ev.type} onChange={(e) => setEv({ ...ev, type: e.target.value as StudentEvent['type'] })} aria-label="Tipo">
                <option value="AD">AD (a distância)</option>
                <option value="AP">AP (presencial)</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <select className="input" value={ev.courseId} onChange={(e) => setEv({ ...ev, courseId: e.target.value })} aria-label="Disciplina">
              <option value="">Disciplina…</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button
              className="btn-primary w-full"
              onClick={() => ev.title.trim() && void repo.put<StudentEvent>('student_events', { title: ev.title.trim(), date: ev.date, type: ev.type, courseId: ev.courseId || null, done: false }).then(() => setEv({ ...ev, title: '' }))}
            >
              Adicionar
            </button>
          </Card>
          {events.length === 0 && <Empty>Cadastre as datas de AD e AP do calendário acadêmico.</Empty>}
          <ul className="space-y-2">
            {events.map((e) => {
              const d = diffDays(dayKey(), e.date);
              return (
                <li key={e.id}>
                  <Card className={cx('!p-3 flex items-center gap-3', e.done && 'opacity-60')}>
                    <button className="btn-ghost w-12 px-0" aria-label={e.done ? 'Marcar como pendente' : 'Marcar como feito'} onClick={() => void repo.update<StudentEvent>('student_events', e.id, { done: !e.done })}>
                      {e.done ? <Icon name="check" /> : e.type}
                    </button>
                    <div className="flex-1">
                      <p className="font-semibold">{e.title}</p>
                      <p className="text-xs text-muted">
                        {formatDay(e.date, { weekday: 'short', day: '2-digit', month: '2-digit' })}
                        {!e.done && d >= 0 && ` · em ${d} dias`}
                        {e.courseId && ` · ${courses.find((c) => c.id === e.courseId)?.name ?? ''}`}
                      </p>
                    </div>
                    <button className="btn-text" aria-label="Excluir" onClick={() => void repo.remove('student_events', e.id)}>
                      <Icon name="trash" size={18} />
                    </button>
                  </Card>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {tab === 'regras' && (
        <div className="mt-4 space-y-3">
          <Section title="Componentes da média e pesos">
            <Card className="space-y-2">
              {cfg.components.map((c, i) => (
                <div key={c.key} className="flex gap-2 items-center">
                  <input className="input" value={c.label} onChange={(e) => setCfg({ components: cfg.components.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} aria-label="Nome do componente" />
                  <input
                    className="input w-24"
                    type="number"
                    step="0.1"
                    min="0"
                    value={c.weight}
                    onChange={(e) => setCfg({ components: cfg.components.map((x, j) => (j === i ? { ...x, weight: Number(e.target.value) } : x)) })}
                    aria-label={`Peso de ${c.label}`}
                  />
                  <button className="btn-text" aria-label="Remover" onClick={() => setCfg({ components: cfg.components.filter((_, j) => j !== i) })}>
                    <Icon name="x" />
                  </button>
                </div>
              ))}
              <button className="btn-ghost w-full" onClick={() => setCfg({ components: [...cfg.components, { key: `c${Date.now()}`, label: 'Nova', weight: 1 }] })}>
                <Icon name="plus" /> Componente
              </button>
            </Card>
          </Section>
          <Section title="Média de aprovação">
            <Card>
              <input
                className="input"
                type="number"
                step="0.1"
                placeholder="Preencha conforme o regulamento"
                value={cfg.passGrade ?? ''}
                onChange={(e) => setCfg({ passGrade: e.target.value === '' ? null : Number(e.target.value) })}
              />
            </Card>
          </Section>
          <Section title="Anotações do regulamento">
            <Card>
              <textarea className="input min-h-[140px]" placeholder="Cole aqui as regras oficiais (AP3, recuperação, frequência etc.)" value={cfg.notes} onChange={(e) => setCfg({ notes: e.target.value })} />
            </Card>
          </Section>
        </div>
      )}
    </Page>
  );
}

function CourseCard({ course, cfg }: { course: StudentCourse; cfg: StudentConfig }) {
  const [missing, setMissing] = useState(cfg.components[cfg.components.length - 1]?.key ?? '');
  const avg = weightedAverage(cfg.components, course.grades);
  const target = cfg.passGrade;
  const need = target !== null ? neededGrade(cfg.components, course.grades, missing, target) : null;
  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="font-bold flex-1">{course.name}</p>
        <span className="text-2xl font-black text-accent tabular-nums">{avg === null ? '—' : avg.toFixed(1)}</span>
        <button className="btn-text" aria-label="Excluir disciplina" onClick={() => void repo.remove('student_courses', course.id)}>
          <Icon name="trash" size={18} />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {cfg.components.map((c) => (
          <label key={c.key} className="text-xs text-muted">
            {c.label}
            <input
              className="input mt-1 text-center"
              type="number"
              step="0.1"
              inputMode="decimal"
              value={course.grades[c.key] ?? ''}
              onChange={(e) => void repo.update<StudentCourse>('student_courses', course.id, { grades: { ...course.grades, [c.key]: e.target.value === '' ? null : Number(e.target.value) } })}
            />
          </label>
        ))}
      </div>
      {target !== null && (
        <div className="text-sm bg-elevated rounded-xl p-3">
          <div className="flex items-center gap-2 flex-wrap">
            Quanto preciso tirar em
            <select className="input !min-h-[40px] w-auto py-1" value={missing} onChange={(e) => setMissing(e.target.value)} aria-label="Componente">
              {cfg.components.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            para média {target}?
          </div>
          <p className="mt-2 font-bold">{need === null ? 'Preencha as outras notas.' : need <= 0 ? 'Já está garantido!' : `${need.toFixed(1)}`}</p>
        </div>
      )}
    </Card>
  );
}
