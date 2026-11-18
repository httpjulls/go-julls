import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useApp } from './AppContext';
import { Icon, cx } from '../ui/kit';
import { diffDays } from '../core/dates';

export const NAV = [
  { to: '/', label: 'Hoje', icon: 'home', main: true },
  { to: '/mapa', label: 'Mapa', icon: 'map', main: true },
  { to: '/foco', label: 'Foco', icon: 'timer', main: true },
  { to: '/progresso', label: 'Progresso', icon: 'chart', main: true },
  { to: '/cronograma', label: 'Cronograma', icon: 'calendar' },
  { to: '/flashcards', label: 'Flashcards', icon: 'cards' },
  { to: '/questoes', label: 'Questões', icon: 'quiz' },
  { to: '/biblioteca', label: 'Biblioteca', icon: 'book' },
  { to: '/listas', label: 'Listas e PDFs', icon: 'download' },
  { to: '/erros', label: 'Banco de erros', icon: 'bug' },
  { to: '/redacao', label: 'Redação', icon: 'pen' },
  { to: '/simulado', label: 'Simulado', icon: 'exam' },
  { to: '/anotacoes', label: 'Anotações', icon: 'note' },
  { to: '/formulario', label: 'Formulário', icon: 'sigma' },
  { to: '/tabela', label: 'Tabela periódica', icon: 'flask' },
  { to: '/calendario', label: 'Calendário', icon: 'calendar' },
  { to: '/aluna', label: 'Aluna CEDERJ', icon: 'grad', student: true },
  { to: '/config', label: 'Configurações', icon: 'gear' },
] as const;

export function SyncBadge() {
  const { sync, auth } = useApp();
  if (auth === 'local' || sync.state === 'disabled')
    return (
      <span className="chip text-xs" title="Dados só neste aparelho">
        <Icon name="cloudoff" size={14} /> só neste aparelho
      </span>
    );
  const map = {
    idle: { icon: 'check', text: 'sincronizado' },
    syncing: { icon: 'sync', text: 'sincronizando' },
    offline: { icon: 'cloudoff', text: `offline${sync.pending ? ` · ${sync.pending} pendências` : ''}` },
    error: { icon: 'alert', text: `erro de sync${sync.pending ? ` · ${sync.pending}` : ''}` },
  } as const;
  const s = map[sync.state as keyof typeof map] ?? map.idle;
  return (
    <span role="status" aria-live="polite" className={cx('chip text-xs', sync.state === 'error' && 'text-warn')} title={sync.error}>
      <Icon name={s.icon} size={14} className={sync.state === 'syncing' ? 'animate-spin' : undefined} />
      {s.text}
    </span>
  );
}

export function Layout() {
  const { settings, today } = useApp();
  const loc = useLocation();
  const days = settings ? diffDays(today, settings.examDate) : 0;
  const items = NAV.filter((n) => !('student' in n) || settings?.studentMode);
  const mainItems = NAV.filter((n) => 'main' in n);
  const inMain = mainItems.some((n) => n.to === loc.pathname);

  return (
    <div className="min-h-screen tab:flex">
      {/* Navegação lateral (tablet) */}
      <aside className="hidden tab:flex tab:flex-col w-60 shrink-0 border-r border-line bg-surface safe-top sticky top-0 h-screen overflow-y-auto">
        <div className="px-5 py-5">
          <Logo />
          <p className="text-sm text-muted mt-1">{days > 0 ? `Faltam ${days} dias` : days === 0 ? 'Hoje é a prova!' : 'Prova realizada'}</p>
        </div>
        <nav className="flex-1 px-2 pb-4" aria-label="Navegação principal">
          {items.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                cx('flex items-center gap-3 rounded-xl px-3 min-h-[44px] my-0.5 font-medium', isActive ? 'bg-pink text-onpink' : 'text-ink hover:bg-elevated')
              }
            >
              <Icon name={n.icon} size={20} />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-line">
          <SyncBadge />
        </div>
      </aside>

      <main className="flex-1 min-w-0 safe-top">
        <div className="tab:hidden flex items-center justify-between px-4 pt-3">
          <Logo small />
          <SyncBadge />
        </div>
        <Outlet />
      </main>

      {/* Navegação inferior (celular) */}
      <nav aria-label="Navegação principal" className="tab:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur border-t border-line safe-bottom">
        <div className="grid grid-cols-5">
          {mainItems.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) => cx('flex flex-col items-center justify-center min-h-[60px] text-xs gap-0.5', isActive ? 'text-accent font-bold' : 'text-muted')}
            >
              <Icon name={n.icon} />
              {n.label}
            </NavLink>
          ))}
          <NavLink to="/mais" className={({ isActive }) => cx('flex flex-col items-center justify-center min-h-[60px] text-xs gap-0.5', isActive || !inMain ? 'text-accent font-bold' : 'text-muted')}>
            <Icon name="more" />
            Mais
          </NavLink>
        </div>
      </nav>
    </div>
  );
}

export function Logo({ small }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-2" aria-label="Go, Julls!">
      <img src="./icon.svg" alt="" width={small ? 28 : 36} height={small ? 28 : 36} className="rounded-lg" />
      <span className={cx('font-black tracking-tight', small ? 'text-lg' : 'text-2xl')}>
        Go, <span className="text-accent">Julls!</span>
      </span>
    </div>
  );
}
