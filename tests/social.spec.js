import { test, expect } from '@playwright/test';

test('two browsers meet, exchange safe chat, see movement and gestures, and remove departed players', async ({ browser }) => {
  test.setTimeout(180000);
  const contexts = [await browser.newContext({ viewport: { width: 900, height: 700 } }), await browser.newContext({ viewport: { width: 900, height: 700 } })];
  const [a, b] = await Promise.all(contexts.map(context => context.newPage()));
  const errors = [];
  for (const page of [a, b]) page.on('pageerror', error => errors.push(error.message));
  try {
    for (const [page, name] of [[a, 'Ana'], [b, 'Beto']]) {
      await page.goto('/');
      await expect(page.locator('#world')).toHaveAttribute('data-ready', 'true', { timeout: 30000 });
      await page.getByLabel('COMO VOCÊ QUER SER CHAMADO?').fill(name);
      await page.getByRole('button', { name: 'Explorar a orla', exact: true }).click();
      await expect(page.locator('#connection-status')).toHaveText('AO VIVO NA ORLA');
    }
    await expect(a.locator('#player-count')).toHaveText('2/24 na orla');
    await expect(b.locator('#player-count')).toHaveText('2/24 na orla');
    await expect.poll(() => b.evaluate(() => window.orlaState().peers.map(p => p.name))).toEqual(['Ana']);
    const before = await b.evaluate(() => window.orlaState().peers[0]);
    await a.locator('canvas').focus(); await a.keyboard.down('w');
    await expect.poll(async () => { const p = await b.evaluate(() => window.orlaState().peers[0]); return Math.hypot(p.x - before.x, p.z - before.z); }, { timeout: 25000 }).toBeGreaterThan(.4);
    await a.keyboard.up('w');
    await a.getByRole('button', { name: 'Acenar', exact: true }).click();
    await expect.poll(() => b.evaluate(() => window.orlaState().peers[0].gesture), { timeout: 10000 }).toBe('wave');
    const message = 'wasd <img src=x onerror=alert(1)> oi Copa';
    await a.getByRole('textbox', { name: 'Mensagem', exact: true }).fill(message);
    const typingPosition = await a.evaluate(() => window.orlaState().position);
    await a.getByRole('textbox', { name: 'Mensagem', exact: true }).press('w');
    await a.getByRole('button', { name: 'Enviar mensagem' }).click();
    await expect(b.locator('#chat-log')).toContainText(message + 'w');
    await expect(b.locator('#chat-log img')).toHaveCount(0);
    const afterTyping = await a.evaluate(() => window.orlaState().position);
    expect(afterTyping[0]).toBeCloseTo(typingPosition[0], 3);
    expect(afterTyping[2]).toBeCloseTo(typingPosition[2], 3);
    await b.getByRole('button', { name: 'Ligar música', exact: true }).click();
    await expect(b.getByRole('button', { name: 'Silenciar música', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => b.evaluate(() => window.orlaState().activities.music.scheduled), { timeout: 10000 }).toBeGreaterThan(0);
    expect(await b.evaluate(() => window.orlaState().activities.music.context)).toBe('running');
    await b.getByRole('button', { name: 'Silenciar música', exact: true }).click();
    await expect(b.getByRole('button', { name: 'Ligar música', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await b.getByRole('button', { name: 'Como chegar', exact: true }).click();
    await expect(b.locator('#navigation-text')).toContainText('Pista do quiosque');
    await Promise.all([a, b].map(page => page.getByRole('button', { name: 'Participar da corrida', exact: true }).click()));
    await expect.poll(() => b.evaluate(() => window.orlaState().activities.world.race.racers.length), { timeout: 10000 }).toBe(2);
    const startA = await a.evaluate(() => window.orlaState().activities.world.race.startsAt);
    expect(await b.evaluate(() => window.orlaState().activities.world.race.startsAt)).toBe(startA);
    await expect.poll(() => b.evaluate(() => window.orlaState().activities.world.race.phase), { timeout: 15000 }).toBe('running');
    await expect(b.locator('#navigation-text')).toContainText('Arco 1/4');
    await b.screenshot({ path: '/tmp/orla-phase3.png' });
    await b.screenshot({ path: '/tmp/orla-social.png' });
    await contexts[0].close();
    await expect(b.locator('#player-count')).toHaveText('1/24 na orla');
    await expect.poll(() => b.evaluate(() => window.orlaState().peers.length)).toBe(0);
    expect(errors).toEqual([]);
  } finally { await Promise.all(contexts.map(context => context.close())); }
});
