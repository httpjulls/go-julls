import { useState } from 'react';
import { CAT_LABEL, ELEMENTS, electronConfig, valence, type Cat, type Element } from '../data/periodic';
import { Card, Page, cx } from '../ui/kit';

/** Cores por família: variações de rosa/neutros + borda, sem depender só de cor (há legenda e nome da família). */
const CAT_STYLE: Record<Cat, string> = {
  am: 'bg-pink/80 text-onpink',
  at: 'bg-pink/55 text-ink',
  tr: 'bg-elevated text-ink',
  pt: 'bg-pinks/30 text-ink',
  sm: 'bg-warn/30 text-ink',
  nm: 'bg-pinkp/20 text-ink',
  ha: 'bg-pinkv/40 text-ink',
  gn: 'bg-surface text-ink border-dashed',
  la: 'bg-line text-ink',
  ac: 'bg-line/60 text-ink',
};

export default function Periodic() {
  const [sel, setSel] = useState<Element>(ELEMENTS[5]);
  const [cat, setCat] = useState<Cat | null>(null);
  const [q, setQ] = useState('');
  const match = (e: Element) =>
    (!cat || e.cat === cat) && (!q || e.symbol.toLowerCase() === q.toLowerCase() || e.name.toLowerCase().includes(q.toLowerCase()) || String(e.z) === q);

  return (
    <Page title="Tabela periódica">
      <input className="input mb-3 max-w-sm" placeholder="Buscar: símbolo, nome ou Z" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar elemento" />
      <div className="overflow-x-auto pb-2 -mx-4 px-4">
        <div className="grid gap-[3px] min-w-[720px]" style={{ gridTemplateColumns: 'repeat(18, minmax(0, 1fr))' }}>
          {ELEMENTS.map((e) => (
            <button
              key={e.z}
              onClick={() => setSel(e)}
              style={{ gridColumn: e.col, gridRow: e.row > 7 ? e.row + 0 : e.row }}
              className={cx(
                'aspect-square rounded-md border border-line flex flex-col items-center justify-center leading-none p-0.5 transition',
                CAT_STYLE[e.cat],
                !match(e) && 'opacity-20',
                sel.z === e.z && 'ring-2 ring-pink scale-110 z-10',
              )}
              aria-label={`${e.name}, número atômico ${e.z}`}
            >
              <span className="text-[9px] opacity-80">{e.z}</span>
              <span className="text-sm font-bold">{e.symbol}</span>
            </button>
          ))}
          <div style={{ gridColumn: '1 / span 18', gridRow: 8 }} className="h-2" />
          <div style={{ gridColumn: '1 / span 2', gridRow: 9 }} className="text-[10px] text-muted self-center">57–71</div>
          <div style={{ gridColumn: '1 / span 2', gridRow: 10 }} className="text-[10px] text-muted self-center">89–103</div>
        </div>
      </div>

      <div className="tab:grid tab:grid-cols-2 tab:gap-6 mt-4">
        <Card className="mb-4">
          <div className="flex items-start gap-4">
            <div className={cx('w-24 h-24 rounded-2xl border border-line grid place-items-center shrink-0', CAT_STYLE[sel.cat])}>
              <div className="text-center leading-tight">
                <p className="text-xs">{sel.z}</p>
                <p className="text-3xl font-black">{sel.symbol}</p>
                <p className="text-xs">{sel.mass}</p>
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold">{sel.name}</p>
              <p className="text-sm text-accent font-semibold">{CAT_LABEL[sel.cat]}</p>
              <p className="text-sm text-muted">
                {sel.group ? `Grupo ${sel.group} · ` : ''}
                {sel.period}º período
                {sel.en !== undefined && ` · eletronegatividade ${sel.en}`}
              </p>
            </div>
          </div>
          <dl className="mt-4 text-sm space-y-1">
            <div className="flex gap-2"><dt className="text-muted w-32 shrink-0">Massa atômica</dt><dd>{sel.mass} u ({sel.mass} g/mol)</dd></div>
            <div className="flex gap-2"><dt className="text-muted w-32 shrink-0">Prótons / elétrons</dt><dd>{sel.z} (átomo neutro)</dd></div>
            <div className="flex gap-2"><dt className="text-muted w-32 shrink-0">Nêutrons (aprox.)</dt><dd>{Math.round(sel.mass) - sel.z}</dd></div>
            <div className="flex gap-2"><dt className="text-muted w-32 shrink-0">Distribuição</dt><dd className="break-words">{electronConfig(sel.z)}</dd></div>
            <div className="flex gap-2"><dt className="text-muted w-32 shrink-0">Valência</dt><dd>camada {valence(sel.z).shell}, {valence(sel.z).electrons} elétron(s)</dd></div>
          </dl>
          {[24, 29, 42, 47, 79].includes(sel.z) && <p className="text-xs text-warn mt-2">Atenção: este elemento tem distribuição real diferente do diagrama de Pauling (exceção).</p>}
        </Card>
        <Card>
          <p className="label">Famílias (toque para destacar)</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CAT_LABEL) as Cat[]).map((c) => (
              <button key={c} onClick={() => setCat(cat === c ? null : c)} className={cx('chip', cat === c && 'ring-2 ring-pink')} aria-pressed={cat === c}>
                <span className={cx('w-4 h-4 rounded border border-line', CAT_STYLE[c])} aria-hidden /> {CAT_LABEL[c]}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted mt-3">
            Tendências: raio atômico cresce para baixo e para a esquerda; energia de ionização e eletronegatividade crescem para cima e para a direita (gases nobres à parte).
          </p>
        </Card>
      </div>
    </Page>
  );
}
