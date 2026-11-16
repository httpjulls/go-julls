import type { GoDb } from './db';
import { SYNC_TABLES, type SyncRow, type SyncTable } from './types';
import { remoteWins } from '../sync/engine';
import { APP_VERSION } from '../native/update';

export interface Backup {
  app: 'go-julls';
  version: string;
  exportedAt: string;
  tables: Partial<Record<SyncTable, SyncRow[]>>;
}

export async function exportJson(db: GoDb): Promise<string> {
  const tables: Backup['tables'] = {};
  for (const t of SYNC_TABLES) tables[t] = await db.table_(t).toArray();
  const b: Backup = { app: 'go-julls', version: APP_VERSION, exportedAt: new Date().toISOString(), tables };
  return JSON.stringify(b, null, 1);
}

/** Importa com a mesma regra do sync (último updated_at vence; append-only não sobrescreve). */
export async function importJson(db: GoDb, json: string): Promise<{ applied: number; skipped: number }> {
  const b = JSON.parse(json) as Backup;
  if (b.app !== 'go-julls' || !b.tables) throw new Error('Arquivo não é um backup do Go, Julls!');
  let applied = 0;
  let skipped = 0;
  for (const t of SYNC_TABLES) {
    const rows = b.tables[t] ?? [];
    await db.transaction('rw', db.table_(t), db.outbox, async () => {
      for (const r of rows) {
        if (!r?.id || !r.updated_at) {
          skipped++;
          continue;
        }
        const local = (await db.table_(t).get(r.id)) as SyncRow | undefined;
        if (remoteWins(t, local, r)) {
          await db.table_(t).put(r);
          await db.outbox.put({ key: `${t}:${r.id}`, table: t, id: r.id, updated_at: r.updated_at, attempts: 0 });
          applied++;
        } else skipped++;
      }
    });
  }
  return { applied, skipped };
}

function csv(rows: Record<string, unknown>[], cols: string[]): string {
  const esc = (v: unknown) => {
    const s = v === undefined || v === null ? '' : String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
}

export async function exportCsv(db: GoDb): Promise<{ sessions: string; attempts: string; errors: string }> {
  const live = <T extends SyncRow>(xs: T[]) => xs.filter((x) => !x.deleted) as unknown as Record<string, unknown>[];
  return {
    sessions: csv(live(await db.study_sessions.toArray()), ['day', 'startedAt', 'subject', 'topicId', 'minutes', 'kind', 'correct', 'wrong']),
    attempts: csv(live(await db.question_attempts.toArray()), ['day', 'at', 'subject', 'topicId', 'questionId', 'chosen', 'correct', 'seconds', 'mockId']),
    errors: csv(live(await db.error_log.toArray()), ['day', 'subject', 'topicId', 'reason', 'note']),
  };
}
