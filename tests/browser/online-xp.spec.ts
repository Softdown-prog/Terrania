import { test, expect, type WebSocketRoute } from '@playwright/test';
import { PROTOCOL_VERSION } from '../../src/shared/protocol.ts';

test('XP online vem do servidor Go; HUD Android exibe nível real e solo não muda', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.addInitScript(() => {
    localStorage.setItem('terrania-origins-v1', JSON.stringify({
      seed: 842136, x: 16, y: 16, hp: 107, kills: 5, experience: 50, defeated: [],
    }));
  });
  let ws: WebSocketRoute | undefined;
  await page.routeWebSocket('ws://127.0.0.1:18787/ws*', socket => { ws = socket; });
  await page.goto('/jogar/?room=go-xp-test');
  await expect.poll(() => ws !== undefined).toBe(true);
  ws!.send(JSON.stringify({
    type: 'welcome', version: PROTOCOL_VERSION, id: 'hero-go', room: 'go-xp-test', seed: 842136,
  }));
  await expect(page.locator('#multiplayerStatus')).toContainText('Online');
  await expect(page.locator('#xpText')).toHaveCount(0);
  ws!.send(JSON.stringify({
    type: 'state', players: [{
      id: 'hero-go', name: 'Alice', x: 16, y: 16, hp: 105, maxHp: 110, kills: 2,
      slimeKills: 1, experience: 50, level: 2, faceX: 1, faceY: 0,
      walkTime: 0, attackTime: 0, vx: 0, vy: 0, hurtTime: 0,
    }], mobs: [],
  }));
  await expect(page.locator('.vitals .stat-heading span')).toHaveText('NÍVEL 2');
  await expect(page.locator('#hpText')).toHaveText('105 / 110');
  await expect(page.locator('#xpText')).toHaveText('XP 50 / 90');
  await expect(page.locator('#questProgress')).toContainText('1 / 5 slimes');
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('terrania-origins-v1')!));
  expect(save.experience).toBe(50);
  expect(save.hp).toBe(107);
  // A malformed or stale server payload must not display fabricated XP.
  ws!.send(JSON.stringify({
    type: 'state', players: [{
      id: 'hero-go', name: 'Alice', x: 16, y: 16, hp: 99, maxHp: 100, kills: 2,
      slimeKills: 1, experience: 50, level: 2, faceX: 1, faceY: 0,
      walkTime: 0, attackTime: 0, vx: 0, vy: 0,
    }], mobs: [],
  }));
  await expect(page.locator('#xpText')).toHaveCount(0);
  await expect(page.locator('#hpText')).toHaveText('99 / 100');
  await page.goto('/jogar/?modo=solo');
  await expect(page.locator('#hpText')).toHaveText('107 / 110');
  await expect(page.locator('#xpText')).toHaveText('XP 50 / 90');
});

test('servidor antigo não tem XP online; apenas Go habilita os dados', async ({page}) => {
  let socket: WebSocketRoute | undefined;
  await page.routeWebSocket('ws://127.0.0.1:18787/ws*', ws => { socket = ws; });
  await page.goto('/jogar/?room=legacy-xp-test');
  await expect.poll(() => socket !== undefined).toBe(true);
  socket!.send(JSON.stringify({
    type: 'welcome', version: PROTOCOL_VERSION, id: 'legacy', room: 'legacy-xp-test', seed: 842136,
  }));
  await expect(page.locator('#multiplayerStatus')).toContainText('Online');
  socket!.send(JSON.stringify({
    type: 'state', players: [{
      id: 'legacy', name: 'Old', x: 16, y: 16, hp: 100, kills: 5,
      faceX: 1, faceY: 0, walkTime: 0, attackTime: 0,
    }], mobs: [],
  }));
  await expect(page.locator('.vitals .stat-heading span')).toHaveText('AVENTUREIRO');
  await expect(page.locator('#xpText')).toHaveCount(0);
});
