import { expect, test, type Page } from "@playwright/test";

async function freezeGame(page: Page, route: string): Promise<void> {
  const time = new Date("2026-01-01T00:00:00Z");
  await page.clock.install({ time });
  await page.clock.pauseAt(new Date(time.getTime() + 1000));
  await page.goto(route);
  await expect.poll(async () => {
    await page.clock.runFor(32);
    return page.locator("canvas#game").count();
  }).toBe(1);
  await page.clock.runFor(64);
}
async function savedPosition(page: Page): Promise<number[]> {
  return page.evaluate(() => {
    window.dispatchEvent(new Event("pagehide"));
    const save = JSON.parse(localStorage.getItem("terrania-origins-v1") ?? "null");
    return [save?.x, save?.y];
  });
}

test("Jogar solo preserva teclas curtas entre frames, vira e para no centro", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await freezeGame(page, "/jogar/?modo=solo");
  // Both real DOM events occur before the next animation/simulation frame.
  await page.keyboard.press("d");
  await page.clock.runFor(700);
  expect(await savedPosition(page)).toEqual([48, 16]);
  await page.keyboard.press("w");
  await page.clock.runFor(700);
  expect(await savedPosition(page)).toEqual([48, -16]);
  await page.clock.runFor(700);
  expect(await savedPosition(page)).toEqual([48, -16]);
  expect(errors).toEqual([]);
});

test("uma virada curta durante o passo é executada uma vez no próximo tile", async ({ page, context }, info) => {
  await freezeGame(page, "/jogar/?modo=solo");
  const android = info.project.name === "android";
  const joystick = page.locator("#joystick");
  const stick = android ? (await joystick.boundingBox())! : null;
  if (stick) await joystick.tap({ position: { x: stick.width * 0.82, y: stick.height / 2 } });
  else await page.keyboard.press("d");
  await page.clock.runFor(80);
  const [x, y] = await savedPosition(page);
  expect(x).toBeGreaterThan(16);
  expect(x).toBeLessThan(48);
  expect(y).toBe(16);

  if (stick) await joystick.tap({ position: { x: stick.width / 2, y: stick.height * 0.18 } });
  else await page.keyboard.press("w");
  await page.clock.runFor(80);
  expect((await savedPosition(page))[1]).toBe(16);
  await page.clock.runFor(700);
  expect(await savedPosition(page)).toEqual([48, -16]);

  if (stick) {
    const touch = await context.newCDPSession(page);
    const left = { x: stick.x + stick.width * 0.18, y: stick.y + stick.height / 2 };
    try {
      await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [left] });
      await page.clock.runFor(80);
      // A small drag in the same direction is still the same hold.
      await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...left, y: left.y + 7 }] });
      await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    } finally { await touch.detach(); }
  } else {
    await page.keyboard.down("a");
    await page.clock.runFor(80);
    await page.keyboard.up("a");
  }
  await page.clock.runFor(700);
  expect(await savedPosition(page)).toEqual([16, -16]);
});

test("ATACAR sem alvo mantém o destino escolhido no mapa", async ({ page }, info) => {
  await page.addInitScript(() => localStorage.setItem("terrania-preferences-v1", JSON.stringify({
    zoom: 1, effects: false, cameraMotion: false,
  })));
  await freezeGame(page, "/jogar/?modo=solo");
  const canvas = page.locator("canvas#game");
  const size = (await canvas.boundingBox())!;
  const position = { x: size.width / 2 + 128, y: size.height / 2 };
  const attack = page.locator("#attack");
  const tap = info.project.name === "android";
  if (tap) await canvas.tap({ position }); else await canvas.click({ position });
  await page.clock.runFor(160);
  await expect(page.locator("#coords")).toHaveText("X 1 · Y 0");
  if (tap) await attack.tap(); else await page.keyboard.press("Space");
  await page.clock.runFor(80);
  await expect.poll(async () => {
    await page.clock.runFor(80);
    return page.locator("#coords").textContent();
  }, { intervals: [80], timeout: 5000 }).toBe("X 4 · Y 0");
  await expect(page.locator("#classicTarget")).toHaveCount(0);
  await page.clock.runFor(300);
  expect(await savedPosition(page)).toEqual([144, 16]);
});

test("dois dedos caminham e atacam no solo normal sem prender o joystick", async ({ page, context }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem("terrania-origins-v1", JSON.stringify({
      seed: 842136, x: -660, y: -1008, hp: 100, kills: 0, defeated: [],
    }));
    localStorage.setItem("terrania-preferences-v1", JSON.stringify({ zoom: 1.5, effects: true, cameraMotion: false }));
  });
  await page.goto("/jogar/?modo=solo");
  await expect(page.locator("#joystick")).toBeVisible();
  // Wait for the real world and naturally generated creature, not a test actor.
  await expect(page.locator("#battleCount")).toHaveText(/[1-9]/);
  const stick = (await page.locator("#joystick").boundingBox())!;
  const attack = (await page.locator("#attack").boundingBox())!;
  const finger = { x: stick.x + stick.width * 0.82, y: stick.y + stick.height / 2, id: 1 };
  const sword = { x: attack.x + attack.width / 2, y: attack.y + attack.height / 2, id: 2 };
  const touch = await context.newCDPSession(page);
  try {
    await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [finger] });
    await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [finger, sword] });
    await expect(page.locator("#classicTarget")).toContainText("Slime");
    await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [finger] });
    await expect(page.locator("#coords")).not.toHaveText("X -21 · Y -32");
    await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(page.locator("#stick")).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
    await expect.poll(() => page.evaluate(() => {
      const save = JSON.parse(localStorage.getItem("terrania-origins-v1") ?? "null");
      return save?.defeated?.includes("-2,-2,0");
    }), { timeout: 15000 }).toBe(true);
    await page.screenshot({ path: test.info().outputPath("character-mobile-combat.png") });
    expect(errors).toEqual([]);
  } finally { await touch.detach(); }
});

test("abrir ajustes descarta comandos pendentes e fechar não inicia passo fantasma", async ({ page }) => {
  await freezeGame(page, "/jogar/?modo=solo");
  await page.locator("#gameMenuButton").click();
  await page.clock.runFor(32); // Angular renders the expanded options.
  await page.keyboard.press("d");
  await page.locator("#settingsButton").click();
  await page.clock.runFor(64);
  await page.locator("#settingsDialog .dialog-x").click();
  await page.clock.runFor(700);
  expect(await savedPosition(page)).toEqual([16, 16]);
});


test("cancelamento do gesto antes do frame descarta caminhada e ataque pendentes", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem("terrania-origins-v1", JSON.stringify({
    seed: 842136, x: -660, y: -1008, hp: 100, kills: 0, defeated: [],
  })));
  await freezeGame(page, "/jogar/?modo=solo");
  const stick = (await page.locator("#joystick").boundingBox())!;
  const attack = (await page.locator("#attack").boundingBox())!;
  const touch = await context.newCDPSession(page);
  try {
    await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [
      { x: stick.x + stick.width * 0.82, y: stick.y + stick.height / 2, id: 1 },
      { x: attack.x + attack.width / 2, y: attack.y + attack.height / 2, id: 2 },
    ] });
    await touch.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
    await page.clock.runFor(700);
    expect(await savedPosition(page)).toEqual([-660, -1008]);
    await expect(page.locator("#classicTarget")).toHaveCount(0);
    await expect(page.locator("#stick")).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
  } finally { await touch.detach(); }
});

test("cancelar o alvo com ATACAR segurado exige um novo acionamento", async ({ page, context }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem("terrania-origins-v1", JSON.stringify({
    seed: 842136, x: -660, y: -1008, hp: 100, kills: 0, defeated: [],
  })));
  await freezeGame(page, "/jogar/?modo=solo");
  const target = page.locator("#classicTarget");
  const touch = info.project.name === "android" ? await context.newCDPSession(page) : null;
  try {
    if (touch) {
      const attack = (await page.locator("#attack").boundingBox())!;
      await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [
        { x: attack.x + attack.width / 2, y: attack.y + attack.height / 2 },
      ] });
    } else {
      await page.keyboard.down("j");
    }
    await page.clock.runFor(64);
    await expect(target).toContainText("Slime");

    await page.keyboard.press("Escape");
    await page.clock.runFor(240);
    await expect(target).toHaveCount(0, { timeout: 1000 });

    if (touch) await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    else await page.keyboard.up("j");
    await page.clock.runFor(64);
    await expect(target).toHaveCount(0);
    await page.keyboard.press("j");
    await page.clock.runFor(64);
    await expect(target).toContainText("Slime");
    if (!touch) {
      await page.locator("#attack").focus();
      await page.keyboard.down("Enter");
      await page.clock.runFor(64);
      await page.keyboard.press("Escape");
      await page.clock.runFor(64);
      await page.keyboard.down("Enter"); // Repeat while the attack button has focus.
      await page.clock.runFor(240);
      await expect(target).toHaveCount(0);
      await page.keyboard.up("Enter");
      await page.keyboard.press("Enter");
      await page.clock.runFor(64);
      // A new press may reselect the Slime, or there may be no target left:
      // the new 8-damage wooden sword defeats a 2-HP Slime on the first hit.
      const retargeted = await target.count() > 0;
      if (retargeted) await expect(target).toContainText("Slime");
      else await expect.poll(() => page.evaluate(() => {
        const saved=JSON.parse(localStorage.getItem("terrania-origins-v1") ?? "null");
        return saved?.defeated?.includes("-2,-2,0") === true;
      })).toBe(true);
    }
  } finally {
    await touch?.detach();
  }
});
