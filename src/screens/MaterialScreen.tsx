import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { repo } from '../db/repo';
import type { MockExam, Question } from '../db/types';
import { useApp } from '../app/AppContext';
import { MATERIALS, materialQuestions, theoryOnly, type Material } from '../data/materials';
import { SUBJECT_NAMES, SUBJECT_POINTS, fmt } from '../core/exam';
import { dayKey } from '../core/dates';
import { mdToHtml } from '../pdf/md';
import { buildDocument, type Tema } from '../pdf/template';
import { printHtml } from '../pdf/print';
import { Card, Empty, Icon, Page, Section, Segmented } from '../ui/kit';

/** Copia os exercícios do material para o banco (ids fixos: repetir não duplica). */
export async function importMaterialQuestions(m: Material): Promise<Question[]> {
  const out: Question[] = [];
  for (const q of materialQuestions(m.body)) {
    if (!q.answer || !m.subject) continue;
    const row = {
      id: `q-mat-${m.id}-${String(q.number).padStart(2, '0')}`,
      subject: m.subject,
      topicId: m.topicos[0] ?? null,
      statement: q.statement,
      options: q.options,
      answer: q.answer,
      solution: q.solution,
      source: 'material',
      examId: `material-${m.id}`,
      examName: `Material: ${m.titulo}`,
      number: q.number,
    };
    const cur = await db.questions.get(row.id);
    // só regrava se o material mudou (evita gerar sincronização à toa)
    if (!cur || cur.deleted || cur.statement !== row.statement || cur.answer !== row.answer || cur.solution !== row.solution) {
      out.push(await repo.put<Question>('questions', row as Question));
    } else out.push(cur);
  }
  return out;
}

export function materialDoc(m: Material, tema: Tema): string {
  return buildDocument(
    {
      titulo: m.titulo,
      subtitulo: m.subtitulo,
      disciplina: m.disciplina ?? (m.subject ? SUBJECT_NAMES[m.subject] : undefined),
      pontos: m.subject ? fmt(SUBJECT_POINTS[m.subject]) : undefined,
      frequencia: m.frequencia,
      tempo: m.tempo,
    },
    mdToHtml(m.body),
    tema,
  );
}

export default function MaterialScreen() {
  const { id } = useParams();
  const nav = useNavigate();
  const { toast } = useApp();
  const m = MATERIALS.find((x) => x.id === id);
  const topics = useLiveQuery(() => db.topics.toArray(), []) ?? [];
  const [tab, setTab] = useState<'teoria' | 'completo'>('teoria');
  const [tema, setTema] = useState<Tema>('claro');
  const [busy, setBusy] = useState(false);

  const html = useMemo(() => (m ? DOMPurify.sanitize(mdToHtml(tab === 'teoria' ? theoryOnly(m.body) : m.body)) : ''), [m, tab]);

  if (!m) return <Page title="Material" back={() => nav(-1)}><Empty>Material não encontrado.</Empty></Page>;
  const nq = materialQuestions(m.body).length;

  const pdf = async () => {
    const how = await printHtml(materialDoc(m, tema), `go-julls-${m.id}${tema === 'escuro' ? '-escuro' : ''}`);
    toast(how === 'html' ? 'HTML salvo em Documentos/GoJulls.' : 'Escolha "Salvar como PDF".');
  };

  const practice = async () => {
    setBusy(true);
    await importMaterialQuestions(m);
    setBusy(false);
    nav(`/questoes/praticar?exam=material-${m.id}`);
  };

  /** Fez no papel: cria a lista na ordem do material e abre a correção pelo número. */
  const gradePaper = async () => {
    setBusy(true);
    const qs = await importMaterialQuestions(m);
    const list = await repo.put<MockExam>('mock_exams', {
      kind: 'lista',
      title: `Exercícios — ${m.titulo}`,
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
    setBusy(false);
    nav(`/listas/${list.id}`);
  };

  return (
    <Page title={m.titulo} back={() => nav(-1)}>
      <Card className="mb-4">
        {m.subtitulo && <p className="text-muted">{m.subtitulo}</p>}
        <div className="flex flex-wrap gap-2 mt-2 text-sm">
          {m.subject && <span className="chip">{SUBJECT_NAMES[m.subject]} · {fmt(SUBJECT_POINTS[m.subject])} pts</span>}
          {m.tempo && <span className="chip">{m.tempo}</span>}
          {m.rapida && <span className="chip">revisão rápida: visão geral, sem aprofundar cada tópico</span>}
          <span className="chip">{nq} exercícios com gabarito</span>
        </div>
        {m.topicos.length > 1 && (
          <p className="text-xs text-muted mt-2">
            Cobre: {m.topicos.map((t) => topics.find((x) => x.id === t)?.name ?? t).join(' · ')}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <button className="btn-primary flex-1 min-w-[140px]" onClick={() => void pdf()}>
            <Icon name="download" /> Gerar PDF
          </button>
          <Segmented label="Tema do PDF" value={tema} onChange={setTema} options={[{ value: 'claro', label: 'Claro' }, { value: 'escuro', label: 'Escuro' }]} />
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <button className="btn-ghost" disabled={busy || !nq} onClick={() => void practice()}>
            <Icon name="quiz" /> Praticar
          </button>
          <button className="btn-ghost" disabled={busy || !nq} onClick={() => void gradePaper()}>
            <Icon name="check" /> Corrigir (papel)
          </button>
        </div>
        <p className="text-xs text-muted mt-2">“Praticar”: responde no app. “Corrigir (papel)”: resolveu no PDF impresso? Diga pelo número o que errou; as erradas vão para o banco de erros.</p>
      </Card>

      <Segmented label="Parte" value={tab} onChange={setTab} options={[{ value: 'teoria', label: 'Só a teoria' }, { value: 'completo', label: 'Completo (com exercícios e gabarito)' }]} />
      <Card className="mt-4">
        <div className="md leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />
      </Card>
    </Page>
  );
}

/** Lista de todos os materiais da biblioteca. */
export function MaterialsIndex() {
  const nav = useNavigate();
  const groups = useMemo(() => {
    const g = new Map<string, Material[]>();
    for (const m of MATERIALS) {
      const k = m.subject ? SUBJECT_NAMES[m.subject] : 'Outros';
      g.set(k, [...(g.get(k) ?? []), m]);
    }
    return [...g.entries()];
  }, []);
  return (
    <Page title="Biblioteca" back={() => nav(-1)}>
      <p className="text-sm text-muted mb-4">Materiais completos escritos com a skill Go, Julls!: leia no app, gere o PDF e pratique os exercícios. Funciona offline.</p>
      {groups.length === 0 && <Empty>Nenhum material ainda.</Empty>}
      {groups.map(([name, list]) => (
        <Section key={name} title={name}>
          <div className="grid tab:grid-cols-2 gap-2">
            {list.map((m) => (
              <Link key={m.id} to={`/material/${m.id}`} className="card !p-3">
                <p className="font-semibold">{m.titulo}</p>
                {m.rapida && <span className="chip text-xs mt-1">revisão rápida da disciplina</span>}
                {m.subtitulo && <p className="text-xs text-muted line-clamp-2">{m.subtitulo}</p>}
              </Link>
            ))}
          </div>
        </Section>
      ))}
    </Page>
  );
}
