import { expect, test } from '@playwright/test';

test('golpe forte é acessível no Android/desktop solo e some no multiplayer', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/jogar/?modo=solo');
  await expect(page.locator('canvas#game')).toBeVisible();
  const heavy = page.locator('#heavyAttack');
  const normal = page.locator('#attack');
  await expect(heavy).toBeVisible();
  await expect(normal).toBeVisible();
  await expect(heavy).toHaveAccessibleName(/Golpe forte/);
  const [heavyBox, normalBox, stickBox] = await Promise.all([
    heavy.boundingBox(), normal.boundingBox(), page.locator('#joystick').boundingBox(),
  ]);
  expect(heavyBox).not.toBeNull();
  expect(normalBox).not.toBeNull();
  expect(stickBox).not.toBeNull();
  const separated = (a: { x:number;y:number;width:number;height:number },
    b: { x:number;y:number;width:number;height:number }) =>
      a.x+a.width <= b.x || b.x+b.width <= a.x ||
      a.y+a.height <= b.y || b.y+b.height <= a.y;
  expect(separated(heavyBox!, normalBox!)).toBe(true);
  expect(separated(heavyBox!, stickBox!)).toBe(true);
  await heavy.click();
  await page.keyboard.press('k');
  await page.locator('#gameMenuButton').click();
  await page.locator('#helpButton').click();
  await expect(page.locator('#helpDialog')).toContainText('Golpe forte');
  await page.locator('#helpDialog .dialog-x').click();
  await page.goto('/jogar/?room=heavy-online');
  await expect(page.locator('#multiplayerStatus')).toContainText('Online');
  await expect(page.locator('#heavyAttack')).toHaveCount(0);
  expect(errors).toEqual([]);
});
