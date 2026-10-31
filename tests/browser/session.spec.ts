import { test, expect, type WebSocketRoute } from '@playwright/test';
import { PROTOCOL_VERSION } from '../../src/shared/protocol.ts';

test('contador para ao sair da tela e consulta novamente ao voltar', async ({ page }) => {
  let requests = 0;
  await page.route('**/presence', async route => {
    requests++;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': 'http://127.0.0.1:5173' },
      body: JSON.stringify({ online: requests === 1 ? 7 : 2, rooms: 1,
        updatedAt: new Date().toISOString(), scope: 'server' }),
    });
  });
  await page.goto('/comunidade/');
  await expect(page.getByTestId('online-count')).toHaveText('7');
  await page.getByRole('link', { name: 'Privacidade', exact: true }).click();
  await expect(page).toHaveTitle(/Privacidade/);
  await expect(page.locator('app-online-players')).toHaveCount(0);
  const before = requests;
  // Wait beyond one polling period: a detached panel must own no request/timer.
  await page.waitForTimeout(5500);
  expect(requests).toBe(before);
  if (await page.locator('.nav-toggle').isVisible()) await page.locator('.nav-toggle').click();
  await page.locator('#main-nav a').filter({ hasText: 'Comunidade' }).click();
  await expect.poll(() => requests, { timeout: 2000 }).toBe(before + 1);
  await expect(page.getByTestId('online-count')).toHaveText('2');
});

test('entrada online e saída da rota preservam o progresso solo recente', async ({ page }) => {
  const save = { seed: 71234, x: 16, y: 16, hp: 79, kills: 5, defeated: ['old-slime'],
    inventory: { gel: 9, potion: 2, questRewardClaimed: true }, drops: [] };
  await page.addInitScript(value => {
    if (!localStorage.getItem('terrania-origins-v1'))
      localStorage.setItem('terrania-origins-v1', JSON.stringify(value));
  }, save);
  let socket: WebSocketRoute | undefined;
  await page.routeWebSocket('ws://127.0.0.1:18787/ws*', ws => { socket = ws; });
  await page.goto('/jogar/?room=solo-save');
  await expect(page.locator('canvas#game')).toBeVisible();
  await expect.poll(() => socket !== undefined).toBe(true);
  const coords = await page.locator('#coords').textContent();
  await page.keyboard.down('d');
  await expect(page.locator('#coords')).not.toHaveText(coords!);
  await page.keyboard.up('d');
  await page.locator('#settingsButton').click();
  socket!.send(JSON.stringify({ type: 'welcome', version: PROTOCOL_VERSION,
    id: 'session-test', room: 'solo-save', seed: 842136 }));
  await expect(page.locator('#multiplayerStatus')).toContainText('Online');
  const checkpoint = await page.evaluate(() => JSON.parse(localStorage.getItem('terrania-origins-v1')!));
  expect(checkpoint.x).toBeGreaterThan(save.x);
  expect(checkpoint.seed).toBe(save.seed);
  expect(checkpoint.hp).toBe(save.hp);
  expect(checkpoint.inventory).toEqual(save.inventory);
  await page.locator('#settingsDialog .dialog-x').click();
  await page.locator('.game-brand').click();
  await expect(page.locator('canvas#game')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('terrania-origins-v1')!))).toEqual(checkpoint);
  await page.goto('/jogar/?modo=solo');
  await expect(page.locator('canvas#game')).toBeVisible();
  await expect(page.locator('#seed')).toHaveText(String(save.seed));
  await expect(page.locator('#hpText')).toHaveText('79 / 100');
  await page.locator('#inventoryButton').click();
  await expect(page.locator('#gelCount')).toHaveText('9 / 99');
  await expect(page.locator('#potionCount')).toHaveText('2 / 99');
});

test('voltar ao painel não fica preso numa consulta cancelada da tela anterior', async ({ page }) => {
  let requests = 0;
  let release: () => void = () => {};
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/presence', async route => {
    const request = ++requests;
    if (request === 1) await pending;
    if (route.request().failure()) return;
    await route.fulfill({ status: 200, contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': 'http://127.0.0.1:5173' },
      body: JSON.stringify({ online: request === 1 ? 9 : 2, rooms: 1,
        updatedAt: new Date().toISOString(), scope: 'server' }),
    });
  });
  try {
    await page.goto('/comunidade/');
    await expect.poll(() => requests).toBe(1);
    await expect(page.getByTestId('online-count')).toHaveText('—');
    await page.getByRole('link', { name: 'Privacidade', exact: true }).click();
    await expect(page.locator('app-online-players')).toHaveCount(0);
    if (await page.locator('.nav-toggle').isVisible()) await page.locator('.nav-toggle').click();
    await page.locator('#main-nav a').filter({ hasText: 'Comunidade' }).click();
    await expect(page.getByTestId('online-count')).toHaveText('2', { timeout: 2000 });
    expect(requests).toBe(2);
    release();
    await page.waitForTimeout(100);
    await expect(page.getByTestId('online-count')).toHaveText('2');
  } finally { release(); }
});
