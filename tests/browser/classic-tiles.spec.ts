import { expect, test } from "@playwright/test";

test("a URL clássica legada termina o passo quando o controle é solto", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const start = new Date("2026-01-01T00:00:00Z");
  await page.clock.install({ time: start });
  await page.clock.pauseAt(new Date(start.getTime() + 1000));
  await page.goto("/jogar/?modo=classico&passos=1");
  await expect.poll(async () => {
    await page.clock.runFor(32);
    return page.locator("canvas#game").count();
  }).toBe(1);
  await page.clock.runFor(64);
  await expect(page.locator("#classicTileHint")).toContainText("PASSOS 32×32");
  await expect(page.locator("#coords")).toContainText("X 0 · Y 0");
  // Release after crossing the tile edge and before the first step finishes.
  await page.keyboard.down("d");
  await page.clock.runFor(180);
  await page.keyboard.up("d");
  await expect(page.locator("#coords")).toContainText("X 1 · Y 0");
  await page.clock.runFor(800);
  await expect(page.locator("#coords")).toContainText("X 1 · Y 0");
  expect(await page.evaluate(() => {
    window.dispatchEvent(new Event("pagehide"));
    const save = JSON.parse(localStorage.getItem("terrania-origins-v1") ?? "null");
    return [save?.x, save?.y];
  })).toEqual([48, 16]);
  await expect(page.locator("#battleToggle")).toBeVisible();
  expect(errors).toEqual([]);
});

test("o combate por alvo aparece no solo", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/jogar/?modo=classico");
  await expect(page.locator("canvas#game")).toBeVisible();
  await expect(page.locator("#classicTileHint")).toBeVisible();
  await page.goto("/jogar/?modo=solo");
  await expect(page.locator("canvas#game")).toBeVisible();
  await expect(page.locator("#classicTileHint")).toBeVisible();
  expect(errors).toEqual([]);
});

test("toque na parede da Casa do Conselho preserva a rota no solo normal", async ({ page }, info) => {
  await page.addInitScript(() => {
    localStorage.setItem("terrania-origins-v1", JSON.stringify({
      seed: 842136, x: 240, y: -144, hp: 100, kills: 0, defeated: [],
    }));
    localStorage.setItem("terrania-preferences-v1", JSON.stringify({
      zoom: 1, effects: false, cameraMotion: false,
    }));
  });
  const start = new Date("2026-01-01T00:00:00Z");
  await page.clock.install({ time: start });
  await page.clock.pauseAt(new Date(start.getTime() + 1000));
  await page.goto("/jogar/?modo=solo");
  const canvas = page.locator("canvas#game");
  await expect.poll(async () => {
    await page.clock.runFor(32);
    return canvas.count();
  }).toBe(1);
  await page.clock.runFor(64);
  await expect(page.locator("#coords")).toHaveText("X 7 · Y -5");
  const size = await canvas.boundingBox();
  expect(size).not.toBeNull();
  const tap = (x: number, y: number) => {
    const position = { x: size!.width / 2 + x, y: size!.height / 2 + y };
    return info.project.name === "android" ? canvas.tap({ position }) : canvas.click({ position });
  };
  await tap(64, 96);
  await page.clock.runFor(64);
  // The camera has moved less than half a tile. This still lands inside
  // the blocked council tile centered at (336, -112).
  await tap(96, 32);
  await page.clock.runFor(2000);
  expect(await page.evaluate(() => {
    window.dispatchEvent(new Event("pagehide"));
    const save = JSON.parse(localStorage.getItem("terrania-origins-v1") ?? "null");
    return [save?.x, save?.y];
  })).toEqual([304, -48]);
});

test("CLASSIC-004 usa controles responsivos também em paisagem", async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 390 });
  await page.goto("/jogar/?modo=classico&passos=1");
  await expect(page.locator("#classicTileHint")).toBeVisible();
  await expect(page.locator("#joystick")).toBeVisible();
  await expect(page.locator("#attack")).toBeVisible();
  await expect(page.locator("#battleToggle")).toBeVisible();
  await page.locator("#battleToggle").click();
  await expect(page.locator("#battlePanel")).toBeVisible();
  await page.locator("#battleToggle").click();
  await expect(page.locator("#battlePanel")).toBeHidden();
});

for (const layout of ["normal", "landscape"] as const) {
  test(`CLASSIC-004: Battle List persegue e derrota um slime real (${layout})`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    // A naturally generated slime on seed 842136, with a verified clear approach.
    // Start one real abate short of level 2 via the supported solo save.
    const mobId = "-2,-2,0";
    await page.addInitScript(() => {
      localStorage.setItem("terrania-origins-v1", JSON.stringify({
        seed: 842136, x: -660, y: -1008, hp: 100, kills: 0, defeated: [], experience: 20,
      }));
    });
    await page.setViewportSize(layout === "landscape" ? { width: 600, height: 390 } :
      { width: info.project.name === "android" ? 390 : 1200, height: 844 });
    await page.goto("/jogar/?modo=classico");
    await expect(page.locator("canvas#game")).toBeVisible();
    await expect(page.locator("#classicTileHint")).toBeVisible();
    await expect(page.locator("#xpText")).toHaveText("XP 20 / 30");
    const toggle = page.locator("#battleToggle");
    const activate = async (locator: ReturnType<typeof page.locator>) => {
      if (info.project.name === "android") await locator.tap();
      else await locator.click();
    };
    if (await toggle.getAttribute("aria-expanded") !== "true") await activate(toggle);
    const row = page.locator(`.battle-entry[data-creature-id="${mobId}"]`);
    await expect(row).toBeVisible();
    const before = await page.locator("#coords").textContent();
    await activate(row);
    await expect(page.locator("#classicTarget")).toContainText("Slime");
    await expect.poll(() => page.locator("#coords").textContent()).not.toBe(before);
    await expect.poll(() => page.evaluate(id => {
      const save = JSON.parse(localStorage.getItem("terrania-origins-v1") ?? "null");
      return save?.defeated?.includes(id) === true && save.kills >= 1 && save.experience === 30;
    }, mobId), { timeout: 15000 }).toBe(true);
    await expect(row).toHaveCount(0);
    await expect(page.locator("#heroLevel")).toHaveText("NÍVEL 2");
    await expect(page.locator("#hpText")).toHaveText(/\/ 110$/);
    expect(errors).toEqual([]);
  });
}

test("um novo toque permite fugir logo após tomar dano", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    // This tile contains a natural Slime spawn on the default seed.
    localStorage.setItem("terrania-origins-v1", JSON.stringify({
      seed: 842136, x: -560, y: -1008, hp: 100, kills: 0, defeated: [],
    }));
    localStorage.setItem("terrania-preferences-v1", JSON.stringify({
      zoom: 1, effects: false, cameraMotion: false,
    }));
  });
  const start = new Date("2026-01-01T00:00:00Z");
  await page.clock.install({ time: start });
  await page.clock.pauseAt(new Date(start.getTime() + 1000));
  await page.goto("/jogar/?modo=solo");
  await expect.poll(async () => {
    await page.clock.runFor(32);
    return page.locator("#hpText").textContent();
  }).toBe("91 / 100");

  const canvas = page.locator("canvas#game");
  const size = (await canvas.boundingBox())!;
  const position = { x: size.width / 2 + 96, y: size.height / 2 };
  if (info.project.name === "android") await canvas.tap({ position });
  else await canvas.click({ position });
  await page.clock.runFor(1200);
  expect(await page.evaluate(() => {
    window.dispatchEvent(new Event("pagehide"));
    const save = JSON.parse(localStorage.getItem("terrania-origins-v1") ?? "null");
    return [save?.x, save?.y];
  })).toEqual([-464, -1008]);
});
