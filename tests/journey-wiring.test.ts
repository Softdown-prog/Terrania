import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { atlasFrame, atlasTileAt, WORLD_HALF_TILES } from "../src/world/atlas.ts";
import { JOURNEY_MESSAGES } from "../src/game/messages/journeyMessages.ts";

/** A viagem pelo mapa (ADR 0099), do clique no atlas até o herói andando: a conta do clique e a ligação em cada ponto. */
const read = (path: string) => readFileSync(path, "utf8");

test("o clique no atlas vira o tile certo: centro no centro, norte para cima, bordas na borda", () => {
  const world = atlasFrame("world", 0, 0), span = world.spanTiles;
  assert.deepEqual(atlasTileAt(world, .5, .5), { x: 0, y: 0 }, "o meio do mundo");
  assert.deepEqual(atlasTileAt(world, 0, .5), { x: Math.floor(-span / 2), y: 0 }, "a borda de oeste");
  assert.equal(atlasTileAt(world, .75, .5)!.x > 0, true, "à direita é leste");
  assert.equal(atlasTileAt(world, .5, .75)!.y > 0, true, "mais embaixo é mais ao sul (y cresce para baixo, como no jogo)");
  assert.equal(atlasTileAt(world, .5, .25)!.y < 0, true, "mais em cima é mais ao norte");
  const nearby = atlasFrame("nearby", 400, -250); assert.equal(nearby.spanTiles, 128);
  assert.deepEqual(atlasTileAt(nearby, .5, .5), { x: 400, y: -250 }, "o meio dos Arredores é o herói");
  assert.deepEqual(atlasTileAt(nearby, .75, .25), { x: 432, y: -282 }, "um quarto do mapa são 32 tiles");
  assert.equal(WORLD_HALF_TILES > 1000, true);
});

test("clique fora do mapa, número inválido ou além da parede do mundo não escolhem destino", () => {
  const frame = atlasFrame("nearby", 100, 100);
  for (const [fx, fy] of [[-.01, .5], [1.01, .5], [.5, -.01], [.5, 1.01], [NaN, .5], [.5, Infinity]] as const) assert.equal(atlasTileAt(frame, fx, fy), null, `${fx},${fy}`);
  assert.equal(atlasTileAt({ centerX: NaN, centerY: 0, spanTiles: 128 }, .5, .5), null);
  assert.equal(atlasTileAt({ centerX: WORLD_HALF_TILES, centerY: 0, spanTiles: 128 }, .9, .5), null, "além do limite do mundo");
  assert.notEqual(atlasTileAt({ centerX: WORLD_HALF_TILES, centerY: 0, spanTiles: 128 }, .5, .5), null, "no limite ainda vale");
});

test("os avisos da viagem dizem a verdade e cabem no jogo", () => {
  assert.match(JOURNEY_MESSAGES.started(120), /faltam cerca de 120 tiles/);
  assert.match(JOURNEY_MESSAGES.started(120), /Cancelar/);
  for (const key of ["arrived", "stuck", "danger", "cancelled", "outside", "down", "blocked", "here"] as const) assert.ok(JOURNEY_MESSAGES[key].length > 8, key);
});

test("o jogo liga a viagem: começa só na superfície e vivo, para ao assumir o controle, e o quadro da viagem roda antes do movimento", () => {
  const game = read("src/game/Game.ts");
  assert.match(game, /this\.hud\.onJourneyStart\(\(tileX, tileY\) => this\.startJourney\(tileX, tileY\)\);/);
  assert.match(game, /this\.hud\.onJourneyCancel\(\(\) => this\.cancelJourney\(\)\);/);
  const start = game.slice(game.indexOf("private startJourney"), game.indexOf("private cancelJourney"));
  assert.match(start, /if \(this\.cave \|\| this\.interior\) return JOURNEY_MESSAGES\.outside;/);
  assert.match(start, /if \(this\.sim\.awaitingRespawn \|\| this\.sim\.player\.hp <= 0\) return JOURNEY_MESSAGES\.down;/);
  assert.match(start, /nearestWalkable\(/); assert.match(start, /JOURNEY_ARRIVAL\) return JOURNEY_MESSAGES\.here;/);
  assert.match(start, /this\.travel\.journey\.start\(goal\);/);
  assert.match(start, /this\.travel\.autoFollow = false;/);
  assert.match(game, /if \(manualActive\) this\.cancelJourney\(\);/, "apertar uma tecla de andar cancela");
  assert.match(game, /if \(tap && !paused && !manualActive && !attack\) \{\n\s+this\.cancelJourney\(\);/, "tocar no chão ou numa criatura cancela");
  assert.match(game, /this\.travel\.autoFollow = true;\n\s+this\.travel\.navigator\.cancel\(\);\n\s+this\.cancelJourney\(\);/, "escolher alvo para lutar cancela");
  assert.ok(game.indexOf("this.tickJourney();") > game.indexOf("const tap = this.input.consumeTap();") && game.indexOf("this.tickJourney();") < game.indexOf("const controlled = "), "o quadro da viagem vem depois do toque e antes do movimento");
  const tick = game.slice(game.indexOf("private tickJourney"), game.indexOf("private tileCenter"));
  assert.match(tick, /if \(this\.cave \|\| this\.interior\) \{ if \(journey\.active\) \{ journey\.cancel\(\); this\.hud\.setJourney\(null\); \} return; \}/, "caverna e casa encerram a viagem");
  assert.match(tick, /player\.hp < this\.journeyHp - \.001/, "perder vida é perigo");
  assert.match(tick, /JOURNEY_DANGER_RADIUS/); assert.match(read("src/game/Game.ts"), /const JOURNEY_DANGER_RADIUS = 150;/);
  assert.match(tick, /tileSteps: true, snap: point => this\.tileCenter\(point\)/, "a superfície anda por tiles");
  assert.match(tick, /if \(event\) \{ this\.hud\.setJourney\(null\); this\.hud\.setTravelNotice\(JOURNEY_MESSAGES\[event\]\); return; \}/, "chegar, desistir e perigo avisam");
});

test("o HUD e a tela do mapa: clique escolhe, botão viaja, cancelar para, e o marcador aparece no mapa", () => {
  const ui = read("src/ui/GameUi.ts"), hud = read("src/app/hud.service.ts"), page = read("src/app/game-page.component.ts"), html = read("src/app/game-page.html");
  for (const method of ["onJourneyStart", "onJourneyCancel", "setJourney"]) { assert.match(ui, new RegExp(method + "\\("), `GameUi.${method}`); assert.match(hud, new RegExp(method + "\\("), `HudService.${method}`); }
  assert.match(hud, /startJourney\(tileX: number, tileY: number\): string \{\n\s+const message = this\.journeyStartCallback\(tileX, tileY\);\n\s+this\.setTravelNotice\(message\);/);
  assert.match(hud, /cancelJourney\(\): void \{ this\.journeyCancelCallback\(\); \}/);
  assert.match(page, /atlasTileAt\(this\.atlasView\(\), \(event\.clientX - rect\.left\) \/ rect\.width, \(event\.clientY - rect\.top\) \/ rect\.height\)/);
  assert.match(page, /if \(this\.hud\.cave\(\) \|\| !\(event\.currentTarget instanceof HTMLCanvasElement\)\) return;/, "dentro de caverna o mapa não escolhe destino");
  assert.match(page, /drawWorldAtlas\(ctx, scale, x, y, seed, sector, this\.atlasTarget\(\)\);/, "o marcador é desenhado no mapa");
  assert.match(page, /if \(this\.hud\.journeyRemaining\(\) === null\) return;/, "se a viagem não começou, o mapa continua aberto");
  assert.match(page, /this\.inventoryDialog\(\)\.nativeElement\.close\(\);/, "ao começar, fecha o mapa");
  assert.match(html, /id="worldAtlasCanvas"[^>]*class="atlas-pickable"\s+\(click\)="pickAtlasTarget\(\$event\)"/);
  for (const id of ["atlasTravelTarget", "atlasTravelGo", "atlasTravelProgress", "atlasTravelCancel", "journeyBar", "journeyCancel"]) assert.match(html, new RegExp(`id="${id}"`), id);
  assert.match(html, /\(click\)="travelToTarget\(\)"/); assert.match(html, /\(click\)="hud\.cancelJourney\(\)"/);
  const terrain = read("src/render/terrain.ts");
  assert.match(terrain, /destination: \{ readonly x: number; readonly y: number \} \| null = null,/);
  assert.match(terrain, /ctx\.setLineDash\(\[4, 3\]\);/, "linha tracejada até o destino"); assert.match(terrain, /mark\(destination\.x, destination\.y, "#ffd36b", 8\);/);
});
