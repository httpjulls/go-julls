import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Session } from '@supabase/supabase-js';
import { db } from '../db/db';
import { repo } from '../db/repo';
import type { Settings } from '../db/types';
import { DEFAULT_SETTINGS, ensureSeed, loadSnapshot, type Snapshot } from '../db/state';
import { SyncEngine, type SyncStatus } from '../sync/engine';
import { SupabaseRemote, supabase, supabaseConfigured } from '../sync/supabase';
import { applyStatusBar } from '../native/native';
import { dayKey } from '../core/dates';

export const engine = new SyncEngine(repo, null);

type AuthState = 'loading' | 'signedOut' | 'signedIn' | 'local';

interface Ctx {
  ready: boolean;
  settings: Settings | undefined;
  saveSettings: (patch: Partial<Settings>) => Promise<void>;
  auth: AuthState;
  session: Session | null;
  useLocalOnly: () => Promise<void>;
  signOut: () => Promise<void>;
  sync: SyncStatus;
  toast: (msg: string) => void;
  today: string;
}

const AppCtx = createContext<Ctx>(null as never);
export const useApp = () => useContext(AppCtx);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [auth, setAuth] = useState<AuthState>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [sync, setSync] = useState<SyncStatus>(engine.getStatus());
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [today, setToday] = useState(dayKey());
  const started = useRef(false);

  const settings = useLiveQuery(() => db.settings.get('settings'), []);

  // Boot: seed local + configurações padrão (não sobem até ela editar).
  useEffect(() => {
    (async () => {
      await ensureSeed(db);
      const id = await repo.getDeviceId();
      if (!(await db.settings.get('settings'))) await db.settings.put(DEFAULT_SETTINGS(id));
      setReady(true);
    })();
    const t = setInterval(() => setToday(dayKey()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const off = engine.subscribe(setSync);
    return () => void off();
  }, []);

  const startSync = useCallback(async (s: Session) => {
    if (!supabase) return;
    await db.meta.put({ key: 'userId', value: s.user.id });
    engine.setRemote(new SupabaseRemote(supabase));
    if (!started.current) {
      started.current = true;
      engine.start();
    } else void engine.sync();
  }, []);

  // Autenticação
  useEffect(() => {
    (async () => {
      const local = (await db.meta.get('localMode'))?.value === true;
      if (!supabase) {
        setAuth('local');
        void engine.refreshPending();
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setSession(data.session);
        setAuth('signedIn');
        void startSync(data.session);
      } else setAuth(local ? 'local' : 'signedOut');
      supabase.auth.onAuthStateChange((_e, s) => {
        setSession(s);
        if (s) {
          setAuth('signedIn');
          void db.meta.put({ key: 'localMode', value: false });
          void startSync(s);
        }
      });
    })();
  }, [startSync]);

  // Tema
  useEffect(() => {
    const theme = settings?.theme ?? 'dark';
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0B0B0F' : '#FFF5FA');
    void applyStatusBar(theme);
  }, [settings?.theme]);

  const saveSettings = useCallback(async (patch: Partial<Settings>) => {
    await repo.update<Settings>('settings', 'settings', patch);
  }, []);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg((m) => (m === msg ? null : m)), 3200);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      ready: ready && !!settings,
      settings,
      saveSettings,
      auth,
      session,
      useLocalOnly: async () => {
        await db.meta.put({ key: 'localMode', value: true });
        setAuth('local');
      },
      signOut: async () => {
        await supabase?.auth.signOut();
        engine.setRemote(null);
        setSession(null);
        setAuth(supabaseConfigured ? 'signedOut' : 'local');
      },
      sync,
      toast,
      today,
    }),
    [ready, settings, saveSettings, auth, session, sync, toast, today],
  );

  return (
    <AppCtx.Provider value={value}>
      {children}
      {toastMsg && (
        <div role="status" aria-live="polite" className="fixed z-[60] left-1/2 -translate-x-1/2 bottom-24 tab:bottom-8 max-w-[90vw] rounded-2xl bg-pink text-onpink font-semibold px-5 py-3 shadow-lg">
          {toastMsg}
        </div>
      )}
    </AppCtx.Provider>
  );
}

/** Estado derivado do histórico, recalculado sempre que qualquer tabela lida mudar. */
export function useSnapshot(): Snapshot | undefined {
  const { settings, today } = useApp();
  return useLiveQuery(async () => (settings ? loadSnapshot(db, settings, today) : undefined), [settings, today]);
}
