/** Verificação de nova versão: lê um latest.json publicado no GitHub Releases. */
declare const __APP_VERSION__: string;
export const APP_VERSION: string = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';

export interface LatestInfo { version: string; url: string; notes?: string }

export function isNewer(remote: string, local: string): boolean {
  const a = remote.replace(/^v/, '').split('.').map((x) => parseInt(x, 10) || 0);
  const b = local.replace(/^v/, '').split('.').map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
  }
  return false;
}

export async function checkForUpdate(): Promise<LatestInfo | null> {
  const url = import.meta.env.VITE_UPDATE_URL as string | undefined;
  if (!url || url.includes('SEU-USUARIO')) return null;
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) return null;
    const info = (await r.json()) as LatestInfo;
    return info.version && isNewer(info.version, APP_VERSION) ? info : null;
  } catch {
    return null;
  }
}
