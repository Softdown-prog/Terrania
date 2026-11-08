import { expect, test, type WebSocketRoute } from '@playwright/test';
import { PROTOCOL_VERSION, type InventoryMessage, type RoomInventoryState } from '../../src/shared/protocol.ts';

test('as botas continuam animadas com um relógio de sala mais lento', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 500 });
  await page.addInitScript(() => {
    const boots: number[] = [];
    Object.assign(window, { walkBoots: boots });
    const fillRect = CanvasRenderingContext2D.prototype.fillRect;
    let firstBoot: number | null = null;
    CanvasRenderingContext2D.prototype.fillRect = function (x, y, width, height) {
      // A arte procedural atual desenha duas botas de 5,2×4 px por personagem.
      // Medimos a menor posição X do par por quadro (sem confundir com o passo de outra bota).
      if (this.fillStyle === '#4c3a2d' && Math.abs(width - 5.2) < 1e-6 &&
          Math.abs(height - 4) < 1e-6) {
        if (firstBoot === null) firstBoot = x;
        else { boots.push(Math.min(firstBoot, x)); firstBoot = null; }
      }
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
  // O período amostrado deve conter deslocamentos distintos, não uma pose estática.
  expect(new Set(boots.map(x => x.toFixed(2))).size).toBeGreaterThan(6);
  expect(boots.filter(x => Math.abs(x - boots[0]!) > 0.1).length / boots.length).toBeGreaterThan(0.65);
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
  let inventory: RoomInventoryState | undefined;
  page.on('websocket', socket => socket.on('framereceived', ({ payload }) => {
    const message = JSON.parse(String(payload));
    if (message.type === 'welcome') selfId = message.id;
    if (message.type === 'state') {
      kills = message.players.find((hero: {id: string}) => hero.id === selfId)?.kills ?? 0;
      inventory = message.inventory;
    }
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
  await expect.poll(() => inventory && inventory.gel + inventory.drops.length).toBe(1);
  await expect(page.locator('#xpText')).toHaveText('XP 10 / 30');
  await expect(row).toHaveCount(0);
  await expect(page.locator('#classicTarget')).toHaveCount(0);
  await page.locator('#gameMenuButton').click();
  await page.locator('#inventoryButton').click();
  await expect(page.locator('#equippedWeapon')).toHaveText('Espada de viagem');
  await expect.poll(async () => (await page.locator('#gelCount').textContent()) === `${inventory?.gel} / 99`).toBe(true);
});

test('a bolsa online aguarda o recibo da sala para trocar e curar', async ({ page }, info) => {
  let socket: WebSocketRoute | undefined;
  const requests: InventoryMessage[] = [];
  const soloInventory = { gel: 9, potion: 2, questRewardClaimed: true };
  await page.addInitScript(inventory => {
    localStorage.setItem('terrania-origins-v1', JSON.stringify({ seed: 842136, x: 16, y: 16,
      hp: 80, kills: 5, defeated: [], inventory }));
  }, soloInventory);
  await page.routeWebSocket('ws://127.0.0.1:18787/ws*', ws => {
    socket = ws;
    ws.onMessage(raw => {
      const message = JSON.parse(String(raw));
      if (message.type === 'inventory') requests.push(message);
    });
    ws.send(JSON.stringify({ type: 'welcome', version: PROTOCOL_VERSION, id: 'a',
      room: 'potion-test', seed: 842136, inventory: 'loot' }));
  });
  await page.goto('/jogar/?room=potion-test');
  await expect(page.locator('#multiplayerStatus')).toContainText('Online');
  const snapshot = (hp: number, inventory: RoomInventoryState) => socket!.send(JSON.stringify({
    type: 'state', inventory, mobs: [],
    players: [{ id: 'a', name: 'Hero', x: 448, y: 250, hp, kills: 3, faceX: 1, faceY: 0, walkTime: 0, attackTime: 0 }],
  }));
  snapshot(40, { gel: 3, potion: 0, drops: [], receipt: null });
  const talk = page.locator('#talkButton');
  await expect(talk).toBeVisible();
  if (info.project.name === 'android') await talk.tap();
  else await talk.click();
  const dialogue = page.getByRole('dialog', { name: 'Lina' });
  const trade = dialogue.getByRole('button', { name: 'Trocar 3 de gel por 1 poção' });
  await trade.click();
  await expect(trade).toBeDisabled();
  await expect.poll(() => requests).toEqual([{ type: 'inventory', action: 'trade-potion', requestId: 1 }]);
  await expect(dialogue.getByText('Gel 3 · Poções 0')).toBeVisible();
  const traded = { gel: 0, potion: 1, drops: [], receipt: {
    requestId: 1, action: 'trade-potion', outcome: 'traded',
  } } satisfies RoomInventoryState;
  snapshot(40, traded);
  await expect(dialogue.getByText('Gel 0 · Poções 1')).toBeVisible();
  await expect(dialogue.getByRole('status')).toContainText('Lina colocou uma poção');
  await dialogue.getByRole('button', { name: 'Fechar conversa' }).click();

  await page.locator('#gameMenuButton').click();
  await page.locator('#inventoryButton').click();
  const use = page.locator('#usePotion');
  await use.click();
  await expect(use).toBeDisabled();
  await expect.poll(() => requests.at(-1)).toEqual({ type: 'inventory', action: 'use-potion', requestId: 2 });
  snapshot(40, traded);
  await expect(page.locator('#inventoryFeedback')).toContainText('Aguardando');
  await expect(page.locator('#hpText')).toHaveText('40 / 100');
  await expect(page.locator('#potionCount')).toHaveText('1 / 99');
  snapshot(75, { gel: 0, potion: 0, drops: [], receipt: {
    requestId: 2, action: 'use-potion', outcome: 'healed',
  } });
  await expect(page.locator('#inventoryFeedback')).toContainText('Poção utilizada');
  await expect(page.locator('#hpText')).toHaveText('75 / 100');
  await expect(page.locator('#potionCount')).toHaveText('0 / 99');
  expect(requests).toHaveLength(2);
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('terrania-origins-v1')!));
  expect(save).toMatchObject({ hp: 80, inventory: soloInventory });
});

test('a forja online usa a posse e a espada equipada confirmadas pela sala', async ({ page }) => {
  const commands: InventoryMessage[] = [];
  let socket: WebSocketRoute | undefined;
  await page.routeWebSocket('ws://127.0.0.1:18787/ws*', ws => {
    socket = ws;
    expect(new URL(ws.url()).searchParams.get('equipment')).toBe('forge');
    ws.onMessage(raw => {
      const message = JSON.parse(String(raw));
      if (message.type === 'inventory') commands.push(message);
    });
    ws.send(JSON.stringify({ type: 'welcome', version: PROTOCOL_VERSION, id: 'a',
      room: 'forge-test', seed: 842136, inventory: 'loot' }));
  });
  await page.goto('/jogar/?room=forge-test');
  await expect(page.locator('#multiplayerStatus')).toContainText('Online');
  const state = (inventory: RoomInventoryState) => socket!.send(JSON.stringify({
    type: 'state', inventory, mobs: [],
    players: [{ id: 'a', name: 'Hero', x: 528, y: 48, hp: 100, kills: 5, faceX: 1, faceY: 0, walkTime: 0, attackTime: 0 }],
  }));
  state({ gel: 5, potion: 0, drops: [], loadout: { forged: false, equipped: 'starter' }, receipt: null });
  await page.locator('#talkButton').click();
  const toren = page.getByRole('dialog', { name: 'Toren' });
  const buy = toren.getByRole('button', { name: 'Comprar Espada da Travessia por 5 de gel' });
  await buy.click();
  await expect(buy).toBeDisabled();
  await expect.poll(() => commands.at(0)).toEqual({ type: 'inventory', action: 'buy-sword', requestId: 1 });
  const purchased: RoomInventoryState = { gel: 0, potion: 0, drops: [], loadout: { forged: true, equipped: 'starter' },
    receipt: { requestId: 1, action: 'buy-sword', outcome: 'purchased' } };
  state(purchased);
  await expect(toren.getByRole('status')).toContainText('Toren colocou');
  await toren.getByRole('button', { name: 'Fechar conversa' }).click();
  await page.locator('#gameMenuButton').click();
  await page.locator('#inventoryButton').click();
  const equipmentTab = page.locator('#inventoryTabEquipment');
  if (await equipmentTab.isVisible()) await equipmentTab.click();
  await expect(page.locator('#equippedWeapon')).toHaveText('Espada de viagem');
  await page.getByRole('button', { name: 'Equipar Espada da Travessia' }).click();
  await expect.poll(() => commands.at(1)).toEqual({ type: 'inventory', action: 'equip-forge', requestId: 2 });
  await expect(page.locator('#equippedWeapon')).toHaveText('Espada de viagem');
  state({ ...purchased, loadout: { forged: true, equipped: 'forge' },
    receipt: { requestId: 2, action: 'equip-forge', outcome: 'equipped' } });
  await expect(page.locator('#equippedWeapon')).toHaveText('Espada da Travessia');
  await expect(page.locator('#inventoryFeedback')).toHaveText('Espada equipada.');
  expect(commands).toHaveLength(2);
});
test('a sala Node confirma equipar e tirar o escudo', async ({ page }) => {
  await page.goto('/jogar/?room=equipamento-qa');
  await expect(page.locator('#multiplayerStatus')).toContainText('Online');
  await page.locator('#gameMenuButton').click();
  await page.locator('#inventoryButton').click();
  const equipmentTab = page.locator('#inventoryTabEquipment');
  if (await equipmentTab.isVisible()) await equipmentTab.click();
  const slot = page.locator('[data-equipment-slot="shield"]');
  await slot.click();
  await page.getByRole('button', { name: 'Equipar Escudo de salgueiro' }).click();
  await expect(slot).toContainText('Escudo de salgueiro');
  await expect(page.locator('#equipmentDefense')).toHaveText('Defesa 2');
  await expect(page.locator('#inventoryFeedback')).toHaveText('Item equipado.');
  await page.getByRole('button', { name: 'Retirar Escudo de salgueiro' }).click();
  await expect(slot).toContainText('Vazio');
  await expect(page.locator('#equipmentDefense')).toHaveText('Defesa 0');
});
