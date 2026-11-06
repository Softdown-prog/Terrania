import { expect, test, type WebSocketRoute } from '@playwright/test';
import { PROTOCOL_VERSION } from '../../src/shared/protocol.ts';

test('as botas continuam animadas com um relógio de sala mais lento', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 500 });
  await page.addInitScript(() => {
    const boots: number[] = [];
    Object.assign(window, { walkBoots: boots });
    const fillRect = CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.fillRect = function (x, y, width, height) {
      // Observe the left boot in the world texture, relative to the hero's body.
      if (this.fillStyle === '#584536' && width === 7 && height === 4 && x < 0) boots.push(x);
      fillRect.call(this, x, y, width, height);
    };
    localStorage.setItem('terrania-preferences-v1', JSON.stringify({ zoom: 1.65, effects: false, cameraMotion: false }));
  });
  let socket: WebSocketRoute | undefined;
  await page.routeWebSocket('ws://127.0.0.1:18787/ws*', ws => {
    socket = ws;
    ws.send(JSON.stringify({ type: 'welcome', version: PROTOCOL_VERSION, id: 'walker',
      room: 'walk-clock', seed: 842136, movement: 'tiles' }));
  });
  const time = new Date('2026-01-01T00:00:00Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(new Date(time.getTime() + 1000));
  await page.goto('/jogar/?room=walk-clock');
  await expect.poll(async () => {
    await page.clock.runFor(48);
    return page.locator('#multiplayerStatus').textContent();
  }).toContain('Online');

  const playPacket = async (packet: number) => {
    // Exaggerate the drift so the browser regression can finish in a few seconds.
    const time = packet * 0.094;
    const x = 16 + time * 126;
    socket!.send(JSON.stringify({ type: 'state', time, players: [{ id: 'walker', name: 'Walker',
      x, y: 16, hp: 100, kills: 0, faceX: 1, faceY: 0, walkTime: (x - 16) * 0.12,
      attackTime: 0, vx: 126, vy: 0, stepTarget: null }], mobs: [] }));
    await page.clock.runFor(100);
  };
  const readBoots = () => page.evaluate(() =>
    (window as typeof window & { walkBoots: number[] }).walkBoots.splice(0));
  for (let packet = 0; packet < 55; packet++) await playPacket(packet);
  await readBoots();
  for (let packet = 55; packet < 65; packet++) await playPacket(packet);
  const boots = await readBoots();
  expect(boots.length).toBeGreaterThan(40);
  expect(boots.filter(x => Math.abs(x + 7) > 0.1).length / boots.length).toBeGreaterThan(0.75);
});

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
