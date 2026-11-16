import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider, useApp } from './app/AppContext';
import { Layout, Logo } from './app/Layout';
import Login from './screens/Login';
import Onboarding from './screens/Onboarding';
import Today from './screens/Today';
import MapScreen from './screens/MapScreen';
import Focus from './screens/Focus';
import Progress from './screens/Progress';
import Calendar from './screens/Calendar';
import More from './screens/More';
import Settings from './screens/Settings';

const Flashcards = lazy(() => import('./screens/Flashcards'));
const Questions = lazy(() => import('./screens/Questions'));
const Errors = lazy(() => import('./screens/Errors'));
const Essay = lazy(() => import('./screens/Essay'));
const Mock = lazy(() => import('./screens/Mock'));
const Notes = lazy(() => import('./screens/Notes'));
const Periodic = lazy(() => import('./screens/Periodic'));
const Student = lazy(() => import('./screens/Student'));

function Splash({ text }: { text?: string }) {
  return (
    <div className="min-h-screen grid place-items-center">
      <div className="text-center">
        <Logo />
        {text && <p className="text-muted mt-3">{text}</p>}
      </div>
    </div>
  );
}

function Gate() {
  const { ready, settings, auth, sync } = useApp();
  // Primeiro login num aparelho novo: espera o primeiro download antes de decidir se mostra o onboarding.
  const [waitedFirstSync, setWaited] = useState(false);
  useEffect(() => {
    if (auth !== 'signedIn') return;
    if (sync.lastSync || sync.state === 'offline' || sync.state === 'error') setWaited(true);
    const t = setTimeout(() => setWaited(true), 8000);
    return () => clearTimeout(t);
  }, [auth, sync.lastSync, sync.state]);

  if (!ready || auth === 'loading') return <Splash />;
  if (auth === 'signedOut') return <Login />;
  if (!settings!.onboarded) {
    if (auth === 'signedIn' && !waitedFirstSync) return <Splash text="Baixando seus dados…" />;
    return <Onboarding />;
  }
  return (
    <Suspense fallback={<Splash />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Today />} />
          <Route path="mapa" element={<MapScreen />} />
          <Route path="mapa/:id" element={<MapScreen />} />
          <Route path="foco" element={<Focus />} />
          <Route path="progresso" element={<Progress />} />
          <Route path="calendario" element={<Calendar />} />
          <Route path="mais" element={<More />} />
          <Route path="config" element={<Settings />} />
          <Route path="flashcards/*" element={<Flashcards />} />
          <Route path="questoes/*" element={<Questions />} />
          <Route path="erros" element={<Errors />} />
          <Route path="redacao/*" element={<Essay />} />
          <Route path="simulado/*" element={<Mock />} />
          <Route path="anotacoes" element={<Notes kind="note" />} />
          <Route path="formulario" element={<Notes kind="formula" />} />
          <Route path="tabela" element={<Periodic />} />
          <Route path="aluna" element={<Student />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen grid place-items-center px-6 text-center">
        <div>
          <Logo />
          <p className="mt-4">Algo deu errado nesta tela. Seus dados estão salvos no aparelho.</p>
          <button className="btn-primary mt-4" onClick={() => location.reload()}>Recarregar</button>
        </div>
      </div>
    );
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <HashRouter>
          <Gate />
        </HashRouter>
      </AppProvider>
    </ErrorBoundary>
  );
}
