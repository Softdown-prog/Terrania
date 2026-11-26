import { expect, test } from "@playwright/test";
import { NEW_PLAYER_STATE } from "./support/returning-player.ts";

/**
 * O Mago também recupera mana comendo (ADR 0085): a carne devolve 25% da mana máxima na hora (13 de 50 no nível 1), a mochila avisa isso na descrição e a
 * mensagem diz quanto voltou. A vida continua voltando aos poucos. Desktop e Android.
 */
test.use({ storageState: NEW_PLAYER_STATE });
const KEY = "terrania-origins-v1";
const world = JSON.stringify({ mapVersion: 2, seed: 842136, x: 432, y: 48, hp: 100, kills: 0, defeated: [], experience: 0, heroClass: "mage", mana: 0,
  inventory: { gel: 0, potion: 0, questRewardClaimed: false, food: { apple: 0, bread: 0, meat: 1 } } });

test("Mago: comer carne devolve mana na hora e a mochila e a mensagem dizem isso (desktop/Android)", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(([key, value, preferences]) => { if (localStorage.getItem(key!) === null) localStorage.setItem(key!, value!); localStorage.setItem("terrania-preferences-v1", preferences!); }, [KEY, world, JSON.stringify({ zoom: 1, effects: false, cameraMotion: false })]);
  await page.setViewportSize(info.project.name === "android" ? { width: 390, height: 844 } : { width: 1200, height: 800 });
  await page.goto("/jogar/?modo=solo");
  const press = async (locator: ReturnType<typeof page.locator>): Promise<void> => { if (info.project.name === "android") await locator.tap(); else await locator.click(); };
  const mana = async (): Promise<number> => Number((await page.locator("#manaText").innerText()).split(" / ")[0]);
  await expect(page.locator("#manaText")).toBeVisible();
  const before = await mana();
  expect(before, "o save semeou mana zerada").toBeLessThan(13);
  await press(page.locator("#gameMenuButton")); await press(page.locator("#inventoryButton"));
  await expect(page.locator("#foodCount-meat")).toHaveText("1 / 99");
  await press(page.locator('[data-bag-item="food-meat"]'));
  await expect(page.locator("#inventoryDialog")).toContainText("25% da mana na hora");
  await press(page.locator("#eat-meat"));
  await expect(page.locator("#inventoryFeedback")).toContainText("Carne assada: Refeição feita. Sua vida volta aos poucos e você recupera 13 de mana na hora.");
  await expect(page.locator("#foodCount-meat")).toHaveText("0 / 99");
  await page.locator("#inventoryDialog .dialog-x").click();
  await expect.poll(mana, { message: "a mana subiu na hora, sem esperar a recarga" }).toBeGreaterThanOrEqual(before + 13);
  expect(errors).toEqual([]);
});
