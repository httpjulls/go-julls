/**
 * Motor de sincronização offline-first.
 *  - Escritas locais entram na fila (outbox) e sobem quando houver rede, com retentativa.
 *  - Conflito em tabela mutável: vence o updated_at mais recente (empate: maior device_id).
 *  - Tabelas append-only: um registro, uma vez criado, nunca é sobrescrito.
 *  - Ids são UUIDs do cliente, então reenviar o mesmo registro não duplica nada.
 */
import type { Repo } from '../db/repo';
import { SYNC_TABLES, isAppendOnly, type SyncRow, type SyncTable } from '../db/types';

export interface RemoteRow extends SyncRow {
  server_ts: string;
  [k: string]: unknown;
}

export interface Remote {
  push(table: SyncTable, rows: SyncRow[]): Promise<void>;
  pull(table: SyncTable, since: string | null, limit: number): Promise<RemoteRow[]>;
}

/** Regra de conflito (pura). */
export function remoteWins(table: SyncTable, local: SyncRow | undefined, remote: SyncRow): boolean {
  if (!local) return true;
  if (isAppendOnly(table)) return false;
  const a = Date.parse(local.updated_at);
  const b = Date.parse(remote.updated_at);
  if (b !== a) return b > a;
  return remote.device_id > local.device_id;
}

export type SyncState = 'disabled' | 'idle' | 'syncing' | 'offline' | 'error';
export interface SyncStatus { state: SyncState; pending: number; lastSync: string | null; error?: string }

const PAGE = 500;
const OVERLAP_MS = 5000;

export class SyncEngine {
  private status: SyncStatus = { state: 'idle', pending: 0, lastSync: null };
  private subs = new Set<(s: SyncStatus) => void>();
  private running: Promise<void> | null = null;
  private again = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private backoff = 0;

  constructor(private repo: Repo, private remote: Remote | null) {
    if (!remote) this.status.state = 'disabled';
  }

  setRemote(remote: Remote | null) {
    this.remote = remote;
    this.set({ state: remote ? 'idle' : 'disabled' });
  }

  subscribe(fn: (s: SyncStatus) => void) {
    this.subs.add(fn);
    fn(this.status);
    return () => this.subs.delete(fn);
  }

  getStatus() {
    return this.status;
  }

  private set(p: Partial<SyncStatus>) {
    this.status = { ...this.status, ...p };
    for (const s of this.subs) s(this.status);
  }

  async refreshPending() {
    this.set({ pending: await this.repo.pendingCount() });
  }

  /** Executa um ciclo (push + pull). Chamadas concorrentes são agrupadas. */
  sync(): Promise<void> {
    if (this.running) {
      this.again = true;
      return this.running;
    }
    this.running = (async () => {
      try {
        do {
          this.again = false;
          await this.cycle();
        } while (this.again);
      } finally {
        this.running = null;
      }
    })();
    return this.running;
  }

  private async cycle() {
    if (!this.remote) {
      await this.refreshPending();
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.set({ state: 'offline', pending: await this.repo.pendingCount() });
      return;
    }
    this.set({ state: 'syncing' });
    try {
      await this.push();
      await this.pull();
      this.backoff = 0;
      const lastSync = new Date().toISOString();
      await this.repo.db.meta.put({ key: 'lastSync', value: lastSync });
      this.set({ state: 'idle', lastSync, error: undefined, pending: await this.repo.pendingCount() });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const offline = /fetch|network|Failed to fetch|NetworkError/i.test(msg);
      this.set({ state: offline ? 'offline' : 'error', error: offline ? undefined : msg, pending: await this.repo.pendingCount() });
      this.scheduleRetry();
    }
  }

  private scheduleRetry() {
    this.backoff = Math.min(this.backoff ? this.backoff * 2 : 5000, 5 * 60 * 1000);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.sync(), this.backoff);
  }

  async push() {
    const db = this.repo.db;
    const entries = await db.outbox.toArray();
    const byTable = new Map<SyncTable, typeof entries>();
    for (const e of entries) byTable.set(e.table, [...(byTable.get(e.table) ?? []), e]);
    for (const table of SYNC_TABLES) {
      const list = byTable.get(table);
      if (!list?.length) continue;
      for (let i = 0; i < list.length; i += PAGE) {
        const chunk = list.slice(i, i + PAGE);
        const rows = (await db.table_(table).bulkGet(chunk.map((e) => e.id))).filter(Boolean) as SyncRow[];
        try {
          if (rows.length) await this.remote!.push(table, rows);
        } catch (err) {
          await db.outbox.bulkPut(chunk.map((e) => ({ ...e, attempts: e.attempts + 1 })));
          throw err;
        }
        // Só remove da fila se o registro não mudou durante o envio.
        const sent = new Map(rows.map((r) => [r.id, r.updated_at]));
        await db.transaction('rw', db.outbox, async () => {
          for (const e of chunk) {
            const cur = await db.outbox.get(e.key);
            if (!cur) continue;
            const pushed = sent.get(e.id);
            if (pushed === undefined || cur.updated_at === pushed) await db.outbox.delete(e.key);
          }
        });
      }
    }
  }

  async pull() {
    const db = this.repo.db;
    for (const table of SYNC_TABLES) {
      const cursorKey = `cursor:${table}`;
      let cursor = ((await db.meta.get(cursorKey))?.value as string | undefined) ?? null;
      let since = cursor ? new Date(Date.parse(cursor) - OVERLAP_MS).toISOString() : null;
      for (;;) {
        const rows = await this.remote!.pull(table, since, PAGE);
        if (!rows.length) break;
        await db.transaction('rw', db.table_(table), db.outbox, async () => {
          for (const r of rows) {
            const { server_ts: _ts, ...row } = r;
            const local = (await db.table_(table).get(row.id)) as SyncRow | undefined;
            if (remoteWins(table, local, row as SyncRow)) {
              await db.table_(table).put(row);
              // a versão local pendente ficou obsoleta
              const pending = await db.outbox.get(`${table}:${row.id}`);
              if (pending && Date.parse(pending.updated_at) <= Date.parse(row.updated_at)) {
                await db.outbox.delete(pending.key);
              }
            }
          }
        });
        const maxTs = rows.reduce((m, r) => (r.server_ts > m ? r.server_ts : m), cursor ?? '');
        if (maxTs === cursor) break;
        cursor = maxTs;
        await db.meta.put({ key: cursorKey, value: cursor });
        if (rows.length < PAGE) break;
        since = cursor;
      }
    }
  }

  /** Liga gatilhos automáticos: rede voltou, escrita local, app voltou ao primeiro plano, a cada 2 min. */
  start() {
    const kick = () => void this.sync();
    let debounce: ReturnType<typeof setTimeout> | null = null;
    this.repo.onLocalWrite(() => {
      void this.refreshPending();
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(kick, 1500);
    });
    if (typeof window !== 'undefined') {
      window.addEventListener('online', kick);
      window.addEventListener('offline', () => void this.refreshPending().then(() => this.set({ state: this.remote ? 'offline' : 'disabled' })));
      document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && kick());
      setInterval(kick, 2 * 60 * 1000);
    }
    kick();
  }

  /** Esquece cursores (força baixar tudo de novo no próximo ciclo). */
  async resetCursors() {
    await this.repo.db.meta.where('key').startsWith('cursor:').delete();
  }
}
