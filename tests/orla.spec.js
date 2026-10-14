import { test, expect } from '@playwright/test';

test('renders the orla, enters exploration and moves the avatar', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#world')).toHaveAttribute('data-ready', 'true', { timeout: 30000 });
  await expect(page.getByRole('heading', { name: 'Seu lugar ao sol.' })).toBeVisible();
  await page.screenshot({ path: '/tmp/orla-desktop.png' });
  await page.getByRole('button', { name: 'Explorar a orla' }).click();
  await expect(page.locator('#session')).toBeVisible();
  const before = await page.evaluate(() => window.orlaState().position);
  await page.keyboard.down('w');
  await expect.poll(async () => {
    const p = await page.evaluate(() => window.orlaState().position);
    return Math.hypot(p[0] - before[0], p[2] - before[2]);
  }, { timeout: 20000 }).toBeGreaterThan(.5);
  await page.keyboard.up('w');
  const after = await page.evaluate(() => window.orlaState().position);
  expect(Math.hypot(after[0] - before[0], after[2] - before[2])).toBeGreaterThan(.3);
  await page.getByRole('button', { name: 'Abrir controles' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const paused = await page.evaluate(() => window.orlaState().position);
  await page.keyboard.down('w');
  await page.waitForTimeout(200);
  await page.keyboard.up('w');
  const still = await page.evaluate(() => window.orlaState().position);
  expect(still[0]).toBeCloseTo(paused[0], 3);
  expect(still[2]).toBeCloseTo(paused[2], 3);
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  await page.screenshot({ path: '/tmp/orla-explore.png' });
  expect(errors).toEqual([]);
});

test.describe('touch device', () => {
test.use({ hasTouch: true });
test('mobile viewport exposes touch movement after entering', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('#world')).toHaveAttribute('data-ready', 'true', { timeout: 30000 });
  await page.screenshot({ path: '/tmp/orla-mobile.png' });
  await page.getByRole('button', { name: 'Explorar a orla' }).click();
  await expect(page.locator('#session')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Andar para frente' })).toBeVisible();
  const before = await page.evaluate(() => window.orlaState().position);
  const button = await page.getByRole('button', { name: 'Andar para frente' }).boundingBox();
  await page.mouse.move(button.x + button.width / 2, button.y + button.height / 2);
  await page.mouse.down();
  await expect.poll(async () => {
    const p = await page.evaluate(() => window.orlaState().position);
    return Math.hypot(p[0] - before[0], p[2] - before[2]);
  }, { timeout: 20000 }).toBeGreaterThan(.5);
  await page.mouse.up();
  const after = await page.evaluate(() => window.orlaState().position);
  expect(Math.hypot(after[0] - before[0], after[2] - before[2])).toBeGreaterThan(.2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

});
