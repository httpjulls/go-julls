/**
 * Ponta a ponta (jsdom + IndexedDB falso): onboarding → Hoje → concluir bloco → Progresso →
 * segundo aparelho faz login/sync e recebe tudo.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import App from '../src/App';
import { db, GoDb } from '../src/db/db';
import { Repo } from '../src/db/repo';
import { engine } from '../src/app/AppContext';
import { SyncEngine } from '../src/sync/engine';
import { ensureSeed } from '../src/db/state';
import { FakeRemote } from './fakeRemote';

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-16T12:00:00'));
});
afterAll(() => vi.useRealTimers());

describe('fluxo principal', () => {
  it('onboarding → Hoje → concluir bloco → progresso → segundo aparelho sincroniza', async () => {
    render(<App />);

    // Sem Supabase configurado no teste: modo local, vai direto para o onboarding
    await screen.findByText('Bora montar seu norte', {}, { timeout: 10000 });
    fireEvent.click(screen.getByText('Continuar')); // data e língua
    await screen.findByText('Quanto tempo por dia?');
    fireEvent.click(screen.getByText('Continuar'));
    await screen.findByText('Como você está em cada matéria?');
    const mat = screen.getByRole('radiogroup', { name: 'Matemática' });
    fireEvent.click(within(mat).getByRole('radio', { name: '1' }));
    const fis = screen.getByRole('radiogroup', { name: 'Física' });
    fireEvent.click(within(fis).getByRole('radio', { name: '2' }));
    fireEvent.click(screen.getByText('Continuar'));
    await screen.findByText('Detalhar Matemática, Física e Redação?');
    fireEvent.click(screen.getByText('Pular'));
    await screen.findByText('Lembrete diário');
    fireEvent.click(screen.getByText('Começar. Go, Julls!'));

    // Tela Hoje com blocos explicados
    await screen.findByText('Blocos de hoje', {}, { timeout: 10000 });
    await waitFor(async () => expect(await db.plan_items.count()).toBeGreaterThanOrEqual(2), { timeout: 10000 });
    const reasons = await screen.findAllByText(/vale 15 pts/);
    expect(reasons.length).toBeGreaterThan(0);

    // Concluir o primeiro bloco de Matemática ou Física em um toque
    const concl = await screen.findAllByText('Concluí');
    const items = (await db.plan_items.toArray()).sort((a, b) => a.index - b.index);
    const idx = items.findIndex((i) => i.subject === 'mat' || i.subject === 'fis');
    fireEvent.click(concl[idx]);
    const dialog = await screen.findByRole('dialog', { name: 'Como foi o bloco?' });
    fireEvent.click(within(dialog).getByRole('radio', { name: '3' }));
    fireEvent.click(within(dialog).getByText('Salvar'));

    await waitFor(async () => expect(await db.study_sessions.count()).toBe(1));
    await waitFor(async () => expect((await db.plan_items.get(items[idx].id))!.done).toBe(true));
    const ml = (await db.mastery_log.toArray()).filter((m) => m.source === 'block');
    expect(ml).toHaveLength(1);
    expect(ml[0].mastery).toBe(3);

    // Progresso
    fireEvent.click(screen.getAllByText('Progresso')[0]);
    await screen.findByText('Projeção de nota (estimativa)', {}, { timeout: 10000 });
    expect(screen.getByText(/não previsão de resultado/)).toBeInTheDocument();

    // Segundo aparelho: os dois conectam ao mesmo "Supabase"
    const remote = new FakeRemote();
    engine.setRemote(remote);
    await waitFor(async () => {
      await engine.sync();
      expect(await db.outbox.count()).toBe(0);
    });

    const tabletDb = new GoDb('tablet-e2e');
    await ensureSeed(tabletDb);
    const tablet = new SyncEngine(new Repo(tabletDb), remote);
    await tablet.sync();
    expect((await tabletDb.settings.get('settings'))!.onboarded).toBe(true);
    expect(await tabletDb.study_sessions.count()).toBe(1);
    expect((await tabletDb.plan_items.get(items[idx].id))!.done).toBe(true);
    expect((await tabletDb.mastery_log.toArray()).length).toBe(await db.mastery_log.count());
  }, 60000);
});
