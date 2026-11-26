import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { Inventory } from "../src/engine/character/Inventory.ts";
import { GEAR, MAGE_STARTING_GEAR, gearHeroClass, gearIdsFor, gearLevel, gearSetName, gearUnlocked, type GearId } from "../src/engine/character/Equipment.ts";
import { BREEZE_GEAR } from "../src/engine/character/mage/gear/breeze/index.ts";
import { gearBonus, scaledMaxMana } from "../src/engine/character/gearBonus.ts";
import { MAGE } from "../src/engine/character/classes/index.ts";
import { experienceForLevel } from "../src/engine/character/Experience.ts";
import { equipGear } from "../src/game/actions/shopActions.ts";
import type { ShopContext } from "../src/game/actions/shopContext.ts";
import { INVENTORY_FEEDBACK } from "../src/game/messages/inventoryFeedback.ts";
import { renderHero } from "../src/render/actors.ts";
import { mageWear } from "../src/render/hero/mage/index.ts";
import { APPRENTICE_THEME, BREEZE_THEME, MAGE_SETS, themeOfPiece, type MageSetTheme } from "../src/render/hero/mage/sets/index.ts";
import { drawWizardHat } from "../src/render/hero/mage/hat.ts";
import { drawMageRobe } from "../src/render/hero/mage/robe.ts";
import { drawMageCloak } from "../src/render/hero/mage/cloak.ts";
import { drawMageBook } from "../src/render/hero/mage/gear/book.ts";
import { drawMageRing } from "../src/render/hero/mage/gear/ring.ts";
import { drawMagePendant } from "../src/render/hero/mage/gear/pendant.ts";
import { drawMageTorso } from "../src/render/hero/mage/torso.ts";
import { MAGE_ICON_PARTS, mageIconTint, mageSetTheme } from "../src/app/mage-set-icon.ts";
import { signature, spy } from "./helpers/spyContext.ts";

/**
 * As roupas do Mago, lote B1 (ADR 0080): cada peça passa a ter nível mínimo (libera sozinha, como espadas e cajados), cada conjunto tem a sua ficha de cor
 * e de enfeite no desenho e nos ícones, e entra o conjunto da Brisa (nível 10, sete peças, com os números reais de `docs/MAGO_ROUPAS.md`).
 */
const SEED = 842136;
const read = (path: string): string => readFileSync(path, "utf8");
const context = (sim: OfflineSimulation): ShopContext => ({ sim, hero: sim.player, inInterior: false, menuOpen: true, caveHeroDown: false } as unknown as ShopContext);
const IDS = ["breeze-hat", "breeze-robe", "breeze-trousers", "breeze-boots", "breeze-tome", "breeze-ring", "breeze-necklace"] as const;
const SLOTS = ["head", "chest", "legs", "feet", "shield", "ring", "neck"] as const;
const mageAt = (level: number, gear?: Record<string, string>): OfflineSimulation => {
  const { mana: _m, inventory: _i, ...rest } = new OfflineSimulation(SEED, undefined, "mage").snapshot();
  return new OfflineSimulation(SEED, { ...rest, experience: experienceForLevel(level), inventory: { gel: 0, potion: 0, questRewardClaimed: false, ...(gear ? { gear } : {}) } } as never);
};
const BREEZE_ALL = Object.fromEntries(IDS.map((id, i) => [SLOTS[i]!, id])) as Record<string, string>;

test("o conjunto da Brisa: sete peças do Mago, uma por espaço, nível 10, com os nomes, a defesa e os bônus da lista", () => {
  assert.deepEqual(Object.keys(BREEZE_GEAR), [...IDS]);
  assert.deepEqual(IDS.map(id => GEAR[id].slot), [...SLOTS]);
  assert.deepEqual(IDS.map(id => GEAR[id].name), ["Chapéu de Penas", "Túnica da Brisa", "Calça do Vento Leve", "Botas de Sopro", "Compêndio das Brisas", "Anel do Sopro", "Colar de Pena e Vidro"]);
  assert.deepEqual(IDS.map(id => GEAR[id].defense), [0, 1, 1, 0, 0, 0, 0], "defesa total 2: túnica 1 e calça 1");
  for (const id of IDS) { assert.equal(gearHeroClass(id), "mage", id); assert.equal(gearLevel(id), 10, id); assert.equal(gearSetName(id), "Brisa", id); }
  assert.deepEqual(gearBonus(BREEZE_ALL as never), { mana: 2, regen: 2, damage: 1 }, "mana +2% (chapéu), recarga +2% (colar), dano +1% (anel)");
  assert.deepEqual(gearBonus({ head: "breeze-hat" }), { mana: 2, regen: 0, damage: 0 }); assert.deepEqual(gearBonus({ neck: "breeze-necklace" }), { mana: 0, regen: 2, damage: 0 }); assert.deepEqual(gearBonus({ ring: "breeze-ring" }), { mana: 0, regen: 0, damage: 1 });
  assert.equal(IDS.filter(id => "bonus" in GEAR[id]).length, 3, "só chapéu, colar e anel dão bônus; o livro da Brisa não dá dano (0+1 na lista)");
  assert.equal(gearIdsFor("mage").length, 14, "Aprendiz e Brisa"); assert.equal(gearIdsFor("knight").length, 9, "o Cavaleiro não ganhou nada");
  const doc = read("docs/MAGO_ROUPAS.md"); for (const id of IDS) assert.ok(doc.includes(GEAR[id].name), "o documento lista " + GEAR[id].name);
});

test("nível mínimo: o kit e o Aprendiz valem desde o nível 1; a peça só se veste a partir do nível dela, e tirar é sempre livre", () => {
  assert.equal(gearLevel("trail-helm"), 1); assert.equal(gearLevel("apprentice-hat"), 1); assert.equal(gearSetName("trail-helm"), "inicial"); assert.equal(gearSetName("brass-ring"), "Aprendiz");
  assert.equal(gearUnlocked("breeze-hat", 9), false); assert.equal(gearUnlocked("breeze-hat", 10), true); assert.equal(gearUnlocked("breeze-hat", 11), true);
  for (const bad of [Number.NaN, 9.99, -1, Infinity]) assert.equal(gearUnlocked("breeze-hat", bad), false, "nível inválido não libera: " + bad);
  const mage = new Inventory(undefined, 9, "mage");
  assert.equal(mage.equipGear("head", "breeze-hat", 9), "gear-level-too-low"); assert.deepEqual(mage.gear, MAGE_STARTING_GEAR, "recusar não muda nada");
  assert.equal(mage.equipGear("head", "breeze-hat", 10), "gear-equipped"); assert.equal(mage.gear.head, "breeze-hat");
  assert.equal(mage.equipGear("head", null, 1), "gear-removed", "tirar não pede nível"); assert.equal(mage.equipGear("head", "apprentice-hat", 1), "gear-equipped", "voltar ao Aprendiz vale no nível 1");
  assert.equal(mage.equipGear("feet", "breeze-hat", 99), "wrong-slot", "o espaço vem antes do nível"); assert.equal(new Inventory(undefined, 99, "knight").equipGear("head", "breeze-hat", 99), "gear-wrong-class", "a vocação vem antes do nível");
  assert.equal(new Inventory(undefined, 1, "knight").equipGear("head", "trail-helm", 1), "gear-equipped", "o Cavaleiro veste o kit no nível 1");
});

test("um save com peça de nível alto demais não a veste (e fica o resto); no nível dela, a peça vale", () => {
  const save = { gear: { head: "breeze-hat", chest: "apprentice-robe", neck: "breeze-necklace" } };
  assert.deepEqual(new Inventory(save, 9, "mage").gear, { chest: "apprentice-robe" });
  assert.deepEqual(new Inventory(save, 10, "mage").gear, save.gear);
  assert.deepEqual(new Inventory({ gear: { head: "breeze-hat" } }, 9, "mage").gear, {}, "tudo recusado: sem peças, e não volta a nascer vestido");
  assert.equal("gear" in new Inventory({ gear: { head: "breeze-hat" } }, 9, "mage").snapshot(), true);
  const sim = mageAt(5, { head: "breeze-hat", chest: "breeze-robe", legs: "apprentice-trousers" }); assert.deepEqual(sim.inventory.gear, { legs: "apprentice-trousers" }, "o mundo carregado confere o nível");
  assert.deepEqual(mageAt(10, { head: "breeze-hat" }).inventory.gear, { head: "breeze-hat" });
});

test("a ação de vestir confere o nível do herói: abaixo do 10 recusa com a mensagem; no 10 veste e os bônus valem de verdade", () => {
  const low = mageAt(9);
  assert.deepEqual(equipGear(context(low), "head", "breeze-hat"), { message: INVENTORY_FEEDBACK["gear-level-too-low"], changed: false });
  assert.deepEqual(low.inventory.gear, MAGE_STARTING_GEAR); assert.match(INVENTORY_FEEDBACK["gear-level-too-low"], /nível/);
  const sim = mageAt(10), base = sim.maxMana; assert.equal(base, MAGE.maxMana(10));
  for (const [i, id] of IDS.entries()) assert.equal(equipGear(context(sim), SLOTS[i]!, id as GearId).changed, true, id);
  assert.deepEqual(sim.inventory.gear, BREEZE_ALL); assert.equal(sim.inventory.defense, 2, "a defesa soma as peças vestidas");
  assert.deepEqual(sim.gearBonus, { mana: 2, regen: 2, damage: 1 }); assert.equal(sim.maxMana, scaledMaxMana(base, sim.gearBonus)); assert.equal(sim.maxMana, Math.round(base * 1.02));
  const mixed = mageAt(10, { head: "breeze-hat", chest: "apprentice-robe" }); assert.deepEqual(mixed.gearBonus, { mana: 2, regen: 0, damage: 0 }, "misturar conjuntos é livre");
  assert.equal(mixed.inventory.defense, 1);
});

test("cada conjunto tem a sua ficha de aparência, e toda peça do Mago tem uma", () => {
  assert.deepEqual(MAGE_SETS.map(set => set.theme.id), ["apprentice", "breeze"]);
  for (const id of gearIdsFor("mage")) { const theme = themeOfPiece(id); assert.ok(theme, id + " tem ficha de cor"); }
  for (const id of IDS) assert.strictEqual(themeOfPiece(id), BREEZE_THEME, id);
  assert.strictEqual(themeOfPiece("apprentice-hat"), APPRENTICE_THEME);
  for (const id of ["trail-helm", "willow-shield", "inexistente", undefined]) assert.equal(themeOfPiece(id), null, String(id));
  const unique = new Set(MAGE_SETS.flatMap(set => set.pieces)); assert.equal(unique.size, 14, "nenhuma peça em dois conjuntos");
  assert.notEqual(BREEZE_THEME.motif, APPRENTICE_THEME.motif, "cada conjunto tem o seu enfeite");
  for (const key of ["tunic", "cloak", "hat"] as const) assert.notDeepEqual(BREEZE_THEME[key], APPRENTICE_THEME[key], key + " muda de cor");
});

test("mageWear: cada peça vestida traz a ficha do conjunto dela, e peças de conjuntos diferentes se misturam", () => {
  const brisa = mageWear(BREEZE_ALL as never);
  assert.deepEqual([brisa.legwear.pants, brisa.legwear.boots, brisa.legwear.bootsLight], [BREEZE_THEME.pants, BREEZE_THEME.boots, BREEZE_THEME.bootsLight]);
  assert.deepEqual([brisa.book, brisa.ring, brisa.pendant], [BREEZE_THEME, BREEZE_THEME, BREEZE_THEME]);
  assert.deepEqual({ ...brisa.look.tunic }, { ...BREEZE_THEME.tunic }); assert.equal(brisa.look.cuff, BREEZE_THEME.cuff); assert.equal(brisa.look.sleeve, BREEZE_THEME.tunic.mid);
  const mix = mageWear({ head: "breeze-hat", chest: "apprentice-robe", legs: "breeze-trousers", feet: "apprentice-boots", shield: "breeze-tome", ring: "brass-ring", neck: "breeze-necklace" });
  assert.deepEqual([mix.legwear.pants, mix.legwear.boots], [BREEZE_THEME.pants, APPRENTICE_THEME.boots]); assert.deepEqual([mix.book, mix.ring, mix.pendant], [BREEZE_THEME, APPRENTICE_THEME, BREEZE_THEME]);
  assert.deepEqual({ ...mix.look.tunic }, { ...APPRENTICE_THEME.tunic }, "a túnica manda nas cores do corpo");
  assert.strictEqual(mageWear(BREEZE_ALL as never).look, brisa.look, "a aparência é reaproveitada entre quadros");
  assert.strictEqual(mageWear({ head: "breeze-hat", chest: "apprentice-robe" }).look, mageWear({ head: "breeze-hat", chest: "apprentice-robe", ring: "brass-ring" }).look);
  assert.notStrictEqual(mageWear({ head: "breeze-hat", chest: "apprentice-robe" }).look, mageWear({ head: "apprentice-hat", chest: "apprentice-robe" }).look, "o chapéu da Brisa e o do Aprendiz são aparências diferentes");
  assert.notStrictEqual(mageWear({ head: "breeze-hat" }).look, mageWear({ chest: "breeze-robe" }).look, "chapéu sozinho e túnica sozinha não se confundem");
});

test("no desenho do Mago, a Brisa aparece com as cores dela e o Aprendiz deixa de aparecer; misturar mostra as duas", () => {
  const visual = (gear: Record<string, string>) => (c: CanvasRenderingContext2D) => renderHero(c, { faceX: 0, faceY: 1, walkTime: 0.3, attackTime: 0, vx: 0, vy: 0, id: "m", heroClass: "mage", equippedStaff: "apprentice", gear } as never, 3, 4, 1.2);
  const has = (gear: Record<string, string>, hex: string): boolean => spy(visual(gear)).raw.some(c => c.toLowerCase() === hex.toLowerCase());
  const BREEZE_ONLY = [["chapéu", BREEZE_THEME.hat.mid], ["brilho do chapéu", BREEZE_THEME.hatSheen], ["túnica", BREEZE_THEME.tunic.mid], ["manto", BREEZE_THEME.cloak.mid], ["calça", BREEZE_THEME.pants], ["botas", BREEZE_THEME.boots], ["borda das botas", BREEZE_THEME.bootsLight],
    ["páginas do livro", BREEZE_THEME.book.page], ["fita do livro", BREEZE_THEME.book.ribbon], ["gema do anel", BREEZE_THEME.ring.gem.mid], ["aro do anel", BREEZE_THEME.ring.band.mid], ["engaste do anel", BREEZE_THEME.ring.bezel], ["brilho do aro", BREEZE_THEME.ring.shine], ["cristal do colar", BREEZE_THEME.pendant.stone.mid]] as const;
  const APPRENTICE_ONLY = [["brilho do chapéu", APPRENTICE_THEME.hatSheen], ["calça", APPRENTICE_THEME.pants], ["botas", APPRENTICE_THEME.boots], ["páginas do livro", APPRENTICE_THEME.book.page], ["fita do livro", APPRENTICE_THEME.book.ribbon],
    ["gema do anel", APPRENTICE_THEME.ring.gem.mid], ["aro do anel", APPRENTICE_THEME.ring.band.mid], ["engaste do anel", APPRENTICE_THEME.ring.bezel], ["cristal do colar", APPRENTICE_THEME.pendant.stone.mid], ["manto", APPRENTICE_THEME.cloak.mid]] as const;
  for (const [what, hex] of BREEZE_ONLY) { assert.equal(has(BREEZE_ALL, hex), true, "Brisa: " + what); assert.equal(has(MAGE_STARTING_GEAR as Record<string, string>, hex), false, "o Aprendiz não tem a cor da Brisa: " + what); }
  for (const [what, hex] of APPRENTICE_ONLY) { assert.equal(has(MAGE_STARTING_GEAR as Record<string, string>, hex), true, "Aprendiz: " + what); assert.equal(has(BREEZE_ALL, hex), false, "a Brisa não mostra a cor do Aprendiz: " + what); }
  const mix = { ...BREEZE_ALL, chest: "apprentice-robe", feet: "apprentice-boots" };
  assert.equal(has(mix, BREEZE_THEME.hat.mid), true); assert.equal(has(mix, APPRENTICE_THEME.cloak.mid), true); assert.equal(has(mix, BREEZE_THEME.cloak.mid), false, "o manto vem da túnica vestida");
  assert.equal(has(mix, APPRENTICE_THEME.boots), true); assert.equal(has(mix, BREEZE_THEME.boots), false); assert.equal(has(mix, BREEZE_THEME.pants), true);
  const back = (gear: Record<string, string>) => (c: CanvasRenderingContext2D) => renderHero(c, { faceX: 0, faceY: -1, walkTime: 0.3, attackTime: 0, vx: 0, vy: 0, id: "m", heroClass: "mage", equippedStaff: "apprentice", gear } as never, 3, 4, 1.2);
  const hasBack = (gear: Record<string, string>, hex: string): boolean => spy(back(gear)).raw.some(c => c.toLowerCase() === hex.toLowerCase());
  for (const [what, hex] of [["chapéu", BREEZE_THEME.hat.mid], ["manto", BREEZE_THEME.cloak.mid], ["gema do anel", BREEZE_THEME.ring.gem.mid], ["aro do anel", BREEZE_THEME.ring.band.mid]] as const) assert.equal(hasBack(BREEZE_ALL, hex), true, "de costas, Brisa: " + what);
  for (const [what, hex] of [["gema do anel", APPRENTICE_THEME.ring.gem.mid], ["aro do anel", APPRENTICE_THEME.ring.band.mid]] as const) assert.equal(hasBack(BREEZE_ALL, hex), false, "de costas, a Brisa não mostra o Aprendiz: " + what);
  const sigs = new Set([signature(visual(BREEZE_ALL)), signature(visual(MAGE_STARTING_GEAR as Record<string, string>)), signature(visual(mix))]); assert.equal(sigs.size, 3, "três aparências diferentes");
  for (const slot of SLOTS) { const without = { ...BREEZE_ALL }; delete without[slot]; assert.notEqual(signature(visual(without)), signature(visual(BREEZE_ALL)), "tirar a peça da Brisa muda o desenho: " + slot); }
});

test("cada painter lê todas as cores do conjunto (nenhuma cor do Aprendiz sobra na Brisa) e as penas têm o tamanho certo", () => {
  const ctx = { tone: (c: string) => c, wf: 1, side: 1, back: false, faceX: 0, faceY: 1, mvx: 0, mvy: 1, headX: 0, headY: -30, tailSway: 0, trailX: 0, trailY: 0, walkTime: 0.4, moving: 1, liftA: 0, liftB: 0 } as never;
  const colors = (draw: (c: CanvasRenderingContext2D) => void): Set<string> => new Set(spy(draw).raw.map(c => c.toLowerCase()));
  const T = BREEZE_THEME, A = APPRENTICE_THEME;
  const cases: [string, Set<string>, string[], string[]][] = [
    ["chapéu", colors(c => drawWizardHat(c, ctx, T)), [T.hat.light, T.hat.mid, T.hat.dark, T.hatSheen, T.trim, T.trimD, T.gem], [A.hat.mid, A.hatSheen, A.trim, A.trimD, A.gem]],
    ["túnica", colors(c => drawMageRobe(c, ctx, T)), [T.tunic.light, T.tunic.mid, T.tunic.dark, T.lining, T.trim, T.trimD, T.gem], [A.tunic.mid, A.lining, A.trim, A.trimD, A.gem]],
    ["manto", colors(c => drawMageCloak(c, { ...(ctx as object), back: true } as never, T)), [T.cloak.light, T.cloak.mid, T.cloak.dark, T.lining, T.trim, T.gem], [A.cloak.mid, A.lining, A.trim, A.gem]],
    ["tronco", colors(c => drawMageTorso(c, ctx, T)), [T.tunic.dark, T.cloak.light, T.cloak.mid, T.cloak.dark, T.lining, T.trim, T.gem], [A.tunic.dark, A.cloak.mid, A.lining, A.trim, A.gem]],
    ["livro", colors(c => drawMageBook(c, 0, 0, 1, 0.5, t => t, T)), [T.book.cover.light, T.book.cover.mid, T.book.cover.dark, T.book.page, T.book.ribbon, T.trim, T.gem], [A.book.cover.mid, A.book.page, A.book.ribbon, A.trim, A.gem]],
    ["anel", colors(c => drawMageRing(c, 0, 0, t => t, T)), [T.ring.band.dark, T.ring.band.mid, T.ring.shine, T.ring.bezel, T.ring.gem.light, T.ring.gem.mid, T.ring.gem.dark], [A.ring.band.dark, A.ring.band.mid, A.ring.shine, A.ring.bezel, A.ring.gem.light, A.ring.gem.mid, A.ring.gem.dark]],
    ["colar", colors(c => drawMagePendant(c, 1, false, t => t, T)), [T.pendant.stone.light, T.pendant.stone.mid, T.pendant.stone.dark, T.trim], [A.pendant.stone.mid, A.trim]],
  ];
  for (const [what, got, want, unwanted] of cases) {
    for (const hex of want) assert.equal(got.has(hex.toLowerCase()), true, `${what}: usa ${hex}`);
    for (const hex of unwanted) assert.equal(got.has(hex.toLowerCase()), false, `${what}: não sobra ${hex} do Aprendiz`);
  }
  // as penas: duas, com a ponta a 21,5 e a 18 px acima do centro da cabeça (a faixa do chapéu fica a 8 px)
  const tips = spy(c => drawWizardHat(c, ctx, T)).args.quadraticCurveTo!.map(a => Math.round(a[3]! * 10) / 10);
  for (const tipY of [-30 - 7.4 - 0.6 - 13.5, -30 - 7.4 - 0.6 - 10]) assert.ok(tips.includes(Math.round(tipY * 10) / 10), `pena com a ponta em y=${tipY}`);
});

test("o enfeite do conjunto muda o desenho de cada peça bordada: penas no chapéu, redemoinhos na túnica e no manto, selo no livro", () => {
  const star: MageSetTheme = { ...BREEZE_THEME, motif: "star" }, wind: MageSetTheme = { ...APPRENTICE_THEME, motif: "wind" };
  const ctx = { tone: (c: string) => c, wf: 1, side: 1, back: false, faceX: 0, faceY: 1, mvx: 0, mvy: 1, headX: 0, headY: -30, tailSway: 0, trailX: 0, trailY: 0, walkTime: 0.4, moving: 1, liftA: 0, liftB: 0 } as never;
  const sig = (draw: (c: CanvasRenderingContext2D) => void): string => signature(draw);
  assert.notEqual(sig(c => drawWizardHat(c, ctx, BREEZE_THEME)), sig(c => drawWizardHat(c, ctx, star)), "chapéu: penas ou estrela");
  assert.notEqual(sig(c => drawWizardHat(c, ctx, wind)), sig(c => drawWizardHat(c, ctx)), "o enfeite vale também com as cores do Aprendiz");
  assert.notEqual(sig(c => drawMageRobe(c, ctx, BREEZE_THEME)), sig(c => drawMageRobe(c, ctx, star)), "túnica: redemoinho ou estrela");
  assert.notEqual(sig(c => drawMageCloak(c, ctx, BREEZE_THEME)), sig(c => drawMageCloak(c, ctx, star)), "manto: redemoinho ou estrela");
  assert.notEqual(sig(c => drawMageBook(c, 0, 0, 1, 0.5, t => t, BREEZE_THEME)), sig(c => drawMageBook(c, 0, 0, 1, 0.5, t => t, star)), "livro: redemoinho ou estrela");
  const hatBack = spy(c => drawWizardHat(c, { ...(ctx as object), back: true } as never, BREEZE_THEME)), hatFront = spy(c => drawWizardHat(c, ctx, BREEZE_THEME));
  assert.ok((hatFront.calls.quadraticCurveTo ?? 0) > (hatBack.calls.quadraticCurveTo ?? 0), "as penas só aparecem de frente");
  assert.equal(sig(c => drawWizardHat(c, ctx)), sig(c => drawWizardHat(c, ctx, APPRENTICE_THEME)), "sem ficha, o chapéu é o do Aprendiz");
});

test("os ícones: cada parte pintável tem regra de cor, o Brisa tinge o ícone com as cores dela e o Aprendiz e o Cavaleiro ficam como estão", () => {
  const icons = read("src/app/item-icon.component.ts");
  for (const [part, prop, variable] of MAGE_ICON_PARTS) assert.ok(icons.includes(`':host([data-set]) [data-${prop}="${part}"] { ${prop}: var(${variable}); }'`), `regra de ${prop} ${part}`);
  assert.equal(mageSetTheme(APPRENTICE_THEME), undefined, "o Aprendiz fica como o desenho"); assert.equal(mageSetTheme(null), undefined); assert.equal(mageSetTheme(undefined), undefined); assert.strictEqual(mageSetTheme(BREEZE_THEME), BREEZE_THEME);
  assert.equal(mageIconTint(undefined, "mage-hat"), "");
  const tint = (icon: Parameters<typeof mageIconTint>[1]) => Object.fromEntries(mageIconTint(BREEZE_THEME, icon).split("; ").map(item => item.split(": ") as [string, string]));
  assert.equal(tint("mage-hat")["--mi-main"], BREEZE_THEME.hat.mid); assert.equal(tint("mage-hat")["--mi-light"], BREEZE_THEME.hat.light);
  assert.equal(tint("mage-robe")["--mi-main"], BREEZE_THEME.tunic.mid); assert.equal(tint("mage-trousers")["--mi-main"], BREEZE_THEME.pants);
  assert.equal(tint("mage-boots")["--mi-main"], BREEZE_THEME.boots); assert.equal(tint("mage-boots")["--mi-light"], BREEZE_THEME.bootsLight);
  assert.equal(tint("mage-book")["--mi-main"], BREEZE_THEME.book.cover.mid); assert.equal(tint("mage-book")["--mi-page"], BREEZE_THEME.book.page);
  assert.equal(tint("ring")["--mi-gem"], BREEZE_THEME.ring.gem.mid); assert.equal(tint("pendant")["--mi-gem"], BREEZE_THEME.pendant.stone.mid);
  for (const icon of ["mage-hat", "mage-robe", "mage-trousers", "mage-boots", "mage-book", "ring", "pendant"] as const)
    for (const variable of ["--mi-main", "--mi-dark", "--mi-light", "--mi-trim", "--mi-trim-dark", "--mi-gem", "--mi-gem-light", "--mi-page"]) assert.ok(tint(icon)[variable], `${icon} define ${variable}`);
  // as partes pintáveis estão marcadas nos ícones do Mago
  for (const id of ["mage-hat", "mage-robe", "mage-trousers", "mage-boots", "mage-book"]) {
    const block = icons.slice(icons.indexOf(`@case ('${id}')`), icons.indexOf("@case (", icons.indexOf(`@case ('${id}')`) + 10));
    assert.ok(/data-fill="main"/.test(block), id + " tem a cor principal marcada"); assert.ok(/data-(fill|stroke)="(trim|light|dark)"/.test(block), id + " tem detalhe marcado");
  }
  assert.match(icons, /\[attr\.data-set\]': 'theme\(\)\?\.id \?\? null'/, "só tinge quando há ficha"); assert.match(icons, /@if \(motif\(\) === 'wind'\)/);
});

test("a tela: a mochila só lista peças liberadas, o espaço mostra as bloqueadas com o nível e os ícones levam o conjunto", () => {
  const service = read("src/app/hud.service.ts"), page = read("src/app/game-page.html");
  assert.match(service, /if \(gear\[item\.slot\] === id \|\| !gearUnlocked\(id, this\.progression\(\)\?\.level \?\? 1\)\) continue;/, "peça bloqueada não aparece na mochila");
  assert.match(service, /iconSet: themeOfPiece\(id\)/); assert.match(service, /slotIconSet\(slot: EquipmentSlot\)/);
  assert.match(service, /gearLocked\(id: GearId\): boolean \{ return !gearUnlocked\(id, this\.progression\(\)\?\.level \?\? 1\); \}/);
  assert.match(page, /@if \(hud\.gearLocked\(id\)\) \{\s*<p class="dialog-note" \[attr\.data-gear-locked\]="id">Bloqueada: exige o nível \{\{ hud\.gearLevelOf\(id\) \}\}\.<\/p>/);
  assert.equal((page.match(/\[set\]="/g) ?? []).length, 3, "o espaço, a célula da mochila e o detalhe tingem o ícone");
  assert.match(read("src/game/actions/shopActions.ts"), /sim\.inventory\.equipGear\(slot, item, experienceProgress\(sim\.experience\)\.level\)/);
});

test("o registro de arte conhece as peças da Brisa", () => {
  const assets = read("tests/helpers/artAssets.ts");
  for (const name of ["Chapéu de Penas (Brisa)", "manto da Brisa", "barra da Túnica da Brisa", "tronco da Túnica da Brisa", "Compêndio das Brisas", "Anel do Sopro", "Colar de Pena e Vidro"]) assert.ok(assets.includes(`"mago: ${name}"`), name);
});
