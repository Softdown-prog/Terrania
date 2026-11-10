import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Organização de `src/engine` (ADR 0016): a raiz só guarda a simulação e os limites;
 * cada assunto tem a sua pasta. Arquivo novo vai para a pasta do assunto, não para a raiz.
 */
const ENGINE = "src/engine";
const ROOT_FILES = ["Limits.ts", "OfflineSimulation.ts"];
const SUBFOLDERS = ["character", "combat", "mounts", "movement", "rooms"];

const list = (dir: string): string[] => readdirSync(dir).sort();

test("engine: a raiz tem só a simulação, os limites e o README", () => {
  const files = list(ENGINE).filter(name => statSync(join(ENGINE, name)).isFile());
  assert.deepEqual(files, [...ROOT_FILES, "README.md"].sort(),
    "arquivo novo do motor vai para a pasta do seu assunto (combat, movement, character, mounts, rooms)");
});

test("engine: as pastas de assunto são exatamente estas e nenhuma está vazia", () => {
  const folders = list(ENGINE).filter(name => statSync(join(ENGINE, name)).isDirectory());
  assert.deepEqual(folders, SUBFOLDERS);
  for (const folder of folders) assert.ok(list(join(ENGINE, folder)).some(name => name.endsWith(".ts")), folder + " está vazia");
});

test("engine: cada arquivo mora na pasta do seu assunto", () => {
  const expected: Readonly<Record<string, readonly string[]>> = {
    combat: ["ClassicBattleList.ts", "ClassicCombat.ts", "ClassicPursuit.ts", "SwordCombat.ts", "combat.ts"],
    movement: ["ClassicTileWalker.ts", "TapNavigator.ts"],
    character: ["Equipment.ts", "Experience.ts", "Food.ts", "Inventory.ts", "Weapons.ts", "loot.ts"],
    mounts: ["MountActions.ts", "MountQuestState.ts", "MountStable.ts"],
    rooms: ["CaveRewards.ts", "CaveRoom.ts", "InteriorRoom.ts"],
  };
  for (const [folder, names] of Object.entries(expected))
    assert.deepEqual(list(join(ENGINE, folder)), [...names].sort(), folder);
});
