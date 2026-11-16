import { useEffect, useRef, type ReactNode } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

export function cx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(' ');
}

/* ---------- Ícones (SVG próprios, traço simples) ---------- */
const P: Record<string, string> = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zm0 0v14m6-12v14',
  timer: 'M12 8v5l3 2M9 2h6M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  chart: 'M4 20V10m6 10V4m6 16v-7m4 7H2',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  check: 'M5 13l4 4L19 7',
  alert: 'M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  cards: 'M4 7h12v13H4zM8 4h12v13',
  note: 'M5 3h10l4 4v14H5zM14 3v5h5M8 12h8M8 16h6',
  pen: 'M4 20h4L19 9l-4-4L4 16v4zM13 7l4 4',
  quiz: 'M9 9a3 3 0 1 1 4 2.8c-.6.3-1 .9-1 1.6V14m0 4h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
  x: 'M6 6l12 12M18 6 6 18',
  bug: 'M12 20a6 6 0 0 0 6-6V10a6 6 0 0 0-12 0v4a6 6 0 0 0 6 6zM4 13h2m12 0h2M5 7l2 2m12-2-2 2M12 10v10',
  flask: 'M9 3h6M10 3v6L4 19a1 1 0 0 0 .9 1.5h14.2A1 1 0 0 0 20 19l-6-10V3',
  sigma: 'M18 4H6l6 8-6 8h12',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4m8-4v4',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2-1.2L14.5 3h-4l-.4 2.6a7.6 7.6 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7.6 7.6 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z',
  exam: 'M7 3h10v18H7zM10 7h4M10 11h4M10 15h2',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM6 5H3v2a3 3 0 0 0 3 3m12-5h3v2a3 3 0 0 1-3 3M12 13v4m-4 4h8',
  grad: 'M2 9l10-5 10 5-10 5zm4 2v5c3 2 9 2 12 0v-5',
  play: 'M7 4v16l13-8z',
  pause: 'M7 4h3v16H7zm7 0h3v16h-3z',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm9 3-4.3-4.3',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9h.01',
  back: 'M15 18l-6-6 6-6',
  cloud: 'M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 9a4.5 4.5 0 0 0 1 9z',
  cloudoff: 'M3 3l18 18M7 18h10M20 15.5A4 4 0 0 0 17.5 10 6 6 0 0 0 9 5.5M6 9a4.5 4.5 0 0 0 1 9',
  sync: 'M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5m5 3a8 8 0 0 1-14 5.3L4 15m0 5v-5h5',
  trash: 'M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3',
  edit: 'M4 20h4L19 9l-4-4L4 16v4z',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
  book: 'M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zm16 0h-5a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h6z',
  download: 'M12 3v12m-5-5 5 5 5-5M4 21h16',
  upload: 'M12 21V9m-5 5 5-5 5 5M4 3h16',
};

export function Icon({ name, size = 22, className, label }: { name: keyof typeof P | string; size?: number; className?: string; label?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={P[name] ?? P.more} />
    </svg>
  );
}

/* ---------- Layout ---------- */
export function Page({ title, back, actions, children }: { title: string; back?: () => void; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-28 tab:pb-10">
      <header className="flex items-center gap-2 py-4">
        {back && (
          <button className="btn-text -ml-2" onClick={back} aria-label="Voltar">
            <Icon name="back" />
          </button>
        )}
        <h1 className="text-2xl font-extrabold tracking-tight flex-1">{title}</h1>
        {actions}
      </header>
      {children}
    </div>
  );
}

export function Card({ children, className, ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx('card', className)} {...rest}>
      {children}
    </div>
  );
}

export function Section({ title, right, children, className }: { title: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('mb-6', className)}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-muted text-center py-8 px-4">{children}</p>;
}

export function Bar({ value, max = 1, className }: { value: number; max?: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  return (
    <div className={cx('h-2 rounded-full bg-elevated overflow-hidden', className)} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full bg-pink rounded-full" style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Seletor de domínio 0–5 em um toque. */
export function MasteryPicker({ value, onChange, label = 'Domínio' }: { value: number | null; onChange: (v: number) => void; label?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1.5">
      {[0, 1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          role="radio"
          aria-checked={value === n}
          onClick={() => onChange(n)}
          className={cx(
            'min-w-[44px] min-h-[48px] flex-1 rounded-xl font-bold border',
            value === n ? 'bg-pink text-onpink border-pink' : 'bg-elevated border-line text-ink',
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

export function Stepper({ value, onChange, min = 0, max = 999, step = 1, label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; label: string }) {
  return (
    <div className="flex items-center gap-2" aria-label={label}>
      <button className="btn-ghost w-12 px-0" aria-label={`Diminuir ${label}`} onClick={() => onChange(Math.max(min, value - step))}>
        −
      </button>
      <span className="min-w-[4ch] text-center font-semibold tabular-nums">{value}</span>
      <button className="btn-ghost w-12 px-0" aria-label={`Aumentar ${label}`} onClick={() => onChange(Math.min(max, value + step))}>
        +
      </button>
    </div>
  );
}

/** Folha inferior (celular) / diálogo central (tablet). */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    ref.current?.focus();
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end tab:items-center justify-center bg-black/60" onClick={onClose}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full tab:max-w-xl max-h-[90vh] overflow-y-auto bg-surface border border-line rounded-t-3xl tab:rounded-3xl p-5 safe-bottom outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center mb-3">
          <h2 className="text-lg font-bold flex-1">{title}</h2>
          <button className="btn-text" onClick={onClose} aria-label="Fechar">
            <Icon name="x" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  const html = DOMPurify.sanitize(marked.parse(text ?? '', { async: false, breaks: true }) as string);
  return <div className={cx('md leading-relaxed', className)} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between gap-3 min-h-[48px] cursor-pointer">
      <span>{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx('w-14 h-8 rounded-full relative transition border', checked ? 'bg-pink border-pink' : 'bg-elevated border-line')}
      >
        <span className={cx('absolute top-1 w-6 h-6 rounded-full transition-all', checked ? 'left-7 bg-bg' : 'left-1 bg-muted')} />
      </button>
    </label>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o.value} role="radio" aria-checked={value === o.value} className={value === o.value ? 'chip-on' : 'chip'} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Disclaimer() {
  return (
    <p className="text-xs text-muted flex gap-2 items-start">
      <Icon name="alert" size={16} className="text-warn shrink-0 mt-0.5" />
      Projeções são estimativas de estudo, não previsão de resultado. Regras conforme o Edital 2027.1.
    </p>
  );
}
