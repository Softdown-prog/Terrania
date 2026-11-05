import {test, expect} from '@playwright/test';

test('modo clássico solo mostra seleção e não injeta controles rejeitados',async({page})=>{
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:390,height:844});
  await page.goto('/jogar/?modo=classico');
  await expect(page.locator('canvas#game')).toBeVisible();
  await expect(page.locator('#classicCombat')).toBeVisible();
  await expect(page.locator('#classicCombat')).toContainText('COMBATE CLÁSSICO');
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
  await page.goto('/jogar/?modo=solo');
  await expect(page.locator('canvas#game')).toBeVisible();
  await expect(page.locator('#classicCombat')).toHaveCount(0);
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
