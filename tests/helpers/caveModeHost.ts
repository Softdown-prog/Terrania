import assert from "node:assert/strict";
import { OfflineSimulation } from "../../src/engine/OfflineSimulation.ts";
import { CaveRoom } from "../../src/engine/rooms/CaveRoom.ts";
import { TravelState } from "../../src/game/TravelState.ts";
import { tickCave } from "../../src/game/modes/caveMode.ts";
import type { Frame, ModeHost } from "../../src/game/modes/types.ts";
import { SpellBolts } from "../../src/render/spells/SpellBolts.ts";
import { caveEntranceInCell } from "../../src/world/caves.ts";

/** O `tickCave` de verdade (a ligação do jogo na caverna) com a simulação, o combate e a caverna reais, e só a tela e o teclado de mentira. */
export const CAVE_SEED = 842136;
export const FRAME: Frame = { dt: 1 / 60, paused: false, movement: { x: 0, y: 0 }, attack: false, manualActive: false, tileRoute: false, still: { x: 0, y: 0 } };
const quiet = new Proxy({}, { get: () => () => undefined }) as unknown;

export interface CaveHost { host: ModeHost; sim: OfflineSimulation; cave: CaveRoom }
export function caveHost(heroClass: "knight" | "mage", entrance = caveEntranceInCell(0, 0, CAVE_SEED)!): CaveHost {
  const sim = new OfflineSimulation(CAVE_SEED, undefined, heroClass);
  const cave = new CaveRoom(entrance, sim.player.hp, sim.player.maxHp, sim.defeated);
  const fake = {
    sim, travel: new TravelState(), hud: quiet, scene: quiet, input: { acknowledgeMovement: () => undefined }, effects: { spells: new SpellBolts() }, camera: { zoom: 1 },
    timers: { clock: 0, battleClock: 0, saveClock: 0, accumulator: 0 }, world: quiet,
    save: () => undefined, updateHud: () => undefined, hudBattleRows: () => [], leaveCave: () => undefined, changeCaveFloor: () => undefined, leaveInterior: () => undefined,
  };
  return { host: fake as unknown as ModeHost, sim, cave };
}

/** Põe o herói a `distance` pixels do slime 5 do treino, em linha reta e livre, e escolhe esse slime como alvo (como um toque nele). Devolve o id. */
export function approachSlime(h: CaveHost, distance: number): string {
  const mob = h.cave.monsters.get("cave:" + CAVE_SEED + ":0:0:floor:1:slime:5")!;
  let spot: { x: number; y: number } | null = null;
  for (let a = 0; a < 32 && !spot; a++) {
    const dx = Math.cos(a * Math.PI / 16), dy = Math.sin(a * Math.PI / 16), x = mob.x + dx * distance, y = mob.y + dy * distance; let clear = h.cave.collision.canMove(x, y);
    for (let s = 1; s <= Math.ceil(distance / 4) && clear; s++) clear = h.cave.collision.canMove(mob.x + dx * 4 * s, mob.y + dy * 4 * s);
    if (clear) spot = { x, y };
  }
  assert.ok(spot, "há uma reta livre até o slime"); h.cave.player.x = spot.x; h.cave.player.y = spot.y;
  assert.equal(h.host.travel.combat.select(mob.id, h.cave.monsters), true); return mob.id;
}

/** Roda `seconds` de jogo na caverna, quadro a quadro, pela ligação real do jogo. */
export function runCave(h: CaveHost, seconds: number): void { for (let i = 0; i < Math.round(seconds * 60); i++) tickCave(h.host, h.cave, FRAME); }
