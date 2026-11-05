import { expect, test } from '@playwright/test';

test('toque para caminhar online transmite movimento autoritativo observado pelo segundo jogador', async ({ page, context }, testInfo) => {
  const observed = { id: '', movement: '', remoteX: Number.NaN, remoteY: Number.NaN };
  const sentWalks: unknown[] = [];
  const visitor = await context.newPage();
  try {
    await page.addInitScript(() => localStorage.setItem('terrania-preferences-v1', JSON.stringify({
      zoom: 1.5, effects: false, cameraMotion: false,
    })));
    page.on('websocket', socket => {
      if (!socket.url().includes('/ws')) return;
      socket.on('framesent', ({ payload }) => {
        const message = JSON.parse(String(payload)) as { type: string };
        if (message.type === 'walk') sentWalks.push(message);
      });
      socket.on('framereceived', ({ payload }) => {
        try {
          const message = JSON.parse(String(payload)) as { type?: string; id?: string; movement?: string };
          if (message.type === 'welcome' && message.id) {
            observed.id = message.id;
            observed.movement = message.movement ?? '';
          }
        } catch { /* Respostas inválidas não contam como confirmação de sessão. */ }
      });
    });
    visitor.on('websocket', socket => {
      if (!socket.url().includes('/ws')) return;
      socket.on('framereceived', ({ payload }) => {
        try {
          const message = JSON.parse(String(payload)) as {
            type?: string; players?: { id: string; x: number; y: number }[];
          };
          if (message.type !== 'state' || !observed.id) return;
          const player = message.players?.find(p => p.id === observed.id);
          if (player && Number.isFinite(player.x)) {
            observed.remoteX = player.x;
            observed.remoteY = player.y;
          }
        } catch { /* Ignora frame inválido; o teste vai falhar por timeout. */ }
      });
    });

    await page.goto('/jogar/?room=tap-online');
    await expect(page.locator('#multiplayerStatus')).toContainText('Online');
    await expect.poll(() => observed.id.length).toBeGreaterThan(0);
    expect(observed.movement).toBe('tiles');
    await visitor.goto('/jogar/?room=tap-online');
    await expect(visitor.locator('#multiplayerStatus')).toContainText('Online');
    await expect.poll(() => Number.isFinite(observed.remoteX)).toBe(true);
    expect([observed.remoteX, observed.remoteY]).toEqual([16, 16]);

    const canvas = page.locator('canvas#game');
    const point = await canvas.evaluate(element => {
      const rect = element.getBoundingClientRect();
      return {
        localX: rect.width / 2 + 75,
        localY: rect.height / 2,
        screenX: rect.left + rect.width / 2 + 75,
        screenY: rect.top + rect.height / 2,
      };
    });
    if (testInfo.project.name === 'android') {
      // Gera eventos touch/pointer reais na emulação Pixel 5, não um click de mouse.
      await expect(page.locator('#joystick')).toBeVisible();
      await page.touchscreen.tap(point.screenX, point.screenY);
    } else {
      await canvas.click({ position: { x: point.localX, y: point.localY } });
    }
    // Posição recebida via WebSocket pelo outro jogador, não somente predição do cliente.
    await expect.poll(() => [observed.remoteX, observed.remoteY], { timeout: 12000 }).toEqual([80, 16]);
    await expect(page.locator('#coords')).toHaveText('X 2 · Y 0');
    expect(sentWalks).toHaveLength(1);
    await expect(page.locator('#multiplayerStatus')).toContainText('Online');
  } finally {
    await visitor.close();
  }
});

test('Battle List da sala Node persegue e derrota um Slime do servidor', async ({ page }, info) => {
  const android = info.project.name === 'android';
  await page.setViewportSize({ width: android ? 390 : 1200, height: 900 });
  await page.addInitScript(() => localStorage.setItem('terrania-preferences-v1', JSON.stringify({
    zoom: 1, effects: false, cameraMotion: false,
  })));
  let selfId = '';
  let kills = 0;
  page.on('websocket', socket => socket.on('framereceived', ({ payload }) => {
    const message = JSON.parse(String(payload));
    if (message.type === 'welcome') selfId = message.id;
    if (message.type === 'state') kills = message.players.find((hero: {id: string}) => hero.id === selfId)?.kills ?? 0;
  }));
  await page.goto('/jogar/?room=origins');
  await expect(page.locator('#multiplayerStatus')).toContainText('Online');
  await expect(page.locator('#xpText')).toHaveText('XP 0 / 30');
  const toggle = page.locator('#battleToggle');
  if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.tap();
  const row = page.locator('[data-creature-id="0,-1,0"]');
  await expect(row).toBeVisible();
  if (android) await row.tap();
  else await row.click();
  await expect(page.locator('#classicTarget')).toContainText('Slime');
  await expect.poll(() => kills, { timeout: 15000 }).toBe(1);
  await expect(page.locator('#xpText')).toHaveText('XP 10 / 30');
  await expect(row).toHaveCount(0);
  await expect(page.locator('#classicTarget')).toHaveCount(0);
});
