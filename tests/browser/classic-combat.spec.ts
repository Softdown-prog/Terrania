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
  await expect(page.locator('#multiplayerStatus')).toContainText('Offline');
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
  await expect(second).toHaveAttribute('aria-label','Selecionar Slime, vida 1 de 2');
});

for (const cancel of ['button', 'escape'] as const) {
  test(`cancelar por ${cancel} não encurta a recarga ao selecionar novamente`, async ({page}, info) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const mobId = '-2,-2,0';
    await page.addInitScript(() => localStorage.setItem('terrania-origins-v1', JSON.stringify({
      seed: 842136, x: -660, y: -1008, hp: 100, kills: 0, defeated: [],
    })));
    await page.setViewportSize(cancel === 'escape' ? {width:600,height:390} :
      {width:info.project.name === 'android' ? 390 : 1200,height:844});
    await page.goto('/jogar/?modo=classico');
    await expect(page.locator('canvas#game')).toBeVisible();
    const toggle = page.locator('#battleToggle');
    if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
    const row = page.locator(`.battle-entry[data-creature-id="${mobId}"]`);
    await expect(row).toBeVisible();
    // Observe real DOM health and the game's saved defeat; do not modify the simulation clock.
    await page.evaluate(id => {
      const observer = new MutationObserver(() => {
        const target = document.querySelector(`[data-creature-id="${id}"]`);
        if (target?.getAttribute('aria-label')?.includes('vida 1 de 2') &&
            !performance.getEntriesByName('classic-first-hit').length)
          performance.mark('classic-first-hit');
        const save = JSON.parse(localStorage.getItem('terrania-origins-v1') ?? 'null');
        if (!target && save?.defeated?.includes(id) &&
            performance.getEntriesByName('classic-first-hit').length &&
            !performance.getEntriesByName('classic-defeated').length) {
          performance.mark('classic-defeated');
          observer.disconnect();
        }
      });
      // The sidebar survives Angular's empty-list branch; the list can be removed.
      observer.observe(document.querySelector('#battleSidebar')!, {
        subtree:true,childList:true,attributes:true,attributeFilter:['aria-label'],
      });
    }, mobId);
    if (info.project.name === 'android') await row.tap(); else await row.click();
    await page.waitForFunction(() => performance.getEntriesByName('classic-first-hit').length === 1);
    if (cancel === 'button') {
      if (info.project.name === 'android') await page.locator('#stopTarget').tap();
      else await page.locator('#stopTarget').click();
    } else await page.keyboard.press('Escape');
    await expect(page.locator('#classicTarget')).toHaveCount(0);
    await expect(row).toHaveAttribute('aria-pressed','false');
    if (info.project.name === 'android') await row.tap(); else await row.click();
    await expect(row).toHaveAttribute('aria-pressed','true');
    await page.waitForFunction(() => performance.getEntriesByName('classic-defeated').length === 1,
      undefined, {timeout:15000});
    const elapsed = await page.evaluate(() =>
      performance.getEntriesByName('classic-defeated')[0]!.startTime -
      performance.getEntriesByName('classic-first-hit')[0]!.startTime);
    // HUD refresh is 0.2s; leave margin while detecting the old ~0.42s shortcut.
    expect(elapsed).toBeGreaterThanOrEqual(1000);
    expect(errors).toEqual([]);
  });
}
