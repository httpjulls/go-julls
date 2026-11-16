import { db as defaultDb, type GoDb } from './db';
import { isAppendOnly, type SyncRow, type SyncTable } from './types';

export function uuid(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  const b = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Relógio monotônico por aparelho: nunca gera dois updated_at iguais nem para trás. */
let lastStamp = 0;
export function nowIso(): string {
  let t = Date.now();
  if (t <= lastStamp) t = lastStamp + 1;
  lastStamp = t;
  return new Date(t).toISOString();
}

export type NewRow<T extends SyncRow> = Omit<T, 'updated_at' | 'device_id' | 'id'> & { id?: string };

type Listener = () => void;

export class Repo {
  private deviceId: string | null = null;
  private listeners = new Set<Listener>();

  constructor(public db: GoDb = defaultDb) {}

  async getDeviceId(): Promise<string> {
    if (this.deviceId) return this.deviceId;
    const m = await this.db.meta.get('device_id');
    if (m?.value) return (this.deviceId = m.value as string);
    const id = uuid();
    await this.db.meta.put({ key: 'device_id', value: id });
    return (this.deviceId = id);
  }

  /** Avisado após cada escrita local (o motor de sync usa para subir logo). */
  onLocalWrite(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    for (const l of this.listeners) l();
  }

  private async stamp<T extends SyncRow>(row: Partial<T>): Promise<T> {
    return { ...row, id: row.id ?? uuid(), updated_at: nowIso(), device_id: await this.getDeviceId() } as T;
  }

  private async enqueue(table: SyncTable, row: SyncRow) {
    await this.db.outbox.put({ key: `${table}:${row.id}`, table, id: row.id, updated_at: row.updated_at, attempts: 0 });
  }

  /** Cria ou substitui um registro (último updated_at vence). */
  async put<T extends SyncRow>(table: SyncTable, row: NewRow<T> | T): Promise<T> {
    if (isAppendOnly(table) && row.id && (await this.db.table_(table).get(row.id))) {
      throw new Error(`${table} é append-only: registros não podem ser alterados`);
    }
    const full = await this.stamp<T>(row as Partial<T>);
    await this.db.transaction('rw', this.db.table_(table), this.db.outbox, async () => {
      await this.db.table_(table).put(full);
      await this.enqueue(table, full);
    });
    this.notify();
    return full;
  }

  /** Atualiza campos de um registro mutável. */
  async update<T extends SyncRow>(table: SyncTable, id: string, patch: Partial<T>): Promise<T | undefined> {
    if (isAppendOnly(table)) throw new Error(`${table} é append-only`);
    const cur = (await this.db.table_(table).get(id)) as T | undefined;
    if (!cur) return undefined;
    const full = { ...cur, ...patch, id, updated_at: nowIso(), device_id: await this.getDeviceId() } as T;
    await this.db.transaction('rw', this.db.table_(table), this.db.outbox, async () => {
      await this.db.table_(table).put(full);
      await this.enqueue(table, full);
    });
    this.notify();
    return full;
  }

  /** Exclusão lógica (mantém o registro para propagar a exclusão). */
  async remove(table: SyncTable, id: string) {
    return this.update(table, id, { deleted: true } as Partial<SyncRow>);
  }

  /** Inserção em tabela append-only. Idempotente: se o id já existe, devolve o registro existente. */
  async append<T extends SyncRow>(table: SyncTable, row: NewRow<T>): Promise<T> {
    if (row.id) {
      const cur = (await this.db.table_(table).get(row.id)) as T | undefined;
      if (cur) return cur;
    }
    try {
      return await this.put<T>(table, row);
    } catch (e) {
      // corrida entre duas chamadas com o mesmo id determinístico
      const cur = row.id ? ((await this.db.table_(table).get(row.id)) as T | undefined) : undefined;
      if (cur) return cur;
      throw e;
    }
  }

  async all<T extends SyncRow>(table: SyncTable): Promise<T[]> {
    return ((await this.db.table_(table).toArray()) as T[]).filter((r) => !r.deleted);
  }

  async pendingCount(): Promise<number> {
    return this.db.outbox.count();
  }
}

export const repo = new Repo();
