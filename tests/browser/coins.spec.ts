import { expect, test, type Page } from "@playwright/test";

/**
 * Moedas na bolsa (ADR 0023): as três moedas aparecem pelo que o total forma, com ícone próprio,
 * e a que já se uniu à maior some da menor. Moeda não se "usa" nem se equipa.
 */
async function openBag(page: Page, coins: number | undefined): Promise<void> {
  await page.addInitScript(({ coins }) => {
    localStorage.setItem("terrania-origins-v1", JSON.stringify({
      seed: 842136, x: 16, y: 16, hp: 100, kills: 0, defeated: [], experience: 0,
      inventory: { gel: 3, potion: 0, questRewardClaimed: false, ...(coins === undefined ? {} : { coins }) },
    }));
    localStorage.setItem("terrania-preferences-v1", JSON.stringify({ zoom: 1, effects: false, cameraMotion: false }));
  }, { coins });
  await page.goto("/jogar/?modo=solo");
  await expect(page.locator("canvas#game")).toBeVisible();
  await page.locator("#gameMenuButton").click();
  await page.locator("#inventoryButton").click();
  const bagTab = page.locator("#inventoryTabBag");
  if (await bagTab.isVisible()) await bagTab.click();
}

test("bolsa: 10.250 de dinheiro aparece como 1 Eclipse Crown, 2 Cripta Coin e 50 Terrania Gold", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await openBag(page, 10_250);
  const gold = page.locator('[data-bag-item="coin-terrania-gold"]');
  const cripta = page.locator('[data-bag-item="coin-cripta-coin"]');
  const crown = page.locator('[data-bag-item="coin-eclipse-crown"]');
  await expect(gold.locator(".backpack-quantity")).toHaveText("50");
  await expect(cripta.locator(".backpack-quantity")).toHaveText("2");
  await expect(crown.locator(".backpack-quantity")).toHaveText("1");
  await expect(gold).toContainText("Terrania Gold");
  await expect(cripta).toContainText("Cripta Coin");
  await expect(crown).toContainText("Eclipse Crown");
  await expect(gold.locator("app-item-icon")).toHaveAttribute("data-icon", "terrania-gold");
  await expect(cripta.locator("app-item-icon")).toHaveAttribute("data-icon", "cripta-coin");
  await expect(crown.locator("app-item-icon")).toHaveAttribute("data-icon", "eclipse-crown");
  // O gel continua sendo material de troca, à parte do dinheiro.
  await expect(page.locator("#gelCount")).toHaveText("3 / 99");
  // Moeda não se equipa nem se usa: selecionar mostra a descrição, sem botão de ação.
  await crown.click();
  await expect(page.locator("#selectedBagName")).toHaveText("Eclipse Crown");
  await expect(page.locator("#selectedBagDescription")).toContainText("100 Cripta Coin");
  await expect(page.locator("#bagItemComparison")).toHaveCount(0);
  await expect(page.locator(".backpack-details .primary-button")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("bolsa: sem moedas só a Terrania Gold aparece, zerada, e as maiores não", async ({ page }) => {
  await openBag(page, undefined);
  await expect(page.locator('[data-bag-item="coin-terrania-gold"] .backpack-quantity')).toHaveText("0");
  await expect(page.locator('[data-bag-item="coin-terrania-gold"]')).toHaveClass(/is-empty/);
  await expect(page.locator('[data-bag-item="coin-cripta-coin"]')).toHaveCount(0);
  await expect(page.locator('[data-bag-item="coin-eclipse-crown"]')).toHaveCount(0);
});

test("bolsa: exatamente 100 Terrania Gold já viraram 1 Cripta Coin e a menor sumiu", async ({ page }) => {
  await openBag(page, 100);
  await expect(page.locator('[data-bag-item="coin-cripta-coin"] .backpack-quantity')).toHaveText("1");
  await expect(page.locator('[data-bag-item="coin-terrania-gold"] .backpack-quantity')).toHaveText("0");
  await expect(page.locator('[data-bag-item="coin-eclipse-crown"]')).toHaveCount(0);
});
