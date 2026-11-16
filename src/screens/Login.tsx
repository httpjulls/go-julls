import { useState } from 'react';
import { supabase } from '../sync/supabase';
import { useApp } from '../app/AppContext';
import { Logo } from '../app/Layout';

export default function Login() {
  const { useLocalOnly } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setErr(error.message.includes('Invalid') ? 'E-mail ou senha incorretos.' : 'Não consegui entrar. Confira a internet e tente de novo.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 safe-top">
      <form onSubmit={submit} className="w-full max-w-sm card space-y-4">
        <Logo />
        <p className="text-muted">Entre com a sua conta para sincronizar celular e tablet.</p>
        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input id="email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="pw">Senha</label>
          <input id="pw" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {err && <p className="text-warn text-sm" role="alert">{err}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
        <button type="button" className="btn-text w-full" onClick={() => void useLocalOnly()}>
          Usar só neste aparelho (sem sincronizar)
        </button>
        <p className="text-xs text-muted">O cadastro público fica desativado: a conta é criada uma vez no painel do Supabase (veja o README).</p>
      </form>
    </div>
  );
}
