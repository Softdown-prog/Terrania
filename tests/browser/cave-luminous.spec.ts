import { expect, test, type Page } from "@playwright/test";
import { caveEntranceInCell } from "../../src/world/caves.ts";
import { caveStyleFor } from "../../src/world/caveStyle/index.ts";

/**
 * Gruta Luminosa no jogo de verdade (ADR 0032): a gruta sorteada como luminosa mostra cogumelos e poças que
 * brilham em verde-água; a comum do mesmo tema continua sem eles. A planta e a navegação não mudam.
 */
const SEED = 842136;
/** Duas grutas do mesmo tema (mata), uma comum e uma luminosa, nesta semente. */
const CELLS = { plain: [71, -80], luminous: [73, -80] } as const;

/** Pixels verde-água claros (o brilho): bem mais verdes e azuis do que vermelhos, e luminosos. */
async function mintPixels(page: Page): Promise<number> {
  const png = (await page.locator("canvas#game").screenshot()).toString("base64");
  return page.evaluate(async data => {
    const image = new Image();
    image.src = "data:image/png;base64," + data;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let mint = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i]!, g = pixels[i + 1]!, b = pixels[i + 2]!;
      if (g >= 170 && b >= 140 && g - r >= 45 && b - r >= 25) mint++;
    }
    return mint;
  }, png);
}

for (const style of ["plain", "luminous"] as const) {
  test(`caverna ${style === "plain" ? "comum" : "luminosa"}: entra, mostra o interior certo e o mapa abre (desktop/Android)`, async ({ page }, info) => {
    const entrance = caveEntranceInCell(CELLS[style][0], CELLS[style][1], SEED)!;
    expect(caveStyleFor(entrance)).toBe(style);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(({ seed, x, y }) => {
      localStorage.setItem("terrania-origins-v1", JSON.stringify({ seed, x, y, hp: 100, kills: 0, defeated: [] }));
      localStorage.setItem("terrania-preferences-v1", JSON.stringify({ zoom: 1, effects: false, cameraMotion: false }));
    }, { seed: SEED, x: entrance.x, y: entrance.y });
    await page.goto("/jogar/?modo=solo");
    await expect(page.locator("canvas#game")).toBeVisible();
    const action = page.locator("#talkButton");
    await expect(action).toContainText("Entrar (E)");
    if (info.project.name === "android") await action.tap(); else await action.click();
    await expect(page.locator("#coords")).toContainText("Subsolo");
    await page.waitForTimeout(400);
    const mint = await mintPixels(page);
    await page.locator("canvas#game").screenshot({ path: test.info().outputPath(`cave-${style}.png`) });
    if (style === "luminous") expect(mint, "brilho verde-água visível").toBeGreaterThan(300);
    else expect(mint, "a comum não tem brilho verde-água").toBeLessThan(60);
    // O mapa do andar abre com a paleta do estilo e sem erros.
    await page.locator("#gameMenuButton").click();
    await page.locator("#inventoryButton").click();
    await page.locator("#inventoryTabMap").click();
    await expect(page.locator("#worldAtlasCanvas")).toBeVisible();
    expect(errors).toEqual([]);
  });
}
