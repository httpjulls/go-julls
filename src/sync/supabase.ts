import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isAppendOnly, type SyncRow, type SyncTable } from '../db/types';
import type { Remote, RemoteRow } from './engine';

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(URL && KEY && !URL.includes('SEU-PROJETO'));

export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(URL!, KEY!, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'gojulls-auth' } })
  : null;

const COMMON = ['id', 'updated_at', 'device_id', 'deleted'] as const;

/** Linha local → linha do Postgres: colunas comuns + o resto em `data` (jsonb). */
export function toServer(row: SyncRow) {
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) if (!(COMMON as readonly string[]).includes(k)) data[k] = v;
  return { id: row.id, updated_at: row.updated_at, device_id: row.device_id, deleted: row.deleted ?? false, data };
}

export function fromServer(r: { id: string; updated_at: string; device_id: string; deleted: boolean; data: Record<string, unknown>; server_ts: string }): RemoteRow {
  return { ...(r.data ?? {}), id: r.id, updated_at: new Date(r.updated_at).toISOString(), device_id: r.device_id, deleted: r.deleted || undefined, server_ts: r.server_ts } as RemoteRow;
}

export class SupabaseRemote implements Remote {
  constructor(private client: SupabaseClient) {}

  async push(table: SyncTable, rows: SyncRow[]) {
    const payload = rows.map(toServer);
    const { error } = await this.client
      .from(table)
      .upsert(payload, { onConflict: 'user_id,id', ignoreDuplicates: isAppendOnly(table) });
    if (error) throw new Error(`${table}: ${error.message}`);
  }

  async pull(table: SyncTable, since: string | null, limit: number) {
    let q = this.client.from(table).select('id,updated_at,device_id,deleted,data,server_ts').order('server_ts', { ascending: true }).limit(limit);
    if (since) q = q.gt('server_ts', since);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    return (data ?? []).map((r) => ({ ...fromServer(r as never), server_ts: (r as { server_ts: string }).server_ts }));
  }
}

/** Fotos das anotações: bucket privado `attachments`, pasta = id do usuário. */
export async function uploadAttachment(userId: string, id: string, dataUrl: string) {
  if (!supabase) return false;
  const blob = await (await fetch(dataUrl)).blob();
  const { error } = await supabase.storage.from('attachments').upload(`${userId}/${id}.jpg`, blob, { upsert: true, contentType: 'image/jpeg' });
  return !error;
}

export async function downloadAttachment(userId: string, id: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.storage.from('attachments').download(`${userId}/${id}.jpg`);
  if (error || !data) return null;
  return await new Promise((res) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result as string);
    fr.onerror = () => res(null);
    fr.readAsDataURL(data);
  });
}
