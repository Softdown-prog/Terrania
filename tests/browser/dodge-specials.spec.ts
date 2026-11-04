import { expect, test } from '@playwright/test';

test('esquiva no Android não sobrepõe ataques nem joystick e fecha ao entrar online', async ({page}) => {
  const errors: string[]=[];
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({width:390,height:844});
  await page.goto('/jogar/?modo=solo');
  await expect(page.locator('canvas#game')).toBeVisible();
  const dodge=page.locator('#dodge');
  await expect(dodge).toBeVisible();
  await expect(dodge).toHaveAccessibleName(/Esquivar, tecla Shift/);
  const ids=['#dodge','#attack','#heavyAttack','#joystick'];
  const boxes=await Promise.all(ids.map(id=>page.locator(id).boundingBox()));
  expect(boxes.every(Boolean)).toBe(true);
  const disjoint=(a:NonNullable<(typeof boxes)[number]>,b:NonNullable<(typeof boxes)[number]>)=>
    a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y;
  expect(disjoint(boxes[0]!,boxes[1]!)).toBe(true);
  expect(disjoint(boxes[0]!,boxes[2]!)).toBe(true);
  expect(disjoint(boxes[0]!,boxes[3]!)).toBe(true);
  await dodge.click();
  await page.keyboard.press('Shift');
  await page.locator('#gameMenuButton').click();
  await page.locator('#helpButton').click();
  await expect(page.locator('#helpDialog')).toContainText('ESQUIVA');
  await page.locator('#helpDialog .dialog-x').click();
  await page.goto('/jogar/?room=no-dodge-online');
  await expect(page.locator('#multiplayerStatus')).toContainText('Online');
  await expect(page.locator('#dodge')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('esquiva também não sobrepõe os botões na orientação paisagem', async ({page}) => {
  // 600x390 remains landscape while using the mobile touch layout even in
  // the desktop Playwright project (which emulates a fine pointer).
  await page.setViewportSize({width:600,height:390});
  await page.goto('/jogar/?modo=solo');
  const d=await page.locator('#dodge').boundingBox();
  const normal=await page.locator('#attack').boundingBox();
  const strong=await page.locator('#heavyAttack').boundingBox();
  expect(d).not.toBeNull();
  expect(normal).not.toBeNull();
  expect(strong).not.toBeNull();
  const overlap=(a:NonNullable<typeof d>,b:NonNullable<typeof d>)=>
    a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
  expect(overlap(d!,normal!)).toBe(false);
  expect(overlap(d!,strong!)).toBe(false);
  await page.locator('#dodge').click();
  await expect(page.locator('canvas#game')).toBeVisible();
});
