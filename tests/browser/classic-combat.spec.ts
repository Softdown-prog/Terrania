import {test, expect} from '@playwright/test';

test('o solo normal oferece combate por alvo e ajuda',async({page})=>{
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:390,height:844});
  await page.goto('/jogar/?modo=solo');
  await expect(page.locator('canvas#game')).toBeVisible();
  await expect(page.locator('#classicCombat')).toBeVisible();
  await expect(page.locator('#classicCombat')).toContainText('COMBATE POR ALVO');
  await expect(page.locator('#classicHint')).toContainText('Toque em um slime');
  await expect(page.locator('#heavyAttack')).toHaveCount(0);
  await expect(page.locator('#dodge')).toHaveCount(0);
  await page.locator('#attack').click();
  await page.keyboard.press('Escape');
  await page.locator('#gameMenuButton').click();
  await page.locator('#helpButton').click();
  await expect(page.locator('#helpDialog')).toContainText('persegue o alvo');
  await page.locator('#helpDialog .dialog-x').click();
  await page.goto('/jogar/?modo=classico');
  await expect(page.locator('canvas#game')).toBeVisible();
  await expect(page.locator('#classicCombat')).toBeVisible();
  expect(errors).toEqual([]);
});

test('classico preserves the previous offline save and works in landscape',async({page})=>{
  await page.setViewportSize({width:600,height:390});
  await page.addInitScript(()=>{
    localStorage.setItem('terrania-origins-v1', JSON.stringify({
      seed:842136,x:16,y:16,hp:77,kills:2,defeated:[],
    }));
  });
  await page.goto('/jogar/?modo=classico');
  await expect(page.locator('#classicCombat')).toBeVisible();
  await expect(page.locator('#hpText')).toHaveText('77 / 100');
  await page.locator('#attack').click();
  await expect(page.locator('canvas#game')).toBeVisible();
});

test('a quina protege o herói até ele contornar o obstáculo', async ({ page }, info) => {
  await page.addInitScript(() => {
    localStorage.setItem('terrania-origins-v1', JSON.stringify({
      seed: 842136, x: -8, y: -360, hp: 100, kills: 0, defeated: [],
    }));
    localStorage.setItem('terrania-preferences-v1', JSON.stringify({ zoom: 1, effects: false, cameraMotion: false }));
  });
  const time = new Date('2026-01-01T00:00:00Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(new Date(time.getTime() + 1000));
  await page.goto('/jogar/?modo=solo');
  const canvas = page.locator('canvas#game');
  await expect.poll(async () => {
    await page.clock.runFor(32);
    return canvas.count();
  }).toBe(1);

  await page.clock.runFor(3200);
  await expect(page.locator('#hpText')).toHaveText('100 / 100');
  const bounds = (await canvas.boundingBox())!;
  const position = { x: bounds.width / 2 - 8, y: bounds.height / 2 + 56 };
  if (info.project.name === 'android') await canvas.tap({ position });
  else await canvas.click({ position });
  await page.clock.runFor(600);
  await expect(page.locator('#hpText')).toHaveText('91 / 100');
});

test('ATACAR acerta um Slime sobreposto sem deslocar o herói', async ({ page }, info) => {
  await page.addInitScript(() => localStorage.setItem('terrania-origins-v1', JSON.stringify({
    seed: 842136, x: -560, y: -1008, hp: 100, kills: 0, defeated: [],
  })));
  const time = new Date('2026-01-01T00:00:00Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(new Date(time.getTime() + 1000));
  await page.goto('/jogar/?modo=solo');
  await expect.poll(async () => {
    await page.clock.runFor(32);
    return page.locator('#hpText').textContent();
  }).toBe('91 / 100');
  await page.clock.runFor(240); // Let the Battle List refresh after the spawn.

  if (info.project.name === 'android') {
    await page.locator('#battleToggle').tap();
    await page.clock.runFor(32);
  }
  const slime = page.locator('.battle-entry[data-creature-id="-2,-2,0"]');
  await expect(slime).toHaveAttribute('aria-label', 'Selecionar Slime, vida 2 de 2');
  if (info.project.name === 'android') await page.locator('#attack').tap();
  else await page.keyboard.press('Space');
  await page.clock.runFor(240);
  // Starting wooden sword causes 8 damage: a 2-HP Slime dies on the FIRST hit.
  await expect(slime).toHaveCount(0);
  await page.clock.runFor(1700);
  await expect(page.locator('#xpText')).toHaveText('XP 10 / 30');
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('terrania-origins-v1')!));
  expect(save).toMatchObject({ x: -560, y: -1008, kills: 1 });
});

test('trocar de criatura durante a preparação descarta o golpe em andamento', async ({page}, info) => {
  const android = info.project.name === 'android';
  await page.setViewportSize(android ? {width:390,height:844} : {width:1200,height:800});
  await page.addInitScript(() => localStorage.setItem('terrania-origins-v1', JSON.stringify({
    seed: 842136, x: -3984, y: -4016, hp: 100, kills: 0, defeated: [],
  })));
  // Advance the real Phaser loop between selections without racing the 70 ms windup.
  const start = new Date('2026-01-01T00:00:00Z');
  await page.clock.install({time:start});
  await page.clock.pauseAt(new Date(start.getTime() + 1000));
  await page.goto('/jogar/?modo=classico');
  await expect.poll(async () => {
    await page.clock.runFor(32);
    return page.locator('canvas#game').count();
  }).toBe(1);
  if (android) await page.locator('#battleToggle').dispatchEvent('click');
  await page.clock.runFor(240);
  const first = page.locator('.battle-entry[data-creature-id="-8,-8,0"]');
  const second = page.locator('.battle-entry[data-creature-id="-8,-8,1"]');
  const fullHp = 'Selecionar Slime, vida 2 de 2';
  await expect(first).toHaveAttribute('aria-label',fullHp);
  await expect(second).toHaveAttribute('aria-label',fullHp);

  await first.dispatchEvent('click');
  await page.clock.runFor(48);
  await expect(first).toHaveAttribute('aria-pressed','true');
  await second.dispatchEvent('click');
  await page.clock.runFor(320);
  await expect(second).toHaveAttribute('aria-pressed','true');
  await expect(first).toHaveAttribute('aria-label',fullHp);
  await expect(second).toHaveAttribute('aria-label',fullHp);

  await page.clock.runFor(1500);
  await expect(first).toHaveAttribute('aria-label',fullHp);
  await expect(second).toHaveCount(0);
  const save=await page.evaluate(() => JSON.parse(localStorage.getItem('terrania-origins-v1') ?? 'null'));
  expect(save?.defeated).toContain('-8,-8,1');
});

for (const cancel of ['button', 'escape'] as const) {
  test(`cancelar por ${cancel} interrompe a perseguição e exige nova seleção`,
    async ({page},info) => {
    const errors:string[]=[];
    page.on('pageerror', e=>errors.push(e.message));
    const mobId='-2,-2,0';
    await page.addInitScript(() => localStorage.setItem('terrania-origins-v1',
      JSON.stringify({seed:842136,x:-660,y:-1008,hp:100,kills:0,defeated:[]})));
    await page.setViewportSize(cancel==='escape' ? {width:600,height:390} :
      {width:info.project.name==='android' ? 390 : 1200,height:844});
    // Freeze gameplay between real UI interactions. The wooden sword now kills
    // a 2-HP Slime in one hit, so wall-clock tap latency cannot arbitrate cancel.
    const start=new Date('2026-01-01T00:00:00Z');
    await page.clock.install({time:start});
    await page.clock.pauseAt(new Date(start.getTime()+1000));
    await page.goto('/jogar/?modo=classico');
    await expect(page.locator('canvas#game')).toBeVisible();
    const toggle=page.locator('#battleToggle');
    if(await toggle.getAttribute('aria-expanded')!=='true') await toggle.click();
    const row=page.locator(`.battle-entry[data-creature-id="${mobId}"]`);
    await expect(row).toHaveAttribute('aria-label','Selecionar Slime, vida 2 de 2');
    // Cancel before the player has reached the monster. No phantom attack may
    // kill the Slime while neither a target nor an attack input is active.
    if(info.project.name==='android') await row.tap(); else await row.click();
    await page.clock.runFor(16);
    await expect(page.locator('#classicTarget')).toContainText('Slime');
    if(cancel==='button'){
      if(info.project.name==='android') await page.locator('#stopTarget').tap();
      else await page.locator('#stopTarget').click();
    }else await page.keyboard.press('Escape');
    await page.clock.runFor(16);
    await expect(page.locator('#classicTarget')).toHaveCount(0);
    await expect(row).toHaveAttribute('aria-pressed','false');
    await page.clock.runFor(950);
    await expect(row).toHaveAttribute('aria-label','Selecionar Slime, vida 2 de 2');
    const untouched=await page.evaluate(id=>JSON.parse(localStorage.getItem('terrania-origins-v1')??'null')
      ?.defeated?.includes(id)===true,mobId);
    expect(untouched).toBe(false);
    if(info.project.name==='android') await row.tap(); else await row.click();
    await page.clock.runFor(16);
    await expect(row).toHaveAttribute('aria-pressed','true');
    await expect.poll(async ()=>{
      await page.clock.runFor(80);
      return page.evaluate(id=>{
        const saved=JSON.parse(localStorage.getItem('terrania-origins-v1')??'null');
        return saved?.defeated?.includes(id)===true;
      },mobId);
    },{timeout:15000}).toBe(true);
    await expect(row).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
