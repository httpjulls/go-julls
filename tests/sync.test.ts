/**
 * Dois aparelhos (dois bancos IndexedDB) editando offline e reconectando.
 * O FakeRemote reproduz a semântica do Postgres em supabase/migrations/0001_init.sql:
 * upsert por (user,id), trigger "último updated_at vence", append-only ignora reenvio, server_ts como cursor.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { GoDb } from '../src/db/db';
import { Repo } from '../src/db/repo';
import { SyncEngine, remoteWins, type Remote } from '../src/sync/engine';
import { FakeRemote } from './fakeRemote';
import type { Topic, StudySession, Question } from '../src/db/types';
import { ensureSeed } from '../src/db/state';

let n = 0;
async function device(remote: Remote) {
  const db = new GoDb(`test-${++n}-${Math.random()}`);
  await ensureSeed(db);
  const repo = new Repo(db);
  const engine = new SyncEngine(repo, remote);
  return { db, repo, engine };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('regra de conflito', () => {
  const a = { id: 'x', updated_at: '2026-11-16T10:00:00.000Z', device_id: 'a' };
  it('updated_at mais recente vence', () => {
    expect(remoteWins('topics', a, { ...a, updated_at: '2026-11-16T10:00:01.000Z', device_id: 'b' })).toBe(true);
    expect(remoteWins('topics', a, { ...a, updated_at: '2026-11-16T09:59:59.000Z', device_id: 'b' })).toBe(false);
  });
  it('append-only nunca é sobrescrito', () => {
    expect(remoteWins('study_sessions', a, { ...a, updated_at: '2030-01-01T00:00:00.000Z' })).toBe(false);
    expect(remoteWins('study_sessions', undefined, a)).toBe(true);
  });
});

describe('sincronização entre dois aparelhos', () => {
  let remote: FakeRemote;
  beforeEach(() => {
    remote = new FakeRemote();
  });

  it('edições offline nos dois aparelhos convergem (último updated_at vence) sem duplicar histórico', async () => {
    const A = await device(remote);
    const B = await device(remote);
    remote.online = false;

    // Celular (A) offline: edita tópico e estuda
    await A.repo.update<Topic>('topics', 'fis-circuitos', { frequency: 4 });
    const sa = await A.repo.append<StudySession>('study_sessions', {
      topicId: 'fis-circuitos', subject: 'fis', day: '2026-11-16', startedAt: '2026-11-16T10:00:00.000Z', minutes: 40, kind: 'study',
    });
    await wait(5);
    // Tablet (B) offline: edita o MESMO tópico depois e estuda outra coisa
    await B.repo.update<Topic>('topics', 'fis-circuitos', { frequency: 2, name: 'Circuitos (editado no tablet)' });
    const sb = await B.repo.append<StudySession>('study_sessions', {
      topicId: 'mat-funcoes', subject: 'mat', day: '2026-11-16', startedAt: '2026-11-16T11:00:00.000Z', minutes: 50, kind: 'study',
    });

    // Tentativa de sync offline: nada se perde, fica pendente
    await A.engine.sync();
    expect(A.engine.getStatus().state).toBe('offline');
    expect(await A.repo.pendingCount()).toBe(2);

    // Reconecta (A primeiro, depois B, depois A de novo)
    remote.online = true;
    await A.engine.sync();
    await B.engine.sync();
    await A.engine.sync();

    for (const d of [A, B]) {
      const t = (await d.db.topics.get('fis-circuitos'))!;
      expect(t.frequency).toBe(2);
      expect(t.name).toBe('Circuitos (editado no tablet)');
      const sessions = await d.db.study_sessions.toArray();
      expect(sessions.map((s) => s.id).sort()).toEqual([sa.id, sb.id].sort());
      expect(await d.repo.pendingCount()).toBe(0);
    }
    expect(remote.t('study_sessions').size).toBe(2);
  });

  it('reenvio após falha não duplica e mantém a edição mais nova', async () => {
    const A = await device(remote);
    await A.repo.update<Topic>('topics', 'mat-probabilidade', { frequency: 5 });
    await A.engine.sync();
    await A.engine.push(); // reenvio sem mudanças
    await A.repo.update<Topic>('topics', 'mat-probabilidade', { frequency: 3 });
    await A.engine.sync();
    expect(remote.t('topics').get('mat-probabilidade')!.frequency).toBe(3);
    expect(remote.t('topics').size).toBe(1);
  });

  it('versão antiga que chega atrasada é ignorada pelo servidor', async () => {
    const A = await device(remote);
    const B = await device(remote);
    remote.online = false;
    await A.repo.update<Topic>('topics', 'por-interpretacao', { frequency: 1 }); // mais antiga
    await wait(5);
    await B.repo.update<Topic>('topics', 'por-interpretacao', { frequency: 4 }); // mais nova
    remote.online = true;
    await B.engine.sync(); // a mais nova chega primeiro
    await A.engine.sync(); // a antiga chega depois e é descartada; A baixa a nova
    expect(remote.t('topics').get('por-interpretacao')!.frequency).toBe(4);
    expect((await A.db.topics.get('por-interpretacao'))!.frequency).toBe(4);
  });

  it('exclusão lógica propaga', async () => {
    const A = await device(remote);
    const B = await device(remote);
    const q = await A.repo.put<Question>('questions', { subject: 'mat', topicId: null, statement: 'x', options: { A: '1', B: '2', C: '3', D: '4' }, answer: 'A', solution: '', source: '' });
    await A.engine.sync();
    await B.engine.sync();
    expect(await B.db.questions.get(q.id)).toBeTruthy();
    await B.repo.remove('questions', q.id);
    await B.engine.sync();
    await A.engine.sync();
    expect((await A.db.questions.get(q.id))!.deleted).toBe(true);
    expect(await A.repo.all('questions')).toHaveLength(0);
  });

  it('seed não sobe para o servidor e um aparelho novo começa só com o que foi editado', async () => {
    const A = await device(remote);
    await A.engine.sync();
    expect(remote.t('topics').size).toBe(0);
    await A.repo.put('settings', { id: 'settings', onboarded: true } as never);
    await A.engine.sync();
    const C = await device(remote);
    await C.engine.sync();
    expect((await C.db.settings.get('settings'))!.onboarded).toBe(true);
  });

  it('append-only não pode ser alterado localmente', async () => {
    const A = await device(remote);
    const s = await A.repo.append<StudySession>('study_sessions', {
      topicId: null, subject: 'mat', day: '2026-11-16', startedAt: '2026-11-16T10:00:00.000Z', minutes: 10, kind: 'free',
    });
    await expect(A.repo.update('study_sessions', s.id, { minutes: 99 } as never)).rejects.toThrow(/append-only/);
  });
});
