import { expect, test, type Page } from "@playwright/test";
import { CAPITAL_DOORS } from "../../src/world/center/capital/index.ts";
import { BANKER_ID } from "../../src/npcs/center/capital/index.ts";
import { NPCS } from "../../src/world/npcs.ts";

/**
 * O banco da Casa da Moeda no jogo de verdade (ADR 0063): a porta abre o balcão em Concórdia, e Mestre Aurélio paga os juros ao
 * conversar, guarda e devolve moedas, com o saldo e a carteira conferidos no save do navegador.
 */
const SEED = 842136;
const door = CAPITAL_DOORS.find(d => d.id === "capital-casa-da-moeda")!;
const banker = NPCS.find(npc => npc.id === BANKER_ID)!;

async function start(page: Page, x: number, y: number, extra: Record<string, unknown>): Promise<string[]> {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(({ seed, x, y, extra }) => {
    localStorage.setItem("terrania-origins-v1", JSON.stringify({ mapVersion: 2, seed, x, y, hp: 100, kills: 0, defeated: [], experience: 1350, ...extra }));
    localStorage.setItem("terrania-preferences-v1", JSON.stringify({ zoom: 1, effects: false, cameraMotion: false }));
  }, { seed: SEED, x, y, extra });
  await page.goto("/jogar/?modo=solo");
  await expect(page.locator("canvas#game")).toBeVisible();
  return errors;
}
/** `coins` some do save quando a carteira está vazia; o teste lê ausência como zero. */
type Save = { time?: number; inventory: { coins?: number }; bank?: { balance: number; interestAt: number } };
const readSave = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("terrania-origins-v1") ?? "{}") as Save);

test("Capital: a porta da Casa da Moeda abre o balcão em Concórdia e a saída volta à rua (desktop/Android)", async ({ page }, info) => {
  const errors = await start(page, door.x, door.y, {});
  const action = page.locator("#talkButton");
  const press = async (): Promise<void> => { if (info.project.name === "android") await action.tap(); else await action.click(); };
  await expect(action).toContainText("Entrar (E)");
  await press();
  await expect(action).toContainText("Sair (E)");
  await expect(page.locator("#quest")).toContainText("Casa da Moeda e dos Mercadores");
  await expect(page.locator("#coords")).toHaveText("Interior · Concórdia");
  await page.locator("canvas#game").screenshot({ path: test.info().outputPath("banco-interior.png") });
  await press();
  await expect(page.locator("#coords")).not.toContainText("Interior");
  await expect(action).toContainText("Entrar (E)");
  expect(errors).toEqual([]);
});

test("Capital: Mestre Aurélio paga os juros, guarda e devolve moedas, e o saldo e a carteira batem com o save (desktop/Android)", async ({ page }, info) => {
  // 1.200 s de jogo desde o último pagamento (2 períodos de 0,5%) sobre 2.000 no banco: 20 de juros.
  const errors = await start(page, banker.x, banker.y + 24, { time: 1_200, inventory: { gel: 0, potion: 0, questRewardClaimed: false, coins: 500 }, bank: { balance: 2_000, interestAt: 0 } });
  const press = async (locator: ReturnType<typeof page.locator>): Promise<void> => { if (info.project.name === "android") await locator.tap(); else await locator.click(); };
  await press(page.getByRole("button", { name: "Conversar (E)" }));
  const dialog = page.getByRole("dialog", { name: "Mestre Aurélio" });
  await expect(dialog).toBeVisible();
  const progress = dialog.locator("#bankProgress");
  await expect(progress).toContainText("Carteira: 5 Cripta Coin");
  await expect(progress).toContainText("Saldo no banco: 20 Cripta Coin e 20 Terrania Gold");
  expect((await readSave(page)).bank?.balance, "os juros foram pagos e salvos ao começar a conversa").toBe(2_020);
  await dialog.screenshot({ path: test.info().outputPath("banco-painel.png") });

  await press(dialog.locator("#bank-deposit-100"));
  await expect(dialog.locator("#npcTradeFeedback")).toContainText("Mestre Aurélio guardou 1 Cripta Coin");
  let save = await readSave(page);
  expect([save.inventory.coins ?? 0, save.bank?.balance]).toEqual([400, 2_120]);

  await press(dialog.locator("#bank-withdraw-1000"));
  await expect(dialog.locator("#npcTradeFeedback")).toContainText("Mestre Aurélio entregou 10 Cripta Coin");
  save = await readSave(page);
  expect([save.inventory.coins ?? 0, save.bank?.balance]).toEqual([1_400, 1_120]);

  await press(dialog.locator("#bank-deposit-all"));
  await expect(progress).toContainText("Carteira: 0 Terrania Gold");
  save = await readSave(page);
  expect([save.inventory.coins ?? 0, save.bank?.balance]).toEqual([0, 2_520]);
  await expect(dialog.locator("#bank-deposit-all")).toBeDisabled();
  await expect(dialog.locator("#bank-deposit-100")).toBeDisabled();

  await press(dialog.locator("#bank-withdraw-all"));
  await expect(dialog.locator("#npcTradeFeedback")).toContainText("Mestre Aurélio entregou");
  save = await readSave(page);
  expect(save.inventory.coins).toBe(2_520);
  expect(save.bank, "conta zerada não fica no save").toBeUndefined();
  await expect(dialog.locator("#bank-withdraw-all")).toBeDisabled();
  expect(save.time ?? 0, "o relógio da aventura vai junto no save").toBeGreaterThanOrEqual(1_200);
  expect(errors).toEqual([]);
});
