import { expect, test } from "@playwright/test";

/**
 * A barra de mana no jogo de verdade (ADR 0071): o Mago vê a mana (número e barra) ao lado da vida; o Cavaleiro não ganha barra; no
 * celular a barra não cobre o painel de missão nem passa da tela.
 */
const KEY = "terrania-origins-v1";
const world = (extra: Record<string, unknown>) => JSON.stringify({ mapVersion: 2, seed: 842136, x: 432, y: 48, hp: 80, kills: 0, defeated: [], experience: 0, ...extra });
const prefs = JSON.stringify({ zoom: 1, effects: false, cameraMotion: false });

test("o Cavaleiro não tem barra de mana (desktop/Android)", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(([key, value, preferences]) => { localStorage.setItem(key!, value!); localStorage.setItem("terrania-preferences-v1", preferences!); }, [KEY, world({ hp: 100 }), prefs]);
  await page.goto("/jogar/?modo=solo");
  await expect(page.locator("#hpText")).toBeVisible();
  await expect(page.locator("#manaText")).toHaveCount(0);
  await expect(page.locator("#manaFill")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("o Mago vê a mana cheia ao lado da vida, a mana de um save volta como foi salva e a barra cabe na tela (desktop/Android)", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(([key, value, preferences]) => { localStorage.setItem(key!, value!); localStorage.setItem("terrania-preferences-v1", preferences!); }, [KEY, world({ heroClass: "mage", mana: 30 }), prefs]);
  await page.setViewportSize(info.project.name === "android" ? { width: 390, height: 844 } : { width: 1200, height: 800 });
  await page.goto("/jogar/?modo=solo");
  const text = page.locator("#manaText"), fill = page.locator("#manaFill");
  await expect(text).toBeVisible();
  await expect(text).toHaveText(/^(3\d|[4-5]\d) \/ 50$/);
  await expect(page.locator(".mana-meter")).toHaveAttribute("aria-label", /^Barra de mana: \d+ de 50/);
  const meter = (await page.locator(".mana-meter").boundingBox())!, view = page.viewportSize()!;
  expect(meter.width).toBeGreaterThan(40); expect(meter.x).toBeGreaterThanOrEqual(0); expect(meter.x + meter.width).toBeLessThanOrEqual(view.width);
  const hp = (await page.locator("#hpFill").boundingBox())!;
  expect(meter.y, "a barra de mana fica abaixo da de vida").toBeGreaterThan(hp.y);
  const quest = await page.locator(".quest").boundingBox();
  if (quest && await page.locator(".quest").isVisible()) {
    const overlap = meter.x < quest.x + quest.width && meter.x + meter.width > quest.x && meter.y < quest.y + quest.height && meter.y + meter.height > quest.y;
    expect(overlap, "a barra de mana não cobre o painel de missão").toBe(false);
  }
  // A mana volta com o tempo (2,5 por segundo): em pouco tempo o número sobe e a barra cresce.
  const first = Number((await text.textContent())!.split(" / ")[0]);
  await expect.poll(async () => Number((await text.textContent())!.split(" / ")[0]), { timeout: 8000 }).toBeGreaterThan(first);
  const width = async (): Promise<number> => (await fill.boundingBox())!.width;
  expect(await width()).toBeGreaterThan(5);
  await page.locator(".hud").screenshot({ path: test.info().outputPath("hud-do-mago.png") });
  expect(errors).toEqual([]);
});

test("com pouca mana (menos que uma magia) a barra avisa em vermelho (desktop/Android)", async ({ page }) => {
  await page.addInitScript(([key, value, preferences]) => { localStorage.setItem(key!, value!); localStorage.setItem("terrania-preferences-v1", preferences!); }, [KEY, world({ heroClass: "mage", mana: 1 }), prefs]);
  await page.goto("/jogar/?modo=solo");
  await expect(page.locator(".mana-meter")).toHaveClass(/low/);
  await expect(page.locator(".mana-meter")).toHaveAttribute("aria-label", /sem mana para uma magia/);
  // 2,5 de mana por segundo: em uns 2 s passa dos 5 e o aviso some.
  await expect(page.locator(".mana-meter")).not.toHaveClass(/low/, { timeout: 8000 });
});
