import { expect, test } from "@playwright/test";
import { Slime, slimeSpawns } from "../../src/actors/Slime.ts";
import { OfflineSimulation } from "../../src/engine/OfflineSimulation.ts";
import { clearPath } from "../../src/engine/TapNavigator.ts";
import { SeedCollision } from "../../src/world/collision.ts";

const SEED = 842136;
const STILL = { x: 0, y: 0 };
type Point = { x: number; y: number };

/** Find a real, naturally generated monster rather than faking the Angular list. */
function browserEncounter(): { hero: Point; mob: Slime } {
  const world = new SeedCollision(SEED);
  const offsets = [
    { x: -100, y: 0 }, { x: 100, y: 0 },
    { x: 0, y: -100 }, { x: 0, y: 100 },
    { x: -76, y: -76 }, { x: 76, y: 76 },
  ];
  for (let cy = -2; cy <= 2; cy++) for (let cx = -2; cx <= 2; cx++)
    for (const mob of slimeSpawns(cx, cy, SEED)) for (const o of offsets) {
      const hero = { x: mob.x + o.x, y: mob.y + o.y };
      if (!world.canMove(hero.x, hero.y) || !clearPath(hero, mob, world)) continue;
      const sim = new OfflineSimulation(SEED, {
        seed: SEED, x: hero.x, y: hero.y, hp: 100, kills: 0, defeated: [],
      });
      sim.update(1 / 60, STILL, false);
      if (sim.slimes.has(mob.id)) return { hero, mob };
    }
  throw Error("No naturally spawned slime with a safe browser encounter");
}

test("Battle List acompanha a câmera, seleciona alvo real e inicia perseguição", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  const encounter = browserEncounter();
  await page.addInitScript(({ hero, seed }) => {
    localStorage.setItem("terrania-origins-v1", JSON.stringify({
      seed, x: hero.x, y: hero.y, hp: 100, kills: 0, defeated: [],
    }));
  }, { hero: encounter.hero, seed: SEED });
  await page.setViewportSize({ width: info.project.name === "android" ? 390 : 1200, height: 800 });
  await page.goto("/jogar/?modo=classico");
  await expect(page.locator("canvas#game")).toBeVisible();
  const toggle = page.locator("#battleToggle");
  const panel = page.locator("#battlePanel");
  await expect(toggle).toBeVisible();
  if (info.project.name === "android") {
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(panel).toBeHidden();
    await toggle.tap();
  } else {
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
  }
  await expect(panel).toBeVisible();
  const row = page.locator('.battle-entry[data-creature-id="' + encounter.mob.id + '"]');
  await expect(row).toBeVisible();
  await expect(row).toHaveAttribute("aria-label", "Selecionar Slime, vida 2 de 2");
  await expect(page.locator("#battleCount")).not.toHaveText("0");
  await expect(page.locator(".battle-entry[data-creature-id]")).toHaveCount(
    await page.locator(".battle-entry").count(),
  );
  const initialCoords = await page.locator("#coords").textContent();
  if (info.project.name === "android") await row.tap();
  else await row.click();
  await expect(page.locator("#classicTarget")).toContainText("Slime");
  await expect(page.locator(".battle-entry[aria-pressed=true]")).toHaveCount(1);
  await expect.poll(() => page.locator("#coords").textContent(), { timeout: 8000 })
    .not.toBe(initialCoords);
  await expect(row).toHaveAttribute("aria-label", "Selecionar Slime, vida 1 de 2");
  await toggle.click();
  await expect(panel).toBeHidden();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect(errors).toEqual([]);
});

test("Battle List do solo normal não cobre controles no Android e some no servidor legado", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/jogar/?modo=solo");
  await expect(page.locator("#battleToggle")).toBeVisible();
  await page.locator("#battleToggle").click();
  await expect(page.locator("#battlePanel")).toBeVisible();
  for (const id of ["#attack", "#joystick", "#gameMenuButton", ".quest"]) {
    const battle = await page.locator("#battlePanel").boundingBox();
    const button = await page.locator(id).boundingBox();
    expect(battle && button).toBeTruthy();
    const overlap = battle!.x < button!.x + button!.width &&
      battle!.x + battle!.width > button!.x &&
      battle!.y < button!.y + button!.height &&
      battle!.y + battle!.height > button!.y;
    expect(overlap, "Battle List must not overlap " + id).toBe(false);
  }
  // Keep a mobile-width landscape viewport in both Playwright projects,
  // otherwise the desktop project correctly hides touch-only controls.
  await page.setViewportSize({ width: 600, height: 390 });
  await expect(page.locator("#battlePanel")).toBeVisible();
  const battle = await page.locator("#battlePanel").boundingBox();
  const attack = await page.locator("#attack").boundingBox();
  expect(battle && attack).toBeTruthy();
  expect(battle!.y + battle!.height <= attack!.y ||
    battle!.x + battle!.width <= attack!.x ||
    attack!.x + attack!.width <= battle!.x).toBe(true);
  await page.routeWebSocket("ws://127.0.0.1:18787/ws*", socket => {
    socket.send(JSON.stringify({ type: "welcome", version: 3, id: "legacy", room: "legacy", seed: 842136 }));
  });
  await page.goto("/jogar/?room=legacy");
  await expect(page.locator("#multiplayerStatus")).toContainText("Online");
  await expect(page.locator("#battleSidebar")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("Battle List compacta aceita rolagem por toque e mantém alvos acessíveis", async ({ page }, info) => {
  test.skip(info.project.name !== "android", "O cenário usa gestos de toque do Chromium");
  const selected: string[] = [];
  await page.routeWebSocket("ws://127.0.0.1:18787/ws*", socket => {
    socket.onMessage(data => {
      const message = JSON.parse(String(data));
      if (message.type === "target") selected.push(message.id);
    });
    socket.send(JSON.stringify({ type: "welcome", version: 3, id: "hero", room: "mobile-list",
      seed: SEED, movement: "tiles", combat: "target" }));
    socket.send(JSON.stringify({ type: "state",
      players: [{ id: "hero", name: "Herói", x: 16, y: 16, hp: 100, kills: 0,
        faceX: 0, faceY: 1, walkTime: 0, attackTime: 0 }],
      mobs: Array.from({ length: 5 }, (_, i) => ({
        id: `slime-${i}`, x: 28 + i * 12, y: 16, hp: 2, bounce: 0,
      })),
    }));
  });
  await page.setViewportSize({ width: 390, height: 730 });
  await page.goto("/jogar/?room=mobile-list");
  const toggle = page.locator("#battleToggle");
  const panel = page.locator("#battlePanel");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#battleCount")).toHaveText("5");
  await toggle.tap();
  await expect(panel.locator(".battle-entry")).toHaveCount(5);
  const box = await panel.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeLessThanOrEqual(144);
  expect(box!.height).toBeLessThanOrEqual(102);
  expect(box!.x).toBeGreaterThan(390 / 2);
  expect((await panel.locator(".battle-entry").first().boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(await panel.evaluate(el => el.scrollHeight)).toBeGreaterThan(box!.height);

  const client = await page.context().newCDPSession(page);
  const x = box!.x + box!.width / 2;
  const y = box!.y + box!.height - 12;
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  for (const delta of [14, 28, 42, 56, 70]) {
    await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y - delta }] });
  }
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(() => panel.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  await client.detach();
  await panel.locator('[data-creature-id="slime-4"]').tap();
  await expect.poll(() => selected.at(-1)).toBe("slime-4");

  await page.setViewportSize({ width: 320, height: 568 });
  await expect.poll(async () => (await panel.boundingBox())?.width).toBeLessThanOrEqual(128);
  await page.setViewportSize({ width: 800, height: 390 });
  await expect.poll(async () => (await panel.boundingBox())?.height).toBeLessThanOrEqual(76);
  await expect.poll(async () => (await panel.boundingBox())?.width).toBeLessThanOrEqual(144);
});
