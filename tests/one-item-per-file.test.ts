import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { FOOD_IDS } from "../src/engine/character/Food.ts";
import { GEAR, gearIdsFor } from "../src/engine/character/Equipment.ts";
import { STAFF_IDS } from "../src/engine/character/Staves.ts";
import { WEAPON_IDS } from "../src/engine/character/Weapons.ts";
import { APPRENTICE_GEAR } from "../src/engine/character/mage/gear/apprentice/index.ts";
import { BREEZE_GEAR } from "../src/engine/character/mage/gear/breeze/index.ts";
import { KNIGHT_GEAR } from "../src/engine/character/knight/gear/index.ts";
import { LEATHER_GEAR } from "../src/engine/character/archer/gear/leather/index.ts";

/**
 * Regra do dono: **um item, um arquivo**. Cada peça de roupa, cada cajado, cada espada, cada alimento e a paleta de cada peça mora no seu arquivo (com o
 * nome do item), e o `index.ts` da pasta só reúne. Assim mexer numa bota é abrir um arquivo só, e o item pode crescer sem inchar os vizinhos.
 */
const read = (path: string): string => readFileSync(path, "utf8");
/** Os arquivos de item de uma pasta: tudo o que é `.ts`, menos o `index.ts` e os arquivos de apoio do conjunto. */
const items = (dir: string, support: readonly string[] = []): string[] =>
  readdirSync(dir).filter(file => file.endsWith(".ts") && file !== "index.ts" && !support.includes(file)).map(file => file.slice(0, -3)).sort();
const exportsOf = (path: string): number => (read(path).match(/^export (const|function|class|interface|type) /gm) ?? []).length;
const oneEach = (dir: string, names: readonly string[], support: readonly string[] = []): void => {
  assert.deepEqual(items(dir, support), [...names].sort(), `${dir}: um arquivo por item, com o nome do item`);
  for (const name of names) assert.equal(exportsOf(`${dir}/${name}.ts`), 1, `${dir}/${name}.ts exporta uma coisa só`);
};

test("roupas: cada peça (do Cavaleiro e de cada conjunto do Mago e do Arqueiro) tem o seu arquivo, com o id da peça no nome", () => {
  oneEach("src/engine/character/knight/gear", Object.keys(KNIGHT_GEAR));
  oneEach("src/engine/character/mage/gear/apprentice", Object.keys(APPRENTICE_GEAR), ["set.ts"]);
  oneEach("src/engine/character/mage/gear/breeze", Object.keys(BREEZE_GEAR), ["set.ts"]);
  oneEach("src/engine/character/archer/gear/leather", Object.keys(LEATHER_GEAR), ["set.ts"]);
  assert.equal(gearIdsFor("knight").length + gearIdsFor("mage").length + gearIdsFor("archer").length, Object.keys(GEAR).length, "toda peça do catálogo é de uma vocação");
  assert.equal(Object.keys(KNIGHT_GEAR).length + Object.keys(APPRENTICE_GEAR).length + Object.keys(BREEZE_GEAR).length + Object.keys(LEATHER_GEAR).length, Object.keys(GEAR).length, "e vem de um conjunto, não de uma lista solta");
  for (const set of ["apprentice", "breeze"]) assert.equal(exportsOf(`src/engine/character/mage/gear/${set}/set.ts`), 1, `o que o conjunto ${set} tem em comum é uma coisa só`);
  assert.equal(exportsOf("src/engine/character/archer/gear/leather/set.ts"), 1, "o que o conjunto Couro Cru tem em comum é uma coisa só");
});

test("cajados, espadas e alimentos: um arquivo por item", () => {
  oneEach("src/engine/character/weapons/staves", STAFF_IDS);
  oneEach("src/engine/character/weapons/swords", WEAPON_IDS);
  oneEach("src/engine/character/foods", FOOD_IDS);
});

test("aparência: a paleta de cada peça de cada conjunto do Mago tem o seu arquivo (e o enfeite do conjunto, o dele)", () => {
  const parts = ["accent", "hat", "robe", "trousers", "boots", "book", "ring", "necklace"];
  for (const set of ["apprentice", "breeze"]) oneEach(`src/render/hero/mage/sets/${set}`, parts);
  const index = read("src/render/hero/mage/sets/index.ts");
  for (const set of ["apprentice", "breeze"]) assert.ok(index.includes(`./${set}/index.ts`), `a ficha do conjunto ${set} vem da pasta dele`);
});

test("o índice de cada pasta de itens só reúne: importa cada arquivo e não define peça nenhuma", () => {
  for (const [dir, names] of [["src/engine/character/knight/gear", Object.keys(KNIGHT_GEAR)], ["src/engine/character/mage/gear/apprentice", Object.keys(APPRENTICE_GEAR)], ["src/engine/character/mage/gear/breeze", Object.keys(BREEZE_GEAR)], ["src/engine/character/archer/gear/leather", Object.keys(LEATHER_GEAR)]] as const) {
    const index = read(`${dir}/index.ts`);
    for (const name of names) assert.ok(index.includes(`from "./${name}.ts"`), `${dir}/index.ts reúne ${name}`);
    assert.equal(/slot:\s*"/.test(index), false, `${dir}/index.ts não define peça nenhuma`);
  }
});
