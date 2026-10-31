import { expect, test } from '@playwright/test';

test('gerar mundo mantém ajustes modal e retoma o jogo apenas após fechar o último diálogo', async ({ page }) => {
  await page.goto('/jogar/?modo=solo');
  await expect(page.locator('canvas#game')).toBeVisible();
  const seed = await page.locator('#seed').textContent();

  await page.locator('#settingsButton').click();
  await page.locator('#newWorld').click();
  await expect(page.locator('#worldDialog')).toBeVisible();
  await page.getByRole('button', { name: 'Manter minha aventura' }).click();
  await expect(page.locator('#worldDialog')).not.toBeVisible();
  await expect(page.locator('#settingsDialog')).toBeVisible();
  await expect(page.locator('#seed')).toHaveText(seed!);

  await page.locator('#newWorld').click();
  await page.locator('#confirmWorld').click();
  await expect(page.locator('#worldDialog')).not.toBeVisible();
  await expect(page.locator('#settingsDialog')).toBeVisible();
  // A URL é atualizada de forma síncrona; o HUD Angular pode renderizar no frame seguinte.
  await expect(page).toHaveURL(/[?&]seed=\d+/);
  const newSeed = await page.evaluate(() => new URL(location.href).searchParams.get('seed'));
  expect(newSeed).toMatch(/^\d+$/);
  await expect(page.locator('#seed')).toHaveText(newSeed!);

  const coords = await page.locator('#coords').textContent();
  await page.keyboard.down('d');
  await page.waitForTimeout(300);
  await expect(page.locator('#coords')).toHaveText(coords!);
  await page.keyboard.up('d');

  await page.locator('#settingsDialog .dialog-x').click();
  await expect(page.locator('#settingsDialog')).not.toBeVisible();
  await page.keyboard.down('d');
  try { await expect(page.locator('#coords')).not.toHaveText(coords!); }
  finally { await page.keyboard.up('d'); }
});

test('falha nativa de showModal não mantém o jogo pausado', async ({ page }) => {
  await page.goto('/jogar/?modo=solo');
  await expect(page.locator('canvas#game')).toBeVisible();
  await page.evaluate(() => {
    const dialog = document.querySelector<HTMLDialogElement>('#settingsDialog');
    if (!dialog) throw new Error('Diálogo não encontrado');
    Object.defineProperty(dialog, 'showModal', {
      configurable: true,
      value: () => { throw new DOMException('Modal indisponível', 'InvalidStateError'); },
    });
  });
  const coords = await page.locator('#coords').textContent();
  await page.locator('#settingsButton').click();
  await expect(page.locator('#gameNotice')).toContainText('Não foi possível abrir este painel');
  await expect(page.locator('#settingsDialog')).not.toBeVisible();
  await page.locator('canvas#game').focus();
  await page.keyboard.down('d');
  try { await expect(page.locator('#coords')).not.toHaveText(coords!); }
  finally { await page.keyboard.up('d'); }
});

test('menu Android informa estado e fecha ao tocar fora ou pressionar Escape', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Navegação mobile');
  await page.goto('/');
  const toggle = page.locator('.nav-toggle');
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toHaveAttribute('aria-label', 'Abrir navegação');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(toggle).toHaveAttribute('aria-label', 'Fechar navegação');
  // Clique real abaixo do menu aberto: o próprio menu cobre o topo do conteúdo.
  await page.mouse.click(12, page.viewportSize()!.height - 12);
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toHaveAttribute('aria-label', 'Abrir navegação');
});

test('HUD e diálogos permanecem operáveis na viewport Android', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Interface Android');
  await page.goto('/jogar/?modo=solo');
  await expect(page.locator('canvas#game')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('#settingsButton').click();
  await expect(page.locator('#settingsDialog')).toBeVisible();
  await page.locator('#newWorld').click();
  await expect(page.locator('#worldDialog')).toBeVisible();
  await page.getByRole('button', { name: 'Manter minha aventura' }).click();
  await expect(page.locator('#settingsDialog')).toBeVisible();
  await page.locator('#settingsDialog .dialog-x').click();
  await expect(page.locator('#settingsDialog')).not.toBeVisible();
});
