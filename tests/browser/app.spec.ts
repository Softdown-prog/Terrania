import { test, expect } from '@playwright/test';

test('site Angular preserva páginas, menu, links de sala e carregamento direto', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const [route, title] of [['/', 'Há um mundo'], ['/mundo/', 'mundo'], ['/guia/', 'jogar'],
    ['/novidades/', 'Novidades'], ['/comunidade/', 'Comunidade'], ['/privacidade/', 'Privacidade'], ['/termos/', 'Termos']]) {
    await page.goto(route!);
    await expect(page).toHaveTitle(new RegExp(title!, 'i'));
    await expect(page.locator('#conteudo')).toBeVisible();
    await expect(page.locator('body')).not.toHaveClass('game-page');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.goto('/');
  if (await page.locator('.nav-toggle').isVisible()) {
    await page.locator('.nav-toggle').click();
    await expect(page.locator('#main-nav')).toHaveClass(/open/);
  }
  await page.locator('#main-nav a').filter({hasText:'Comunidade'}).click();
  await expect(page).toHaveURL(/comunidade/);
  await page.locator('#room').fill('amigos-42');
  await page.getByRole('button', { name: /Acessar sala/ }).click();
  await expect(page).toHaveURL(/jogar\/?\?room=amigos-42/);
  await expect(page.locator('canvas#game')).toBeVisible();
  expect(errors).toEqual([]);
});

test('Phaser 3 inicia o mundo, Angular controla ajustes/bolsa e sair libera o jogador', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/jogar/?modo=solo');
  await expect(page.locator('canvas#game')).toBeVisible();
  const before = await page.locator('#coords').textContent();
  await page.keyboard.down('d');
  await expect(page.locator('#coords')).not.toHaveText(before!);
  await page.keyboard.up('d');
  await page.screenshot({path:test.info().outputPath('game.png')});
  await page.locator('#settingsButton').click();
  await expect(page.locator('#settingsDialog')).toBeVisible();
  await page.locator('#zoom').fill('2');
  await expect(page.locator('#zoomValue')).toHaveText('2.00×');
  await page.locator('#settingsDialog .dialog-x').click();
  await page.locator('#inventoryButton').click();
  await expect(page.locator('#inventoryDialog')).toBeVisible();
  await expect(page.locator('#gelCount')).toHaveText('0 / 99');
  await page.locator('#inventoryDialog .dialog-x').click();
  await page.locator('#helpButton').click();
  await expect(page.locator('#helpDialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#helpDialog')).not.toBeVisible();
  await page.setViewportSize({ width: 780, height: 390 });
  await expect.poll(async () => page.locator('#game').evaluate(canvas => Math.round(canvas.getBoundingClientRect().width))).toBe(780);
  await page.locator('.game-brand').click();
  await expect(page.locator('canvas#game')).toHaveCount(0);
  await page.goto('/jogar/?room=lifecycle');
  await expect(page.locator('#multiplayerStatus')).toContainText('Online');
  await page.locator('.game-brand').click();
  await expect.poll(async () => (await (await page.request.get('http://127.0.0.1:18787/presence')).json()).online).toBe(0);
  expect(errors).toEqual([]);
});

test('painel consulta conexões reais em duas salas, atualiza 2→1→0 e não inventa zero nas falhas', async ({ page, context }) => {
  await page.goto('/comunidade/');
  const first = await context.newPage();
  const second = await context.newPage();
  try {
    await first.goto('/jogar/?room=presence-a');
    await expect(first.locator('#multiplayerStatus')).toContainText('Online');
    await second.goto('/jogar/?room=presence-b');
    await expect(second.locator('#multiplayerStatus')).toContainText('Online');
    await expect(page.getByTestId('online-count')).toHaveText('2');
    await second.close();
    await expect(page.getByTestId('online-count')).toHaveText('1');
    await first.close();
    await expect(page.getByTestId('online-count')).toHaveText('0');
    await page.route('**/presence', route => route.fulfill({ status: 503, body: 'unavailable' }));
    await expect(page.getByTestId('online-count')).toHaveText('—');
    await expect(page.getByText('Contagem indisponível')).toBeVisible();
    await page.unroute('**/presence');
    await expect(page.getByTestId('online-count')).toHaveText('0');
  } finally { await first.close(); await second.close(); }
});
