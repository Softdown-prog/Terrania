import test from "node:test";
import assert from "node:assert/strict";
import { REGIONAL_CREATURE_KINDS } from "../src/monsters/catalog.ts";
import { CaveRoom } from "../src/engine/rooms/CaveRoom.ts";
import { RegionalMonster } from "../src/actors/RegionalMonster.ts";
import { Player } from "../src/actors/Player.ts";
import { renderRegionalCreature } from "../src/render/regionalCreatures.ts";
import { NATURAL_FACING, facingKey, mirrored } from "../src/render/creatures/shared/facing.ts";

/**
 * Relato do dono: as criaturas andavam de lado. Cada uma era desenhada sempre olhando para o mesmo lado; agora a criatura guarda para onde olha (o sentido em que anda e,
 * parada perto do herói, o lado dele) e as espécies desenhadas de perfil são espelhadas quando olham para o lado contrário ao do desenho.
 */
const OPEN = { canMove: () => true, speedAt: () => 1 };
const calls = (kind: string, facing: number | undefined): string[] => {
  const out: string[] = [];
  const stub = new Proxy({}, { get: (_t, name: string) => (...args: unknown[]) => { out.push(name + ":" + args.filter(a => typeof a === "number").join(",")); return name.startsWith("create") ? { addColorStop: () => undefined } : undefined; } });
  renderRegionalCreature(stub as unknown as CanvasRenderingContext2D, { kind: kind as never, hp: 99999, id: "t", facing, moving: 0, motionPhase: 0 }, 0, 0, 1);
  return out;
};
const mirrors = (list: string[]) => list.filter(call => call === "scale:-1,1").length;

test("a tabela do lado do desenho só tem espécies de verdade, e só de perfil (dezessete)", () => {
  const kinds = Object.keys(NATURAL_FACING);
  assert.equal(kinds.length, 17);
  for (const kind of kinds) assert.ok((REGIONAL_CREATURE_KINDS as readonly string[]).includes(kind), kind);
  assert.deepEqual(Object.entries(NATURAL_FACING).filter(([, side]) => side === 1).map(([kind]) => kind).sort(), ["glacial-wolf", "runic-polar-bear", "summit-griffin", "tundra-mammoth"]);
  for (const kind of ["gray-wolf", "wild-boar", "giant-rat", "root-beetle", "root-spider", "vine-snake", "living-root", "elder-cave-ent"]) assert.equal(NATURAL_FACING[kind as keyof typeof NATURAL_FACING], -1, kind);
});

test("só se espelha quem é de perfil e olha para o lado contrário; direção ausente ou inválida nunca espelha", () => {
  assert.equal(mirrored({ kind: "gray-wolf", hp: 1, facing: 1 }), true);
  assert.equal(mirrored({ kind: "gray-wolf", hp: 1, facing: -1 }), false);
  assert.equal(mirrored({ kind: "glacial-wolf", hp: 1, facing: -1 }), true);
  assert.equal(mirrored({ kind: "glacial-wolf", hp: 1, facing: 1 }), false);
  for (const facing of [undefined, 0, NaN, 2, -2]) assert.equal(mirrored({ kind: "gray-wolf", hp: 1, facing }), false, String(facing));
  for (const facing of [-1, 1]) assert.equal(mirrored({ kind: "basalt-golem", hp: 1, facing }), false, "de frente não vira");
  assert.notEqual(facingKey({ kind: "gray-wolf", hp: 1, facing: 1 }, 1), facingKey({ kind: "gray-wolf", hp: 1, facing: -1 }, 1), "o quadro espelhado é outro quadro no cache");
  assert.equal(facingKey({ kind: "basalt-golem", hp: 1, facing: 1 }, 1), facingKey({ kind: "basalt-golem", hp: 1, facing: -1 }, 1), "e os de frente dividem o mesmo quadro");
});

test("o desenho espelha uma vez a mais quando a criatura olha para o lado contrário; os de frente desenham igual", () => {
  for (const kind of ["gray-wolf", "wild-boar", "root-beetle", "elder-cave-ent", "dune-rat", "storm-serpent"]) {
    assert.equal(mirrors(calls(kind, 1)), mirrors(calls(kind, -1)) + 1, `${kind}: olhando para a direita espelha`);
    assert.equal(mirrors(calls(kind, undefined)), mirrors(calls(kind, -1)), `${kind}: sem direção, desenha como sempre`);
  }
  for (const kind of ["glacial-wolf", "tundra-mammoth", "runic-polar-bear", "summit-griffin"]) {
    assert.equal(mirrors(calls(kind, -1)), mirrors(calls(kind, 1)) + 1, `${kind}: olhando para a esquerda espelha`);
  }
  for (const kind of ["basalt-golem", "coral-crab", "moss-slime", "walking-mushroom", "cave-bat", "sand-goblin"]) assert.deepEqual(calls(kind, 1), calls(kind, -1), `${kind}: de frente, igual dos dois lados`);
});

test("a sombra e a barra de vida não espelham: o espelho só envolve o corpo", () => {
  const list = calls("gray-wolf", 1), open = list.indexOf("scale:-1,1");
  assert.ok(open > 0 && list.slice(0, open).some(call => call.startsWith("arc:0,0,21")), "a sombra é pintada antes do espelho");
  const wolfHurt = (facing: number) => { const out: string[] = []; const stub = new Proxy({}, { get: (_t, name: string) => (...args: unknown[]) => { out.push(name + ":" + args.join(",")); return name.startsWith("create") ? { addColorStop: () => undefined } : undefined; } });
    renderRegionalCreature(stub as unknown as CanvasRenderingContext2D, { kind: "gray-wolf", hp: 10, id: "t", facing, moving: 0, motionPhase: 0 }, 0, 0, 1); return out; };
  const bar = (list: string[]) => list.slice(-14);
  assert.ok(bar(wolfHurt(1)).some(call => call.startsWith("fillStyle") || call.startsWith("fill")), "o fim do desenho é a barra de vida");
  assert.deepEqual(bar(wolfHurt(1)), bar(wolfHurt(-1)), "a barra sai igual olhando para qualquer lado");
});

test("o monstro olha para o lado em que anda e, parado perto do herói, para o lado dele", () => {
  const hero = new Player(); hero.x = 0; hero.y = 0;
  const wolf = new RegionalMonster("w", "gray-wolf", 150, 0);
  assert.equal(wolf.facing, -1, "começa olhando para a esquerda");
  for (let i = 0; i < 20; i++) wolf.update(1 / 20, hero, OPEN, 0, false);
  assert.ok(wolf.x < 150, "andou para a esquerda atrás do herói"); assert.equal(wolf.facing, -1);
  const east = new RegionalMonster("e", "gray-wolf", -150, 0);
  for (let i = 0; i < 20; i++) east.update(1 / 20, hero, OPEN, 0, false);
  assert.ok(east.x > -150); assert.equal(east.facing, 1, "andando para a direita, olha para a direita");
  const near = new RegionalMonster("n", "gray-wolf", -10, 0); near.update(1 / 20, hero, OPEN, 0, false);
  assert.equal(near.facing, 1, "colado no herói, que está à sua direita, encara o herói");
  hero.x = -300; hero.y = 0; const flip = new RegionalMonster("f", "gray-wolf", -10, 0);
  assert.ok(Math.hypot(hero.x - flip.x, 0) > 245); flip.facing = 1; flip.update(1 / 20, hero, OPEN, 0, false);
  assert.equal(flip.facing, 1, "longe demais para notar o herói, mantém o lado");
});

test("ao fugir o monstro olha para onde corre; subir ou descer não vira o corpo", () => {
  const hero = new Player(); hero.x = 0; hero.y = 0;
  const up = new RegionalMonster("u", "gray-wolf", 0, 120); up.facing = 1;
  for (let i = 0; i < 10; i++) up.update(1 / 20, hero, OPEN, 0, false);
  assert.ok(up.y < 120, "sobe atrás do herói"); assert.equal(up.facing, 1, "andar na vertical mantém o lado");
});

test("na caverna o povo também olha para onde anda", () => {
  const cave = new CaveRoom({ id: "cave:1:5:5", tileX: 5, tileY: 5, seed: 1, theme: "verdant", kind: "cave", name: "x", x: 0, y: 0 } as never, 100, 100, new Set());
  for (const mob of cave.monsters.values()) if (mob instanceof RegionalMonster) assert.ok(mob.facing === -1 || mob.facing === 1);
});

test("andando na diagonal, o lado vale quando o passo é pelo menos 40 % horizontal; colado e quase alinhado com o herói, não balança de um lado para o outro", () => {
  const hero = new Player(); hero.x = 0; hero.y = 0;
  const diagonal = new RegionalMonster("d", "gray-wolf", 100, 120); diagonal.facing = 1; // passo de uns 2 para 4: mais de 40 % horizontal
  diagonal.update(1 / 20, hero, OPEN, 0, false);
  assert.equal(diagonal.facing, -1, "um passo com mais de 40 % na horizontal já vira o corpo para o lado que anda");
  const steep = new RegionalMonster("s", "gray-wolf", 20, 200); steep.facing = 1; // passo de 1 para 10: quase só vertical
  steep.update(1 / 20, hero, OPEN, 0, false);
  assert.equal(steep.facing, 1, "um passo quase todo vertical não vira o corpo");
  const stuck = new RegionalMonster("k", "gray-wolf", 3, 10); stuck.facing = 1; // parado de tão perto, com o herói 3 px para o lado
  stuck.update(1 / 20, hero, OPEN, 0, false);
  assert.equal(stuck.facing, 1, "a menos de 6 px de lado não troca de lado só por isso");
});
