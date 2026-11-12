import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { boundaryViolations, importsOf, placeOf } from "./helpers/boundaries.ts";

/**
 * Fronteiras entre regiões e entre subpastas (ADR 0045): mexer numa área não pode obrigar a ler nem quebrar outra.
 * A varredura é pura (`tests/helpers/boundaries.ts`), então se prova com arquivos de mentira antes de valer para o repositório.
 */
const files = (dir: string): string[] => readdirSync(dir).flatMap(name => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? files(path) : path.endsWith(".ts") ? [path] : [];
});
const source = (entries: Record<string, string>): Map<string, string> => new Map(Object.entries(entries));

test("o repositório inteiro respeita as fronteiras: nada entre regiões e nada entre subpastas irmãs, exceto o kit", () => {
  const all = new Map(files("src").map(f => [f.replaceAll("\\", "/"), readFileSync(f, "utf8")] as const));
  assert.ok(all.size > 350, "a varredura leu o código todo: " + all.size);
  assert.deepEqual(boundaryViolations(all), []);
});

test("a varredura enxerga uma importação entre regiões, em qualquer camada", () => {
  const bad = boundaryViolations(source({
    "src/render/south/city/a.ts": 'import { x } from "../../north/b.ts";',
    "src/monsters/west/orcs/o.ts": 'import { y } from "../../east/crabs/c.ts";',
    "src/render/creatures/south/s.ts": 'import { z } from "../north/n.ts";',
  }));
  assert.equal(bad.length, 3);
  assert.ok(bad.every(v => v.includes("importa outra região")));
});

test("a varredura enxerga uma subpasta importando a irmã, mas deixa passar o kit", () => {
  const bad = boundaryViolations(source({
    "src/render/south/city/a.ts": 'import { x } from "../towers/t.ts";',
    "src/render/south/city/b.ts": 'import { x } from "../kit/index.ts";',
    "src/render/south/towers/c.ts": 'export { x } from "../kit/brush.ts";',
    "src/render/south/kit/d.ts": 'import { x } from "../towers/t.ts";',
  }));
  assert.deepEqual(bad.map(v => v.split(": ")[0]), ["src/render/south/city/a.ts -> src/render/south/towers/t.ts", "src/render/south/kit/d.ts -> src/render/south/towers/t.ts"]);
  assert.match(bad[0]!, /só o kit é compartilhado/);
  assert.match(bad[1]!, /o kit compartilhado importa a subpasta irmã/);
});

test("a varredura não reclama do que é permitido: a própria subpasta, o que é comum e quem está fora das regiões", () => {
  assert.deepEqual(boundaryViolations(source({
    "src/render/south/city/a.ts": 'import { x } from "./buildings/b.ts"; import { y } from "../../draw.ts"; import { z } from "../../../world/random.ts";',
    "src/render/south/city/buildings/b.ts": 'import { x } from "../paving/p.ts"; import { y } from "../../../draw.ts";',
    "src/render/terrain.ts": 'import { x } from "./south/city/paving/index.ts"; import { y } from "./north/z.ts";',
    "src/world/south/cityPlaza.ts": 'import { SOUTH_CITY } from "../southCity.ts";',
    "src/render/south/city/c.ts": 'import { t } from "../../../world/south/decor/types.ts";',
  })), [], "fora das regiões, quem importa uma região é o cadastro central; entre camadas, a região é a mesma zona");
});

test("a varredura vale entre camadas (arte do Sul lendo o mundo do Norte), deixa passar a mesma região em outra camada e lê imports dinâmicos", () => {
  assert.equal(boundaryViolations(source({ "src/render/south/a.ts": 'import { x } from "../../world/north/b.ts";' })).length, 1, "a arte do Sul não lê o mundo do Norte");
  assert.deepEqual(boundaryViolations(source({ "src/render/south/city/a.ts": 'import { x } from "../../../world/south/cityPlaza.ts";' })), [], "mas lê o mundo do próprio Sul");
  assert.equal(boundaryViolations(source({ "src/render/south/city/a.ts": 'const m = await import("../../north/b.ts");' })).length, 1);
  assert.deepEqual(importsOf("src/a/b.ts", 'import x from "pkg"; import y from "./c.ts"; export * from "../d.ts";'), ["src/a/c.ts", "src/d.ts"]);
  assert.deepEqual(importsOf("src/a/b.ts", 'import "./efeito.ts"; import type { T } from "./t.ts";'), ["src/a/efeito.ts", "src/a/t.ts"], "import só de efeito colateral também conta");
  assert.equal(boundaryViolations(source({ "src/render/south/city/a.ts": 'import "../towers/t.ts";' })).length, 1);
  assert.deepEqual(placeOf("src/render/south/city/a.ts"), { zone: "src/render", region: "south", sub: "city" });
  assert.deepEqual(placeOf("src/render/south/a.ts"), { zone: "src/render", region: "south", sub: null });
  assert.equal(placeOf("src/render/terrain.ts"), null);
});
