import { Link } from 'react-router-dom';
import { NAV } from '../app/Layout';
import { useApp } from '../app/AppContext';
import { Icon, Page } from '../ui/kit';

export default function More() {
  const { settings } = useApp();
  const items = NAV.filter((n) => !('main' in n)).filter((n) => !('student' in n) || settings?.studentMode);
  return (
    <Page title="Mais">
      <div className="grid grid-cols-2 gap-3">
        {items.map((n) => (
          <Link key={n.to} to={n.to} className="card flex flex-col items-start gap-2 min-h-[96px] active:scale-[.98] transition">
            <Icon name={n.icon} className="text-accent" />
            <span className="font-semibold">{n.label}</span>
          </Link>
        ))}
      </div>
    </Page>
  );
}
