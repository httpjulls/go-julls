import { useEffect, useMemo, useState } from 'react';
import { Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { repo } from '../db/repo';
import type { Essay as EssayRow, EssayTheme, Repertoire } from '../db/types';
import { useApp } from '../app/AppContext';
import { cheer, completeStudy } from '../app/actions';
import { countLines, lineStatus } from '../core/lines';
import { EXAM } from '../core/exam';
import { dayKey, formatDay } from '../core/dates';
import { Bar, Card, Empty, Icon, Page, Section, Segmented, Sheet, Stepper, cx } from '../ui/kit';
import { buzz, keepAwake } from '../native/native';

export const CHECKLIST: { key: 'formais' | 'textuais' | 'discursivos'; items: { id: string; label: string }[] }[] = [
  {
    key: 'formais',
    items: [
      { id: 'f-grafia', label: 'Grafia, maiúsculas, hífen e acentuação' },
      { id: 'f-concordancia', label: 'Concordância nominal e verbal' },
      { id: 'f-regencia', label: 'Regência verbal e nominal (e crase)' },
      { id: 'f-colocacao', label: 'Colocação pronominal' },
      { id: 'f-tempos', label: 'Correlação entre tempos verbais' },
      { id: 'f-registro', label: 'Vocabulário adequado ao registro formal' },
    ],
  },
  {
    key: 'textuais',
    items: [
      { id: 't-pontuacao', label: 'Pontuação' },
      { id: 't-paragrafos', label: 'Paragrafação' },
      { id: 't-periodo', label: 'Estrutura interna dos períodos' },
      { id: 't-conectivos', label: 'Conectivos entre frases e parágrafos' },
      { id: 't-referencia', label: 'Referenciação (pronomes, sinônimos) sem repetição' },
    ],
  },
  {
    key: 'discursivos',
    items: [
      { id: 'd-tema', label: 'Adequação ao tema proposto' },
      { id: 'd-tipo', label: 'Texto dissertativo-argumentativo em prosa' },
      { id: 'd-coerencia', label: 'Coerência interna e externa' },
      { id: 'd-progressao', label: 'Progressão temática' },
      { id: 'd-clareza', label: 'Concisão e clareza' },
      { id: 'd-argumentos', label: 'Aprofundamento dos argumentos (repertório)' },
    ],
  },
];

export const ZERO_FLAGS = [
  { id: 'fuga', label: 'Fugiu do tema ou do tipo dissertativo-argumentativo' },
  { id: 'identificacao', label: 'Tem identificação (nome, assinatura, apelido)' },
  { id: 'termos', label: 'Termos inadequados (ofensas, preces, pedidos etc.)' },
  { id: 'ilegivel', label: 'Letra ilegível na maior parte' },
];

const CRIT_LABEL = { formais: 'Formais (30)', textuais: 'Textuais (30)', discursivos: 'Discursivos (40)' };

export default function Essay() {
  return (
    <Routes>
      <Route index element={<Home />} />
      <Route path="nova" element={<Editor />} />
      <Route path=":id" element={<Editor />} />
    </Routes>
  );
}

const total = (e: EssayRow) => (e.scores ? e.scores.formais + e.scores.textuais + e.scores.discursivos : null);

function Home() {
  const nav = useNavigate();
  const [tab, setTab] = useState<'historico' | 'temas' | 'repertorio'>('historico');
  const essays = (useLiveQuery(() => db.essays.orderBy('day').reverse().toArray(), []) ?? []).filter((e) => !e.deleted);
  return (
    <Page title="Redação" actions={<button className="btn-primary" onClick={() => nav('/redacao/nova')}><Icon name="pen" /> Escrever</button>}>
      <Card className="mb-4 text-sm">
        <p>
          Vale <strong className="text-accent">37 dos 100 pontos</strong>. Dissertativo-argumentativo, registro formal, <strong>20 a 25 linhas</strong>. Menos de 20 linhas, fuga ao tema ou identificação = zero (edital 8.2.1), e
          zero elimina (6.3.6).
        </p>
      </Card>
      <Segmented
        label="Seção"
        value={tab}
        onChange={setTab}
        options={[{ value: 'historico', label: `Histórico (${essays.length})` }, { value: 'temas', label: 'Temas' }, { value: 'repertorio', label: 'Repertório' }]}
      />
      <div className="mt-4">
        {tab === 'historico' && <History essays={essays} />}
        {tab === 'temas' && <Themes />}
        {tab === 'repertorio' && <RepertoireBank />}
      </div>
    </Page>
  );
}

function History({ essays }: { essays: EssayRow[] }) {
  const nav = useNavigate();
  const graded = essays.filter((e) => e.scores).slice().reverse();
  if (!essays.length) return <Empty>Nenhuma redação ainda. A primeira é a mais difícil. Go, Julls!</Empty>;
  return (
    <div className="space-y-4">
      {graded.length > 1 && (
        <Card>
          <p className="label">Evolução (autoavaliação, 0–100)</p>
          <div className="flex items-end gap-1 h-24">
            {graded.slice(-15).map((e) => (
              <div key={e.id} className="flex-1 bg-pink/80 rounded-t" style={{ height: `${Math.max(3, total(e)!)}%` }} title={`${formatDay(e.day)}: ${total(e)}`} />
            ))}
          </div>
        </Card>
      )}
      <ul className="space-y-2">
        {essays.map((e) => {
          const t = total(e);
          return (
            <li key={e.id}>
              <button className="card !p-3 w-full text-left flex items-center gap-3" onClick={() => nav(`/redacao/${e.id}`)}>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{e.theme || 'Sem tema'}</p>
                  <p className="text-xs text-muted">
                    {formatDay(e.day)} · {e.lines} linhas · {e.minutes} min{e.zeroFlags.length > 0 && ' · risco de zero'}
                  </p>
                </div>
                <span className={cx('text-xl font-black tabular-nums', t === null ? 'text-muted' : 'text-accent')}>{t === null ? '—' : t}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Themes() {
  const nav = useNavigate();
  const themes = (useLiveQuery(() => db.essay_themes.toArray(), []) ?? []).filter((t) => !t.deleted);
  const [editing, setEditing] = useState<Partial<EssayTheme> | null>(null);
  return (
    <div>
      <p className="text-sm text-muted mb-3">Os eixos são sugestões para pesquisar; cadastre os temas exatos que você quer treinar (atualidades).</p>
      <button className="btn-ghost w-full mb-3" onClick={() => setEditing({ title: '', axis: '', notes: '' })}>
        <Icon name="plus" /> Novo tema
      </button>
      <ul className="space-y-2">
        {themes.map((t) => (
          <li key={t.id}>
            <Card className="!p-3">
              <div className="flex gap-2 items-start">
                <div className="flex-1">
                  <p className={cx('font-semibold', t.used && 'text-muted')}>{t.title}</p>
                  {t.notes && <p className="text-sm text-muted mt-1">{t.notes}</p>}
                </div>
                <button className="btn-text" aria-label="Editar tema" onClick={() => setEditing(t)}>
                  <Icon name="edit" size={18} />
                </button>
              </div>
              <button className="btn-primary mt-2" onClick={() => nav(`/redacao/nova?theme=${t.id}`)}>
                <Icon name="pen" size={18} /> Escrever sobre este
              </button>
            </Card>
          </li>
        ))}
      </ul>
      <ThemeSheet value={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function ThemeSheet({ value, onClose }: { value: Partial<EssayTheme> | null; onClose: () => void }) {
  const [v, setV] = useState<Partial<EssayTheme>>({});
  useEffect(() => setV(value ?? {}), [value]);
  if (!value) return null;
  const save = async () => {
    if (!v.title?.trim()) return;
    if (v.id) await repo.update<EssayTheme>('essay_themes', v.id, { title: v.title, axis: v.axis ?? '', notes: v.notes ?? '' });
    else await repo.put<EssayTheme>('essay_themes', { title: v.title, axis: v.axis ?? '', notes: v.notes ?? '', used: false });
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title={v.id ? 'Editar tema' : 'Novo tema'}>
      <div className="space-y-3">
        <input className="input" placeholder="Tema (ex.: Os desafios da mobilidade urbana no Brasil)" value={v.title ?? ''} onChange={(e) => setV({ ...v, title: e.target.value })} />
        <input className="input" placeholder="Eixo (ex.: Cidades)" value={v.axis ?? ''} onChange={(e) => setV({ ...v, axis: e.target.value })} />
        <textarea className="input min-h-[90px]" placeholder="Notas, ideias de argumentos, fontes" value={v.notes ?? ''} onChange={(e) => setV({ ...v, notes: e.target.value })} />
        <button className="btn-primary w-full" onClick={() => void save()}>Salvar</button>
        {v.id && <button className="btn-text text-warn" onClick={() => void repo.remove('essay_themes', v.id!).then(onClose)}><Icon name="trash" size={18} /> Excluir</button>}
      </div>
    </Sheet>
  );
}

const REP_KINDS = [
  { value: 'citacao', label: 'Citação' },
  { value: 'dado', label: 'Dado' },
  { value: 'fato', label: 'Fato' },
  { value: 'obra', label: 'Obra' },
] as const;

function RepertoireBank() {
  const items = (useLiveQuery(() => db.repertoire.toArray(), []) ?? []).filter((x) => !x.deleted);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Partial<Repertoire> | null>(null);
  const list = items.filter((x) => !q || (x.text + x.source + x.axis).toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <p className="text-sm text-muted mb-3">Citações, dados, fatos e obras com fonte, para aprofundar argumentos. Sempre anote de onde veio.</p>
      <div className="flex gap-2 mb-3">
        <input className="input" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar repertório" />
        <button className="btn-primary" aria-label="Novo repertório" onClick={() => setEditing({ kind: 'dado' })}>
          <Icon name="plus" />
        </button>
      </div>
      {list.length === 0 && <Empty>Nenhum repertório ainda.</Empty>}
      <ul className="space-y-2">
        {list.map((r) => (
          <li key={r.id}>
            <button className="card !p-3 w-full text-left" onClick={() => setEditing(r)}>
              <p className="text-xs text-accent font-semibold">
                {REP_KINDS.find((k) => k.value === r.kind)?.label}
                {r.axis && ` · ${r.axis}`}
              </p>
              <p className="mt-1">{r.text}</p>
              <p className="text-xs text-muted mt-1">Fonte: {r.source || '— (anote a fonte!)'}</p>
            </button>
          </li>
        ))}
      </ul>
      <RepSheet value={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function RepSheet({ value, onClose }: { value: Partial<Repertoire> | null; onClose: () => void }) {
  const [v, setV] = useState<Partial<Repertoire>>({});
  useEffect(() => setV(value ?? {}), [value]);
  if (!value) return null;
  const save = async () => {
    if (!v.text?.trim()) return;
    const row = { kind: v.kind ?? 'dado', text: v.text, source: v.source ?? '', axis: v.axis ?? '' };
    if (v.id) await repo.update<Repertoire>('repertoire', v.id, row);
    else await repo.put<Repertoire>('repertoire', row);
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title={v.id ? 'Editar repertório' : 'Novo repertório'}>
      <div className="space-y-3">
        <Segmented label="Tipo" value={(v.kind ?? 'dado') as Repertoire['kind']} options={REP_KINDS.map((k) => ({ ...k }))} onChange={(k) => setV({ ...v, kind: k })} />
        <textarea className="input min-h-[100px]" placeholder="Texto" value={v.text ?? ''} onChange={(e) => setV({ ...v, text: e.target.value })} />
        <input className="input" placeholder="Fonte (autor, obra, instituição, ano)" value={v.source ?? ''} onChange={(e) => setV({ ...v, source: e.target.value })} />
        <input className="input" placeholder="Eixo temático" value={v.axis ?? ''} onChange={(e) => setV({ ...v, axis: e.target.value })} />
        <button className="btn-primary w-full" onClick={() => void save()}>Salvar</button>
        {v.id && <button className="btn-text text-warn" onClick={() => void repo.remove('repertoire', v.id!).then(onClose)}><Icon name="trash" size={18} /> Excluir</button>}
      </div>
    </Sheet>
  );
}

const DRAFT_KEY = 'gojulls-essay-draft';

function Editor() {
  const { settings, toast } = useApp();
  const { id } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const existing = useLiveQuery(() => (id ? db.essays.get(id) : undefined), [id]);
  const themes = (useLiveQuery(() => db.essay_themes.toArray(), []) ?? []).filter((t) => !t.deleted);
  const planId = params.get('plan');
  const mockId = params.get('mock');
  const targetMin = Number(params.get('min')) || 60;

  const [theme, setTheme] = useState('');
  const [themeId, setThemeId] = useState<string | null>(params.get('theme'));
  const [text, setText] = useState('');
  const [startedAt] = useState(Date.now());
  const [now, setNow] = useState(Date.now());
  const [stage, setStage] = useState<'escrever' | 'avaliar'>('escrever');
  const [scores, setScores] = useState({ formais: 20, textuais: 20, discursivos: 25 });
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [flags, setFlags] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) return;
    if (id && existing) {
      setTheme(existing.theme);
      setThemeId(existing.themeId);
      setText(existing.text);
      if (existing.scores) setScores(existing.scores);
      setChecklist(existing.checklist);
      setFlags(existing.zeroFlags.filter((f) => f !== 'linhas'));
      setStage('avaliar');
      setLoaded(true);
    } else if (!id) {
      try {
        const d = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null');
        if (d?.text) {
          setText(d.text);
          setTheme(d.theme ?? '');
        }
      } catch {
        /* sem rascunho */
      }
      setLoaded(true);
    }
  }, [id, existing, loaded]);

  useEffect(() => {
    const t = themes.find((x) => x.id === themeId);
    if (t && !theme) setTheme(t.title.replace(/^Eixo: /, ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeId, themes.length]);

  useEffect(() => {
    if (id || stage !== 'escrever') return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    void keepAwake(true);
    return () => {
      clearInterval(t);
      void keepAwake(false);
    };
  }, [id, stage]);

  useEffect(() => {
    if (id) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ text, theme }));
    } catch {
      /* ignora */
    }
  }, [text, theme, id]);

  const cpl = settings?.charsPerLine ?? 78;
  const lines = useMemo(() => countLines(text, cpl), [text, cpl]);
  const status = lineStatus(lines, EXAM.essayMinLines, EXAM.essayMaxLines);
  const [alerted, setAlerted] = useState({ a20: false, a25: false });
  useEffect(() => {
    if (lines >= 20 && !alerted.a20) {
      setAlerted((a) => ({ ...a, a20: true }));
      void buzz();
      toast('20 linhas: mínimo atingido!');
    }
    if (lines >= 25 && !alerted.a25) {
      setAlerted((a) => ({ ...a, a25: true }));
      void buzz('done');
      toast('25 linhas: limite da folha!');
    }
  }, [lines, alerted, toast]);

  const elapsedMin = Math.floor((now - startedAt) / 60000);
  const leftMs = targetMin * 60000 - (now - startedAt);
  const clock = (ms: number) => {
    const s = Math.max(0, Math.floor(Math.abs(ms) / 1000));
    return `${ms < 0 ? '+' : ''}${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };

  const zeroFlags = [...flags, ...(lines < EXAM.essayMinLines ? ['linhas'] : [])];
  const sum = scores.formais + scores.textuais + scores.discursivos;

  const save = async () => {
    const row = {
      themeId,
      theme: theme.trim(),
      text,
      lines,
      minutes: id && existing ? existing.minutes : Math.max(1, elapsedMin),
      day: id && existing ? existing.day : dayKey(),
      scores: zeroFlags.length ? { formais: 0, textuais: 0, discursivos: 0 } : scores,
      checklist,
      zeroFlags,
    };
    if (id) await repo.update<EssayRow>('essays', id, row);
    else {
      const saved = await repo.put<EssayRow>('essays', row);
      if (mockId) await repo.update('mock_exams', mockId, { essayId: saved.id, essayScore: row.scores.formais + row.scores.textuais + row.scores.discursivos } as never);
      if (themeId) await repo.update<EssayTheme>('essay_themes', themeId, { used: true });
      if (!mockId) await completeStudy({ topicId: null, subject: 'red', minutes: row.minutes, kind: 'essay', planItemId: planId ?? undefined, startedAt: new Date(startedAt).toISOString() });
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignora */
      }
    }
    toast(zeroFlags.length ? 'Salva. Atenção aos motivos de zero!' : cheer());
    nav(mockId ? `/simulado/${mockId}` : '/redacao');
  };

  return (
    <Page title={id ? 'Redação' : 'Nova redação'} back={() => nav('/redacao')}>
      {stage === 'escrever' ? (
        <div className="tab:grid tab:grid-cols-[1fr_280px] tab:gap-6">
          <div>
            <div className="flex gap-2 mb-3">
              <input className="input" placeholder="Tema" value={theme} onChange={(e) => setTheme(e.target.value)} aria-label="Tema" list="temas" />
              <datalist id="temas">
                {themes.map((t) => (
                  <option key={t.id} value={t.title.replace(/^Eixo: /, '')} />
                ))}
              </datalist>
            </div>
            <div className="sticky top-0 z-10 bg-bg py-2 flex items-center gap-2 flex-wrap">
              <span className={cx('chip font-bold tabular-nums', status === 'curta' && 'text-warn', status === 'excedeu' && 'text-warn', (status === 'ok' || status === 'limite') && 'text-accent')}>
                {status === 'ok' || status === 'limite' ? <Icon name="check" size={14} /> : <Icon name="alert" size={14} />}
                {lines}/25 linhas
              </span>
              {status === 'curta' && <span className="text-xs text-warn">mínimo 20</span>}
              {status === 'excedeu' && <span className="text-xs text-warn">passou de 25: corte!</span>}
              <span className={cx('chip tabular-nums ml-auto', leftMs < 0 && 'text-warn')} aria-label="Tempo">
                <Icon name="timer" size={14} /> {clock(leftMs)}
              </span>
            </div>
            <Bar value={lines} max={25} className="mb-2" />
            <textarea
              className="input essay-sheet min-h-[50rem] font-serif text-base !py-0"
              style={{ lineHeight: '2rem' }}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Comece com a introdução: contextualize o tema e apresente sua tese."
              aria-label="Texto da redação"
              spellCheck
            />
            <p className="text-xs text-muted mt-2">
              Linhas simuladas com ~{cpl} caracteres (ajuste em Configurações para ficar igual à sua letra). Linha em branco não conta; parágrafo começa com recuo.
            </p>
          </div>
          <aside className="mt-4 tab:mt-0">
            <Card className="text-sm space-y-2">
              <p className="font-semibold">Roteiro rápido</p>
              <p>1º §: contexto + tese.</p>
              <p>2º e 3º §: um argumento cada, com repertório e explicação.</p>
              <p>4º §: retome a tese e feche (pode propor solução).</p>
              <p className="text-muted">Sem nome, sem assinatura, sem título obrigatório.</p>
            </Card>
            <button className="btn-primary w-full mt-4" disabled={!text.trim()} onClick={() => setStage('avaliar')}>
              <Icon name="check" /> Terminei: autoavaliar
            </button>
          </aside>
        </div>
      ) : (
        <div className="tab:grid tab:grid-cols-2 tab:gap-6">
          <div>
            <Card className="mb-4">
              <p className="text-sm text-muted">{theme || 'Sem tema'}</p>
              <p className="text-sm">
                {lines} linhas · {id && existing ? existing.minutes : elapsedMin} min
              </p>
              <div className="mt-3 max-h-80 overflow-y-auto whitespace-pre-wrap font-serif text-sm leading-relaxed">{text}</div>
              {!id && (
                <button className="btn-text mt-2" onClick={() => setStage('escrever')}>
                  <Icon name="edit" size={18} /> Voltar a escrever
                </button>
              )}
            </Card>
            <Card>
              <p className="font-semibold mb-2">Motivos de nota zero (edital 8.2.1)</p>
              {lines < 20 && (
                <p className="text-warn text-sm flex gap-2 mb-2">
                  <Icon name="alert" size={16} /> Menos de 20 linhas: nota zero automática.
                </p>
              )}
              {ZERO_FLAGS.map((f) => (
                <label key={f.id} className="flex items-center gap-3 min-h-[44px]">
                  <input type="checkbox" className="w-5 h-5 accent-[rgb(var(--pink))]" checked={flags.includes(f.id)} onChange={(e) => setFlags(e.target.checked ? [...flags, f.id] : flags.filter((x) => x !== f.id))} />
                  <span className="text-sm">{f.label}</span>
                </label>
              ))}
            </Card>
          </div>
          <div className="mt-4 tab:mt-0">
            {CHECKLIST.map((c) => (
              <Section key={c.key} title={CRIT_LABEL[c.key]}>
                <Card className="space-y-1">
                  {c.items.map((i) => (
                    <label key={i.id} className="flex items-center gap-3 min-h-[44px]">
                      <input type="checkbox" className="w-5 h-5 accent-[rgb(var(--pink))]" checked={!!checklist[i.id]} onChange={(e) => setChecklist({ ...checklist, [i.id]: e.target.checked })} />
                      <span className="text-sm">{i.label}</span>
                    </label>
                  ))}
                  <div className="flex items-center justify-between pt-2 border-t border-line">
                    <span className="text-sm">Sua nota</span>
                    <Stepper
                      label={`nota ${c.key}`}
                      value={scores[c.key]}
                      min={0}
                      max={c.key === 'discursivos' ? 40 : 30}
                      step={2}
                      onChange={(v) => setScores({ ...scores, [c.key]: v })}
                    />
                  </div>
                </Card>
              </Section>
            ))}
            <Card className="text-center mb-4">
              <p className="text-sm text-muted">Autoavaliação (N2)</p>
              <p className="text-4xl font-black text-accent">{zeroFlags.length ? 0 : sum}/100</p>
              <p className="text-sm text-muted">vale {((zeroFlags.length ? 0 : sum) * EXAM.essayFactor).toFixed(1)} na nota final (× 0,37)</p>
            </Card>
            <button className="btn-primary w-full" onClick={() => void save()}>
              <Icon name="check" /> Salvar redação
            </button>
            {id && (
              <button className="btn-text text-warn w-full mt-2" onClick={() => void repo.remove('essays', id).then(() => nav('/redacao'))}>
                <Icon name="trash" size={18} /> Excluir
              </button>
            )}
          </div>
        </div>
      )}
    </Page>
  );
}
