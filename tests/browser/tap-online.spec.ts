import { expect, test } from '@playwright/test';

test('toque para caminhar online transmite movimento autoritativo observado pelo segundo jogador', async ({ page, context }, testInfo) => {
  const observed = { id: '', remoteX: Number.NaN };
  const visitor = await context.newPage();
  try {
    page.on('websocket', socket => {
      if (!socket.url().includes('/ws')) return;
      socket.on('framereceived', ({ payload }) => {
        try {
          const message = JSON.parse(String(payload)) as { type?: string; id?: string };
          if (message.type === 'welcome' && message.id) observed.id = message.id;
        } catch { /* Respostas inválidas não contam como confirmação de sessão. */ }
      });
    });
    visitor.on('websocket', socket => {
      if (!socket.url().includes('/ws')) return;
      socket.on('framereceived', ({ payload }) => {
        try {
          const message = JSON.parse(String(payload)) as {
            type?: string; players?: { id: string; x: number }[];
          };
          if (message.type !== 'state' || !observed.id) return;
          const player = message.players?.find(p => p.id === observed.id);
          if (player && Number.isFinite(player.x)) observed.remoteX = player.x;
        } catch { /* Ignora frame inválido; o teste vai falhar por timeout. */ }
      });
    });

    await page.goto('/jogar/?room=tap-online');
    await expect(page.locator('#multiplayerStatus')).toContainText('Online');
    await expect.poll(() => observed.id.length).toBeGreaterThan(0);
    await visitor.goto('/jogar/?room=tap-online');
    await expect(visitor.locator('#multiplayerStatus')).toContainText('Online');
    await expect.poll(() => Number.isFinite(observed.remoteX)).toBe(true);
    const initialX = observed.remoteX;

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
    await expect.poll(() => observed.remoteX, { timeout: 12000 }).toBeGreaterThan(initialX + 8);
    await expect(page.locator('#multiplayerStatus')).toContainText('Online');
  } finally {
    await visitor.close();
  }
});
