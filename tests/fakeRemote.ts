import { isAppendOnly, type SyncRow, type SyncTable } from '../src/db/types';
import type { Remote, RemoteRow } from '../src/sync/engine';

/** Reproduz a semântica do Postgres em supabase/migrations/0001_init.sql. */
export class FakeRemote implements Remote {
  tables = new Map<string, Map<string, RemoteRow>>();
  online = true;
  pushes = 0;
  private clock = 0;
  private ts() {
    this.clock += 1;
    return new Date(Date.UTC(2026, 10, 16, 12, 0, 0, this.clock)).toISOString();
  }
  t(name: string) {
    if (!this.tables.has(name)) this.tables.set(name, new Map());
    return this.tables.get(name)!;
  }
  async push(table: SyncTable, rows: SyncRow[]) {
    if (!this.online) throw new Error('Failed to fetch');
    this.pushes++;
    const t = this.t(table);
    for (const r of rows) {
      const cur = t.get(r.id);
      if (cur && isAppendOnly(table)) continue; // ON CONFLICT DO NOTHING
      if (cur && Date.parse(r.updated_at) < Date.parse(cur.updated_at)) continue; // gj_lww
      t.set(r.id, { ...JSON.parse(JSON.stringify(r)), server_ts: this.ts() });
    }
  }
  async pull(table: SyncTable, since: string | null, limit: number) {
    if (!this.online) throw new Error('Failed to fetch');
    return [...this.t(table).values()]
      .filter((r) => !since || r.server_ts > since)
      .sort((a, b) => a.server_ts.localeCompare(b.server_ts))
      .slice(0, limit)
      .map((r) => JSON.parse(JSON.stringify(r)));
  }
}

