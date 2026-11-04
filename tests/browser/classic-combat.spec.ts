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
  await expect(page.locator('#helpDialog')).toContainText('O herói ataca sozinho');
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
