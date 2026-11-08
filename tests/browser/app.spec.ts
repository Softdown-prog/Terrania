import { test, expect } from '@playwright/test';
import { BUILDINGS, SIGNS } from '../../src/world/village.ts';

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
  await page.locator('#gameMenuButton').click();
  await page.locator('#settingsButton').click();
  await expect(page.locator('#settingsDialog')).toBeVisible();
  await page.locator('#zoom').fill('2');
  await expect(page.locator('#zoomValue')).toHaveText('2.00×');
  await page.locator('#settingsDialog .dialog-x').click();
  await page.locator('#gameMenuButton').click();
  await page.locator('#inventoryButton').click();
  await expect(page.locator('#inventoryDialog')).toBeVisible();
  await expect(page.locator('#gelCount')).toHaveText('0 / 99');
  await page.locator('#inventoryDialog .dialog-x').click();
  await page.locator('#gameMenuButton').click();
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

test('HUD e diálogo da Aela exibem o progresso do jogo e a recompensa é entregue uma vez', async ({ page }, info) => {
  await page.addInitScript(() => {
    const mode = new URLSearchParams(location.search).get('modo');
    localStorage.setItem('terrania-origins-v1', JSON.stringify({
      seed: 842136, x: 16, y: 16, hp: 100, kills: mode === 'classico' ? 5 : 4, defeated: [],
    }));
  });
  const talk = page.locator('#talkButton');
  const npcDialog = page.locator('#npcDialog');
  const next = page.locator('#npcNext');
  const interact = () => info.project.name === 'android' ? talk.tap() : talk.click();

  await page.goto('/jogar/?modo=solo');
  await expect(page.locator('#questProgress')).toHaveText('4 / 5 slimes');
  await expect(page.locator('#questFill')).toHaveAttribute('style', /width:\s*80%/);
  await interact();
  await expect(npcDialog).toBeVisible();
  await expect(page.locator('#npcName')).toHaveText('Aela');
  await next.click();
  await expect(page.locator('#npcSpeech')).toContainText('Você derrotou 4 de 5 slimes');
  await expect(page.locator('#npcStep')).toHaveText('Mensagem 2 de 3');

  await page.goto('/jogar/?modo=classico');
  await expect(page.locator('#questProgress')).toHaveText('Missão concluída ✓');
  await expect(page.locator('#questFill')).toHaveAttribute('style', /width:\s*100%/);
  await interact();
  await expect(page.locator('#npcSpeech')).toContainText('Você conseguiu!');
  await expect(page.locator('#npcStep')).toHaveText('Mensagem 1 de 4');
  for (let index = 0; index < 3; index++) await next.click();
  await expect(page.locator('#npcSpeech')).toContainText('2 poções de cura guardadas na sua bolsa');
  await next.click();
  await expect(npcDialog).toBeHidden();
  await expect(page.locator('canvas#game')).toBeFocused();

  await interact();
  await expect(page.locator('#npcStep')).toHaveText('Mensagem 1 de 3');
  expect(await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('terrania-origins-v1') ?? '{}');
    return save.inventory;
  })).toEqual({ gel: 0, potion: 2, questRewardClaimed: true });
});

test('HUD oferece ler placa, entrar e sair conforme a interação do mundo', async ({ page }, info) => {
  const [council] = BUILDINGS;
  const [sign] = SIGNS;
  await page.addInitScript(({ sign, door }) => {
    const seed = Number(new URLSearchParams(location.search).get('seed'));
    const point = seed === 42 ? sign : door;
    localStorage.setItem('terrania-origins-v1', JSON.stringify({
      seed, x: point.x, y: point.y, hp: 100, kills: 0, defeated: [],
    }));
  }, { sign: { x: sign.x, y: sign.y + 24 }, door: { x: council.x, y: council.y + 29 } });
  const action = page.locator('#talkButton');
  const interact = () => info.project.name === 'android' ? action.tap() : action.click();

  await page.goto('/jogar/?modo=solo&seed=42');
  await expect(action).toHaveAccessibleName('Ler (E)');
  await interact();
  await expect(page.locator('#npcDialog')).toBeVisible();
  await expect(page.locator('#npcName')).toHaveText(sign.name);

  await page.goto('/jogar/?modo=solo&seed=842136');
  await expect(action).toHaveAccessibleName('Entrar (E)');
  const outside = page.locator('#coords');
  await expect(outside).toHaveText('X 11 · Y -2');
  await interact();
  await expect(action).toHaveAccessibleName('Sair (E)');
  await expect(page.locator('#quest')).toHaveText(council.name);
  await expect(page.locator('#npcDialog')).toBeHidden();
  await interact();
  await expect(action).toHaveAccessibleName('Entrar (E)');
  await expect(outside).toHaveText('X 11 · Y -2');
  await expect(page.locator('#questProgress')).toHaveText('0 / 5 slimes');
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

test('menu Angular mantém contador fora do cenário e só consulta presença na aba de jogadores', async ({ page }) => {
  let polls = 0;
  await page.route('**/presence', async route => {
    polls++;
    await route.fulfill({status: 200, contentType: 'application/json',
      body: JSON.stringify({online: 3, rooms: 2, scope: 'server', updatedAt: new Date().toISOString()})});
  });
  await page.goto('/jogar/?modo=solo');
  await expect(page.locator('canvas#game')).toBeVisible();
  await expect(page.locator('#gameToolActions')).toBeHidden();
  await expect(page.locator('.game-presence')).toHaveCount(0);
  await expect(page.locator('app-online-players')).toHaveCount(0);
  await page.waitForTimeout(150);
  expect(polls).toBe(0);
  await page.locator('#gameMenuButton').click();
  await expect(page.locator('#gameToolActions')).toBeVisible();
  await page.locator('#playersButton').click();
  await expect(page.locator('#gameToolActions')).toBeHidden();
  await expect(page.locator('#playersDialog')).toBeVisible();
  await expect(page.getByTestId('online-count')).toHaveText('3');
  expect(polls).toBeGreaterThan(0);
  await page.locator('#playersDialog .dialog-x').click();
  await expect(page.locator('#playersDialog')).not.toBeVisible();
  await expect(page.locator('app-online-players')).toHaveCount(0);
  await expect(page.locator('#gameMenuButton')).toBeVisible();
});


test('SAC visual: Canvas real do Phaser desenha mundo no desktop e Android, inclusive após resize', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const android = info.project.name === 'android';
  await page.setViewportSize(android ? { width: 390, height: 844 } : { width: 960, height: 640 });
  await page.addInitScript(() => {
    localStorage.setItem('terrania-origins-v1', JSON.stringify({
      seed: 842136, x: 16, y: 16, hp: 100, kills: 0, defeated: [],
    }));
    localStorage.setItem('terrania-preferences-v1', JSON.stringify({
      zoom: 1, effects: false, cameraMotion: false,
    }));
  });
  await page.goto('/jogar/?modo=solo');
  const canvas = page.locator('canvas#game');
  await expect(canvas).toBeVisible();

  // Analyze actual screenshot pixels from the browser's final Phaser canvas
  // (WebGL or Canvas), not only the intermediate procedural CanvasTexture.
  const measure = async (base64: string) => page.evaluate(async encoded => {
    const image = new Image();
    image.src = 'data:image/png;base64,' + encoded;
    await image.decode();
    const sample = document.createElement('canvas');
    sample.width = 32;
    sample.height = 20;
    const context = sample.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('canvas-2d-decoder-unavailable');
    context.drawImage(image, 0, 0, sample.width, sample.height);
    const rgba = context.getImageData(0, 0, sample.width, sample.height).data;
    const colors = new Set<number>();
    let visibleWorld = 0;
    let opaque = 0;
    for (let i = 0; i < rgba.length; i += 4) {
      const r = rgba[i]!, g = rgba[i + 1]!, b = rgba[i + 2]!, a = rgba[i + 3]!;
      colors.add(((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4));
      if (Math.abs(r - 11) + Math.abs(g - 8) + Math.abs(b - 18) > 28) visibleWorld++;
      if (a === 255) opaque++;
    }
    return { width: image.naturalWidth, height: image.naturalHeight,
      colors: colors.size, visibleWorld, opaque, sampled: sample.width * sample.height };
  }, base64);
  const capture = async () => measure((await canvas.screenshot()).toString('base64'));
  const screenshotHasWorld = (data: Awaited<ReturnType<typeof capture>>) =>
    data.colors >= 12 && data.visibleWorld >= 100 && data.opaque === data.sampled;

  // A deliberately empty canvas must be rejected by the same pixel evaluator.
  const blank = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 20;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#0b0812';
    ctx.fillRect(0, 0, c.width, c.height);
    return c.toDataURL('image/png').split(',')[1]!;
  });
  expect(screenshotHasWorld(await measure(blank))).toBe(false);

  await expect.poll(async () => screenshotHasWorld(await capture()), { timeout: 15000 }).toBe(true);
  const portrait = await capture();
  const css = await canvas.boundingBox();
  const dpr = await page.evaluate(() => devicePixelRatio);
  expect(css).not.toBeNull();
  expect(Math.abs(portrait.width - Math.round(css!.width * dpr))).toBeLessThanOrEqual(3);

  const coords = await page.locator('#coords').textContent();
  await canvas.focus();
  await page.keyboard.down('d');
  try {
    await expect(page.locator('#coords')).not.toHaveText(coords!);
  } finally {
    await page.keyboard.up('d');
  }
  await expect.poll(async () => screenshotHasWorld(await capture())).toBe(true);

  await page.setViewportSize({ width: 600, height: 390 });
  await expect.poll(async () => Math.round((await canvas.boundingBox())?.width ?? 0)).toBe(600);
  await expect.poll(async () => screenshotHasWorld(await capture())).toBe(true);
  const landscape = await capture();
  const resized = await canvas.boundingBox();
  expect(resized).not.toBeNull();
  expect(Math.abs(landscape.width - Math.round(resized!.width * dpr))).toBeLessThanOrEqual(3);

  await test.info().attach('sac-canvas-observation.json', {
    body: Buffer.from(JSON.stringify({
      platform: info.project.name, devicePixelRatio: dpr, portrait, landscape,
      synthetic_blank_rejected: true, final_game_canvas_sampled: true,
      exact_visual_determinism_verified: false, deployment_authorized: false,
    })),
    contentType: 'application/json',
  });
  expect(errors).toEqual([]);
});

test('Cavaleiro come alimento da bolsa e recupera HP de verdade no Canvas do jogo', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('terrania-origins-v1', JSON.stringify({
      seed: 842136, x: 16, y: 16, hp: 70, kills: 0, defeated: [],
      inventory: { gel: 1, potion: 0, questRewardClaimed: false,
        food: { apple: 1, bread: 0, meat: 0 } },
    }));
  });
  await page.goto('/jogar/?modo=solo');
  await expect(page.locator('canvas#game')).toBeVisible();
  await expect(page.locator('#hpText')).toHaveText('70 / 100');
  await page.locator('#gameMenuButton').click();
  await page.locator('#inventoryButton').click();
  await expect(page.locator('#foodCount-apple')).toHaveText('1 / 99');
  await page.locator('[data-bag-item="food-apple"]').click();
  await page.locator('#eat-apple').click();
  await expect(page.locator('#inventoryFeedback')).toContainText('recuperada gradualmente');
  await expect(page.locator('#foodCount-apple')).toHaveText('0 / 99');
  await expect(page.locator('#nutritionStatus')).toContainText('Comida: 8 HP');
  await page.locator('#inventoryDialog .dialog-x').click();
  await expect.poll(async () => Number((await page.locator('#hpText').innerText()).split(' / ')[0]),
    { timeout: 10000 }).toBeGreaterThan(70);
  await expect(page.locator('#hpText')).toHaveText(/7[1-9] \/ 100/);
});


test('inventário mobile tem mochila por toque, comparação real e cavaleiro procedural', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('terrania-origins-v1', JSON.stringify({
      seed: 842136, x: 16, y: 16, hp: 80, kills: 0, defeated: [],
      inventory: {
        gel: 3, potion: 1, questRewardClaimed: false,
        loadout: { forged: true, equipped: 'starter' },
        gear: { chest: 'quilted-vest' },
      },
    }));
  });
  await page.goto('/jogar/?modo=solo');
  await expect(page.locator('canvas#game')).toBeVisible();
  await page.locator('#gameMenuButton').click();
  await page.locator('#inventoryButton').click();
  await expect(page.locator('#inventoryDialog')).toBeVisible();
  await expect(page.locator('[data-bag-item="gear-trail-helm"]')).toBeVisible();
  await page.locator('[data-bag-item="gear-trail-helm"]').click();
  await expect(page.locator('#selectedBagName')).toHaveText('Elmo de trilha');
  await expect(page.locator('#bagItemComparison')).toContainText('Defesa do item: 1');
  await page.locator('#equip-gear-trail-helm').click();
  await expect(page.locator('#inventoryFeedback')).toContainText('Item equipado');
  await expect(page.locator('[data-bag-item="gear-trail-helm"]')).toHaveCount(0);
  await page.locator('#bagFilterGear').click();
  await expect(page.locator('[data-bag-item="weapon-forge"]')).toBeVisible();
  await page.locator('[data-bag-item="weapon-forge"]').click();
  await expect(page.locator('#bagItemComparison')).toContainText('Dano da arma equipada: 1');
  await page.locator('#equip-weapon-forge').click();
  await expect(page.locator('#inventoryFeedback')).toContainText('Espada equipada');
  if (await page.locator('#inventoryTabEquipment').isVisible()) {
    await page.locator('#inventoryTabEquipment').click();
  }
  await expect(page.locator('[data-equipment-slot="head"]')).toContainText('Elmo');
  await expect(page.locator('#equippedWeapon')).toHaveText('Espada da Travessia');
  await expect(page.locator('#inventoryHero')).toBeVisible();
  await expect.poll(async () => page.locator('#inventoryHero').evaluate(node => {
    const canvas = node as HTMLCanvasElement;
    const pixels = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height).data;
    if (!pixels) return 0;
    let opaque = 0;
    for (let index = 3; index < pixels.length; index += 4) if (pixels[index]! > 0) opaque++;
    return opaque;
  })).toBeGreaterThan(300);
  await page.locator('#rotateInventoryHero').click();
  await expect(page.locator('#inventoryHero')).toBeVisible();
  const noHorizontalOverflow = await page.locator('#inventoryDialog').evaluate(
    node => node.scrollWidth <= node.clientWidth + 2);
  expect(noHorizontalOverflow).toBe(true);
  expect(pageErrors).toEqual([]);
});

test('equipar elmo muda o desenho real do cavaleiro e retirar remove a chapa', async ({ page }) => {
  await page.addInitScript(() => {
    // Observa a faixa dourada do elmo no Canvas original do jogo, não apenas na prévia.
    const original = CanvasRenderingContext2D.prototype.fillRect;
    Object.assign(window, { worldHelmetStrokes: 0 });
    CanvasRenderingContext2D.prototype.fillRect = function (x, y, width, height) {
      if (this.canvas.id !== 'inventoryHero' && this.fillStyle === '#e5d39e' &&
          Math.abs(width - 17.2) < 0.001 && Math.abs(height - 1.3) < 0.001) {
        const data = window as typeof window & { worldHelmetStrokes: number };
        data.worldHelmetStrokes++;
      }
      original.call(this, x, y, width, height);
    };

    localStorage.setItem('terrania-origins-v1', JSON.stringify({
      seed: 842136, x: 16, y: 16, hp: 100, kills: 0, defeated: [],
      inventory: { gel: 0, potion: 0, questRewardClaimed: false },
    }));
  });
  await page.goto('/jogar/?modo=solo');
  await expect(page.locator('canvas#game')).toBeVisible();
  await page.locator('#gameMenuButton').click();
  await page.locator('#inventoryButton').click();
  if (await page.locator('#inventoryTabEquipment').isVisible()) {
    await page.locator('#inventoryTabEquipment').click();
  }
  const helmPixels = () => page.locator('#inventoryHero').evaluate(canvas => {
    const el = canvas as HTMLCanvasElement, pixels = el.getContext('2d')!.getImageData(0, 0, el.width, el.height).data;
    let marks = 0;
    // #e5d39e: filete dourado do elmo; tonalidade distinta da faixa antiga.
    for (let i = 0; i < pixels.length; i += 4) {
      if (Math.abs(pixels[i]! - 229) < 5 && Math.abs(pixels[i + 1]! - 211) < 5 &&
          Math.abs(pixels[i + 2]! - 158) < 5 && pixels[i + 3]! > 230) marks++;
    }
    return marks;
  });
  await expect.poll(helmPixels).toBe(0);
  await page.locator('[data-equipment-slot="head"]').click();
  await page.getByRole('button', { name: 'Equipar Elmo de trilha' }).click();
  await expect(page.locator('[data-equipment-slot="head"]')).toContainText('Elmo de trilha');
  await expect.poll(helmPixels).toBeGreaterThan(8);
  await page.locator('#inventoryDialog .dialog-x').click();
  const readWorldHelmet = () => page.evaluate(() =>
    (window as typeof window & { worldHelmetStrokes: number }).worldHelmetStrokes);
  await expect.poll(readWorldHelmet).toBeGreaterThan(0);
  await page.locator('#gameMenuButton').click();
  await page.locator('#inventoryButton').click();
  if (await page.locator('#inventoryTabEquipment').isVisible()) {
    await page.locator('#inventoryTabEquipment').click();
  }
  // A mesma peça continua visível nas quatro orientações do personagem procedural.
  for (let facing = 0; facing < 4; facing++) {
    await page.locator('#rotateInventoryHero').click();
    await expect.poll(helmPixels).toBeGreaterThan(8);
  }
  await page.getByRole('button', { name: 'Retirar Elmo de trilha' }).click();
  await expect(page.locator('[data-equipment-slot="head"]')).toContainText('Vazio');
  await expect.poll(helmPixels).toBe(0);
});


test('atlas escondido no inventário cobre todo o limite técnico com setores reais', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/jogar/?room=minimap-qa');
  await expect(page.locator('#multiplayerStatus')).toContainText('Online');
  await expect(page.locator('#miniMapPanel')).toHaveCount(0);
  await expect(page.locator('#worldAtlasCanvas')).toHaveCount(0);
  await page.locator('#gameMenuButton').click();
  await page.locator('#inventoryButton').click();
  await page.locator('#inventoryTabMap').click();
  const canvas = page.locator('#worldAtlasCanvas');
  await expect(canvas).toBeVisible();
  await expect(page.locator('.atlas-map-frame')).toBeVisible();
  await expect(page.locator('.atlas-legend .atlas-swatch')).toHaveCount(7);
  await expect(page.locator('#worldMapDimensions')).toContainText('62.500 × 62.500');
  await expect(page.locator('#atlasCurrentRegion')).toContainText('Terras da Travessia');
  await expect(page.locator('#atlasBiome')).not.toBeEmpty();
  await expect(page.locator('#atlasDifficulty')).toContainText('1 / 5');
  await expect(page.locator('[data-atlas-sector]')).toHaveCount(9);
  const sample = () => canvas.evaluate(element => {
    const map = element as HTMLCanvasElement;
    const rgba = map.getContext('2d')!.getImageData(0, 0, map.width, map.height).data;
    const center = Array.from(rgba.slice((128 * map.width + 128) * 4, (128 * map.width + 128) * 4 + 4));
    const colors = new Set<string>();
    for (let i = 0; i < rgba.length; i += 4) colors.add(rgba[i] + ',' + rgba[i + 1] + ',' + rgba[i + 2]);
    return { width: map.width, height: map.height, colors: colors.size, center };
  });
  await expect.poll(async () => (await sample()).colors).toBeGreaterThan(3);
  expect(await sample()).toMatchObject({ width: 256, height: 256, center: [255, 255, 255, 255] });
  await page.locator('[data-atlas-sector="0"]').click();
  await expect(page.locator('[data-atlas-sector="0"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#atlasScaleDetails')).toContainText('20833 tiles');
  await page.locator('#mapScaleNearby').click();
  await expect(page.locator('#atlasScaleDetails')).toContainText('128 tiles');
  await expect.poll(async () => (await sample()).colors).toBeGreaterThan(3);
  await page.locator('#closeInventory').click();
  await expect(canvas).toHaveCount(0);
  // Reopening must not keep an offscreen atlas animating behind the backpack.
  await page.locator('#gameMenuButton').click();
  await page.locator('#inventoryButton').click();
  await expect(page.locator('#inventoryTabBag')).toHaveAttribute('aria-pressed', 'true');
  await expect(canvas).toHaveCount(0);
  await page.locator('#closeInventory').click();
  expect(errors).toEqual([]);
});

test('mapa no inventário não intercepta toques do mundo no Android', async ({ page }, info) => {
  await page.goto('/jogar/?modo=solo');
  const world = page.locator('canvas#game');
  await expect(world).toBeVisible();
  await expect(page.locator('#miniMapToggle')).toHaveCount(0);
  await expect(page.locator('#worldAtlasCanvas')).toHaveCount(0);
  const rect = await world.boundingBox();
  expect(rect).not.toBeNull();
  const target = await page.evaluate(({ x, y }) =>
    document.elementFromPoint(x, y)?.id ?? '', {
      x: rect!.x + rect!.width / 2,
      y: rect!.y + rect!.height / 2,
    });
  expect(target).toBe('game');
  await page.locator('#gameMenuButton').click();
  await page.locator('#inventoryButton').click();
  await page.locator('#inventoryTabMap').click();
  await expect(page.locator('#worldAtlasCanvas')).toBeVisible();
  await page.locator('#closeInventory').click();
  const position = { x: rect!.width / 2 + 64, y: rect!.height / 2 + 32 };
  if (info.project.name === 'android') await world.tap({ position });
  else await world.click({ position });
  await expect(world).toBeVisible();
});

test('espada forjada equipada aparece parada na prévia e troca para a inicial sem atacar', async ({ page }) => {
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.fillRect;
    const swordFrames = { all: 0, forge: 0 };
    Object.assign(window, { swordFrames });
    CanvasRenderingContext2D.prototype.fillRect = function (x, y, width, height) {
      if (this.canvas.id === 'inventoryHero' && Math.abs(width - 3) < 0.0001 &&
          Math.abs(height - 12.8) < 0.0001) {
        swordFrames.all++;
        if (this.fillStyle === '#e2a24f') swordFrames.forge++;
      }
      original.call(this, x, y, width, height);
    };
    localStorage.setItem('terrania-origins-v1', JSON.stringify({
      seed: 842136, x: 16, y: 16, hp: 100, kills: 0, defeated: [],
      inventory: { gel: 0, potion: 0, questRewardClaimed: false,
        loadout: { forged: true, equipped: 'starter' } },
    }));
  });
  const readFrames = () => page.evaluate(() =>
    (window as typeof window & { swordFrames: { all: number; forge: number } }).swordFrames);
  await page.goto('/jogar/?modo=solo');
  await expect(page.locator('canvas#game')).toBeVisible();
  await page.locator('#gameMenuButton').click();
  await page.locator('#inventoryButton').click();
  const equipmentTab = page.locator('#inventoryTabEquipment');
  if (await equipmentTab.isVisible()) await equipmentTab.click();
  await expect(page.locator('#equippedWeapon')).toHaveText('Espada de viagem');
  await expect.poll(async () => (await readFrames()).all).toBeGreaterThan(2);
  expect((await readFrames()).forge).toBe(0);
  await page.locator('#equipOtherWeapon').click();
  await expect(page.locator('#equippedWeapon')).toHaveText('Espada da Travessia');
  await expect.poll(async () => (await readFrames()).forge).toBeGreaterThan(1);
  await page.locator('#equipOtherWeapon').click();
  await expect(page.locator('#equippedWeapon')).toHaveText('Espada de viagem');
  const previous = (await readFrames()).all;
  await page.evaluate(() => {
    (window as typeof window & { swordFrames: { forge: number } }).swordFrames.forge = 0;
  });
  await expect.poll(async () => (await readFrames()).all).toBeGreaterThan(previous + 3);
  expect((await readFrames()).forge).toBe(0);
});
