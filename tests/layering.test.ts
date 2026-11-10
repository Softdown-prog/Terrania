import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize } from "node:path";

/**
 * Camadas de `src/` (ADR 0016): as pastas de dados do mundo ficam EMBAIXO e não importam as de cima.
 *   world  →  só `world`
 *   monsters, npcs  →  só a si mesmas e `world`
 * Antes, `world/mountQuests.ts` importava `actors/` e fechava o ciclo `actors ↔ world`.
 * Exceção conhecida e com prazo: `world/npcs.ts` reexporta `npcs/` (some quando o PR da vila entrar).
 */
const ALLOWED: Readonly<Record<string, readonly string[]>> = {
  world: ["world"],
  monsters: ["monsters", "world"],
  npcs: ["npcs", "world"],
};
const KNOWN_EXCEPTIONS: ReadonlySet<string> = new Set(["src/world/npcs.ts -> npcs"]);

const IMPORT = /(?:from|import)\s*\(?\s*["'](\.{1,2}\/[^"']+)["']/g;
const files = (dir: string): string[] => readdirSync(dir).flatMap(name => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? files(path) : path.endsWith(".ts") && !path.endsWith(".d.ts") ? [path] : [];
});
const topFolder = (path: string): string => normalize(path).split(/[\\/]/)[1] ?? "";

function importedFolders(file: string): string[] {
  const source = readFileSync(file, "utf8");
  return [...source.matchAll(IMPORT)].map(match => topFolder(join(dirname(file), match[1] ?? "")));
}

test("camadas: world, monsters e npcs só importam o que está abaixo deles", () => {
  const violations: string[] = [];
  for (const [layer, allowed] of Object.entries(ALLOWED))
    for (const file of files(join("src", layer)).map(path => path.replaceAll("\\", "/")))
      for (const target of new Set(importedFolders(file)))
        if (!allowed.includes(target) && !KNOWN_EXCEPTIONS.has(file + " -> " + target))
          violations.push(`${file} importa ${target}/ (${layer} só pode importar: ${allowed.join(", ")})`);
  assert.deepEqual(violations, []);
});

test("camadas: a lista de exceções não guarda entradas que já foram resolvidas", () => {
  const stale = [...KNOWN_EXCEPTIONS].filter(entry => {
    const [file = "", target = ""] = entry.split(" -> ");
    return !importedFolders(file).includes(target);
  });
  assert.deepEqual(stale, [], "remova a exceção: o ciclo já foi desfeito");
});

test("camadas: o vocabulário das montarias vive em world e actors só o reexporta", async () => {
  const world = await import("../src/world/mountIds.ts");
  const actors = await import("../src/actors/MountCatalog.ts");
  assert.strictEqual(actors.MOUNT_IDS, world.MOUNT_IDS, "uma só lista de IDs de montaria");
  assert.equal(world.MOUNT_IDS.length, 10);
});
