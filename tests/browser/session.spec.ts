import { test, expect, type WebSocketRoute } from '@playwright/test';
import { PROTOCOL_VERSION } from '../../src/shared/protocol.ts';

for (const layout of ['normal', 'paisagem'] as const) {
  test(`derrota solo persiste e retorna à vila com o progresso preservado (${layout})`, async ({ page }, info) => {
    test.skip(layout === 'paisagem' && info.project.name !== 'android', 'Cobertura da orientação Android');
    if (layout === 'paisagem') await page.setViewportSize({ width: 600, height: 390 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    // The Slime naturally spawns at these coordinates. Start within one hit of defeat.
    const save = { seed: 842136, x: -560, y: -1008, hp: 1, experience: 50,
      kills: 5, defeated: ['old-slime'], inventory: { gel: 9, potion: 2, questRewardClaimed: true } };
    await page.addInitScript(value => {
      if (!localStorage.getItem('terrania-origins-v1'))
        localStorage.setItem('terrania-origins-v1', JSON.stringify(value));
    }, save);
    await page.goto('/jogar/?modo=solo');
    const dialog = page.getByRole('dialog', { name: 'Você foi derrotado' });
    await expect(dialog).toBeVisible();
    await expect(page.locator('#hpText')).toHaveText('0 / 110');
    const checkpoint = await page.evaluate(() => JSON.parse(localStorage.getItem('terrania-origins-v1')!));
    expect(checkpoint).toMatchObject({ ...save, hp: 0, awaitingRespawn: true });

    await page.reload();
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    const respawn = dialog.getByRole('button', { name: 'Retornar à vila' });
    await expect(respawn).toBeFocused();
    if (info.project.name === 'android') await respawn.tap();
    else await respawn.press('Enter');
    await expect(dialog).toBeHidden();
    await expect(page.locator('#coords')).toHaveText('X 13 · Y 1');
    await expect(page.locator('#hpText')).toHaveText('110 / 110');
    await expect(page.locator('#xpText')).toHaveText('XP 20 / 60');
    await expect(page.locator('#questProgress')).toHaveText('Missão concluída ✓');
    const revived = await page.evaluate(() => JSON.parse(localStorage.getItem('terrania-origins-v1')!));
    expect(revived).toMatchObject({ ...save, x: 432, y: 48, hp: 110 });
    expect(revived).not.toHaveProperty('awaitingRespawn');

    await page.keyboard.down('s');
    await expect(page.locator('#coords')).not.toHaveText('X 13 · Y 1');
    await page.keyboard.up('s');
    expect(errors).toEqual([]);
  });
}

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
  const save = { seed: 71234, x: 16, y: 16, hp: 79, kills: 5, defeated: ['old-slime'], experience: 50,
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
  await page.locator('#gameMenuButton').click();
  await page.locator('#settingsButton').click();
  socket!.send(JSON.stringify({ type: 'welcome', version: PROTOCOL_VERSION,
    id: 'session-test', room: 'solo-save', seed: 842136 }));
  await expect(page.locator('#multiplayerStatus')).toContainText('Online');
  await expect(page.locator('#xpText')).toHaveCount(0);
  const checkpoint = await page.evaluate(() => JSON.parse(localStorage.getItem('terrania-origins-v1')!));
  expect(checkpoint.x).toBeGreaterThan(save.x);
  expect(checkpoint.seed).toBe(save.seed);
  expect(checkpoint.hp).toBe(save.hp);
  expect(checkpoint.experience).toBe(save.experience);
  expect(checkpoint.inventory).toEqual(save.inventory);
  await page.locator('#settingsDialog .dialog-x').click();
  await page.locator('.game-brand').click();
  await expect(page.locator('canvas#game')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('terrania-origins-v1')!))).toEqual(checkpoint);
  await page.goto('/jogar/?modo=solo');
  await expect(page.locator('canvas#game')).toBeVisible();
  await expect(page.locator('#seed')).toHaveText(String(save.seed));
  await expect(page.locator('#hpText')).toHaveText('79 / 110');
  await expect(page.locator('#xpText')).toHaveText('XP 20 / 60');
  await page.locator('#gameMenuButton').click();
  await page.locator('#inventoryButton').click();
  await expect(page.locator('#gelCount')).toHaveText('9 / 99');
  await expect(page.locator('#potionCount')).toHaveText('2 / 99');
  await page.locator('#usePotion').click();
  await expect(page.locator('#inventoryFeedback')).toContainText('Poção utilizada');
  await expect(page.locator('#hpText')).toHaveText('110 / 110');
  await expect(page.locator('#potionCount')).toHaveText('1 / 99');
  const healed = await page.evaluate(() => JSON.parse(localStorage.getItem('terrania-origins-v1')!));
  expect(healed).toMatchObject({ hp: 110, experience: 50, inventory: { gel: 9, potion: 1, questRewardClaimed: true } });
});

test('a coleta de gel confirma a quantidade na tela e persiste na bolsa', async ({ page }, info) => {
  await page.addInitScript(() => {
    const key = 'terrania-origins-v1';
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({
      seed: 842136, x: 16, y: 16, hp: 100, kills: 2, defeated: ['gel-a', 'gel-b'],
      inventory: { gel: 5, potion: 0, questRewardClaimed: false },
      drops: ['gel-a', 'gel-b'].map(id => ({ id, item: 'gel', x: 64, y: 16 })),
    }));
    localStorage.setItem('terrania-preferences-v1', JSON.stringify({ zoom: 1, effects: true, cameraMotion: false }));
    const labels: string[] = [];
    Object.assign(window, { pickupLabels: labels });
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      if (text.endsWith(' Gel de slime')) labels.push(text);
      if (maxWidth === undefined) fillText.call(this, text, x, y);
      else fillText.call(this, text, x, y, maxWidth);
    };
  });
  const time = new Date('2026-01-01T00:00:00Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(new Date(time.getTime() + 1000));
  await page.goto('/jogar/?modo=solo');
  const canvas = page.locator('canvas#game');
  const waitForGame = () => expect.poll(async () => {
    await page.clock.runFor(32);
    return canvas.count();
  }).toBe(1);
  const readLabels = () => page.evaluate(() =>
    (window as typeof window & { pickupLabels: string[] }).pickupLabels.splice(0));
  const readSave = () => page.evaluate(() => JSON.parse(localStorage.getItem('terrania-origins-v1')!));
  await waitForGame();
  await page.clock.runFor(80);
  expect(await readLabels()).toEqual([]);

  const bounds = (await canvas.boundingBox())!;
  const position = { x: bounds.width / 2 + 32, y: bounds.height / 2 };
  if (info.project.name === 'android') await canvas.tap({ position });
  else await canvas.click({ position });
  await page.clock.runFor(400);
  expect(new Set(await readLabels())).toEqual(new Set(['+2 Gel de slime']));
  expect(await readSave()).toMatchObject({ inventory: { gel: 7 }, drops: [] });

  await page.clock.runFor(1300);
  await readLabels();
  await page.clock.runFor(64);
  expect(await readLabels()).toEqual([]);
  await page.reload();
  await waitForGame();
  await page.clock.runFor(160);
  expect(await readLabels()).toEqual([]);
  expect(await readSave()).toMatchObject({ inventory: { gel: 7 }, drops: [] });
});

test('Lina troca gel no solo e a poção permanece utilizável depois de recarregar', async ({ page }, info) => {
  const save = { seed: 842136, x: 448, y: 240, hp: 75, kills: 3, experience: 30,
    defeated: [], inventory: { gel: 5, potion: 0, questRewardClaimed: false } };
  await page.addInitScript(value => {
    if (!localStorage.getItem('terrania-origins-v1'))
      localStorage.setItem('terrania-origins-v1', JSON.stringify(value));
  }, save);
  const activate = async (locator: ReturnType<typeof page.locator>) => {
    if (info.project.name === 'android') await locator.tap();
    else await locator.click();
  };
  await page.goto('/jogar/?modo=solo');
  await activate(page.getByRole('button', { name: 'Conversar (E)' }));
  const dialogue = page.getByRole('dialog', { name: 'Lina' });
  const trade = dialogue.getByRole('button', { name: 'Trocar 3 de gel por 1 poção' });
  await activate(trade);
  await expect(dialogue.getByRole('status')).toContainText('colocou uma poção');
  await expect(dialogue.getByText('Gel 2 · Poções 1')).toBeVisible();
  await activate(trade);
  await expect(dialogue.getByRole('status')).toContainText('precisa de 3 unidades de gel');

  await page.reload();
  await activate(page.locator('#gameMenuButton'));
  await activate(page.locator('#inventoryButton'));
  await expect(page.locator('#gelCount')).toHaveText('2 / 99');
  await expect(page.locator('#potionCount')).toHaveText('1 / 99');
  await activate(page.locator('#usePotion'));
  await expect(page.locator('#hpText')).toHaveText('110 / 110');
  await expect(page.locator('#potionCount')).toHaveText('0 / 99');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('terrania-origins-v1')!)))
    .toMatchObject({ hp: 110, inventory: { gel: 2, potion: 0, questRewardClaimed: false } });
});

test('Toren vende a espada e o herói conserva qual arma equipou ao recarregar', async ({ page }, info) => {
  const android = info.project.name === 'android';
  if (android) await page.setViewportSize({ width: 600, height: 390 });
  await page.addInitScript(() => {
    const key = 'terrania-origins-v1';
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ seed: 842136,
      x: 528, y: 48, hp: 100, kills: 5, defeated: [], inventory: { gel: 7, potion: 0 } }));
  });
  const activate = (button: ReturnType<typeof page.locator>) => android ? button.tap() : button.click();
  const openBag = async () => {
    await activate(page.locator('#gameMenuButton'));
    await activate(page.locator('#inventoryButton'));
  };
  await page.goto('/jogar/?modo=solo');
  await activate(page.getByRole('button', { name: 'Conversar (E)' }));
  const toren = page.getByRole('dialog', { name: 'Toren' });
  await activate(toren.getByRole('button', { name: 'Comprar Espada da Travessia por 5 de gel' }));
  await expect(toren.getByRole('status')).toContainText('Toren colocou');
  await expect(toren.getByRole('button', { name: 'Espada já adquirida' })).toBeDisabled();
  await activate(toren.getByRole('button', { name: 'Fechar conversa' }));

  await openBag();
  await expect(page.locator('#gelCount')).toHaveText('2 / 99');
  await expect(page.locator('#equippedWeapon')).toHaveText('Espada de viagem');
  await activate(page.getByRole('button', { name: 'Equipar Espada da Travessia' }));
  await expect(page.locator('#equippedWeapon')).toHaveText('Espada da Travessia');
  await expect(page.getByText('2 de dano · 2 s entre golpes', { exact: true })).toBeVisible();
  await page.reload();
  await openBag();
  await expect(page.locator('#equippedWeapon')).toHaveText('Espada da Travessia');
  await activate(page.getByRole('button', { name: 'Equipar Espada de viagem' }));
  await expect(page.locator('#equippedWeapon')).toHaveText('Espada de viagem');
  await expect(page.getByRole('button', { name: 'Equipar Espada da Travessia' })).toBeVisible();
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
