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

test("tecla curta online chega ao servidor mesmo com soltar antes do tick", async ({ page }) => {
  let id = "", position = [NaN, NaN];
  page.on("websocket", socket => socket.on("framereceived", ({ payload }) => {
    const message = JSON.parse(String(payload));
    if (message.type === "welcome") id = message.id;
    if (message.type === "state") {
      const self = message.players.find((hero: { id: string }) => hero.id === id);
      if (self) position = [self.x, self.y];
    }
  }));
  await freezeGame(page, "/jogar/?room=short-press");
  await expect.poll(() => id.length).toBeGreaterThan(0);
  await page.keyboard.press("d");
  await page.clock.runFor(160);
  await expect.poll(() => position).toEqual([48, 16]);
  // The real server keeps ticking while the browser clock is paused. Advance
  // presentation frames until its latest snapshot is visible, without assuming
  // that a single fixed advance already contained the asynchronous packet.
  await expect.poll(async () => {
    await page.clock.runFor(64);
    return page.locator("#coords").textContent();
  }).toBe("X 1 · Y 0");
  await expect(page.locator("#multiplayerStatus")).toContainText("Online");
});

for (const mode of ["solo", "Node"] as const) {
  test(`ATACAR sem alvo mantém o destino escolhido no mapa (${mode})`, async ({ page }, info) => {
    let sentAttack = false;
    let cancelledWalk = false;
    page.on("websocket", socket => socket.on("framesent", ({ payload }) => {
      const message = JSON.parse(String(payload));
      if (message.type === "input" && message.attack) sentAttack = true;
      if (message.type === "walk" && message.target === null) cancelledWalk = true;
    }));
    await page.addInitScript(() => localStorage.setItem("terrania-preferences-v1", JSON.stringify({
      zoom: 1, effects: false, cameraMotion: false,
    })));
    await freezeGame(page, mode === "solo" ? "/jogar/?modo=solo" : "/jogar/?room=origins");
    if (mode === "Node") await expect(page.locator("#multiplayerStatus")).toContainText("Online");
    const canvas = page.locator("canvas#game");
    const size = (await canvas.boundingBox())!;
    const position = { x: size.width / 2 + 128, y: size.height / 2 };
    const attack = page.locator("#attack");
    const tap = info.project.name === "android";
    if (tap) await canvas.tap({ position }); else await canvas.click({ position });
    await expect.poll(async () => {
      await page.clock.runFor(48);
      return page.locator("#coords").textContent();
    }).toBe("X 1 · Y 0");
    if (tap) await attack.tap(); else await page.keyboard.press("Space");
    await expect.poll(async () => {
      await page.clock.runFor(80);
      return page.locator("#coords").textContent();
    }, { intervals: [80], timeout: 5000 }).toBe("X 4 · Y 0");
    await expect(page.locator("#classicTarget")).toHaveCount(0);
    if (mode === "solo") {
      await page.clock.runFor(300);
      expect(await savedPosition(page)).toEqual([144, 16]);
    } else {
      await expect.poll(() => sentAttack).toBe(true);
      expect(cancelledWalk).toBe(false);
    }
  });
}

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
      await expect(target).toContainText("Slime");
    }
  } finally {
    await touch?.detach();
  }
});

test("segurar ATACAR envia uma seleção por acionamento à sala Node", async ({ page }) => {
  const attacks: boolean[] = [];
  page.on("websocket", socket => socket.on("framesent", ({ payload }) => {
    const message = JSON.parse(String(payload));
    if (message.type === "input") attacks.push(message.attack);
  }));
  await freezeGame(page, "/jogar/?room=attack-intent");
  await expect.poll(async () => {
    await page.clock.runFor(32);
    return page.locator("#multiplayerStatus").textContent();
  }).toContain("Online");
  await expect(page.locator("#classicCombat")).toBeVisible();

  await page.keyboard.down("j");
  await page.clock.runFor(320);
  await expect.poll(() => attacks.slice(attacks.indexOf(true)).length).toBeGreaterThanOrEqual(5);
  expect(attacks.filter(Boolean)).toHaveLength(1);
  await page.keyboard.up("j");
  await page.keyboard.press("j");
  await page.clock.runFor(120);
  await expect.poll(() => attacks.filter(Boolean).length).toBe(2);
});
