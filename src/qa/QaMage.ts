import { OfflineSimulation } from "../engine/OfflineSimulation.ts";
import { Slime } from "../actors/Slime.ts";
import { Inventory } from "../engine/character/Inventory.ts";
import { experienceForLevel } from "../engine/character/Experience.ts";
import { FOODS, foodMana } from "../engine/character/Food.ts";
import { GEAR, gearIdsFor, gearLevel } from "../engine/character/Equipment.ts";
import { gearBonus, MAX_GEAR_BONUS_PERCENT } from "../engine/character/gearBonus.ts";
import { STAFF_IDS, STAVES } from "../engine/character/Staves.ts";
import { PICKUP_DISTANCE } from "../engine/character/loot.ts";

const STEP = 1 / 60;
const ZERO = { x: 0, y: 0 };
const MAX_FIGHT_TICKS = 900;
/** A regra de mana dos cajados (docs/MAGO_CAJADOS.md): a mana de cada magia é o intervalo × a mana máxima do nível ÷ 10, então uma barra cheia dá 10 ÷ intervalo magias (10 s de fogo contínuo). */
const FULL_BAR_SECONDS = 10;
export type MageCheckStatus = "passed" | "failed";
export interface MageQaFinding {
  readonly id: string;
  readonly category: "spawn" | "combat" | "staves" | "gear" | "food" | "persistence";
  readonly status: MageCheckStatus;
  readonly detail: string;
}
export interface MageQaReport {
  readonly environment: "offline-mage";
  readonly seed: number;
  readonly status: "passed" | "failed";
  readonly staves: number;
  readonly gearPieces: number;
  readonly findings: readonly MageQaFinding[];
  readonly totals: { readonly passed: number; readonly failed: number };
}

/** Um Mago no nível dado, com o cajado em mãos: parte de uma simulação nova de Mago e põe a experiência. */
function mageAtLevel(seed: number, level: number, inventory: Record<string, unknown> = {}): OfflineSimulation {
  const { mana: _mana, inventory: _inventory, ...rest } = new OfflineSimulation(seed, undefined, "mage").snapshot();
  return new OfflineSimulation(seed, { ...rest, experience: experienceForLevel(level), inventory: { gel: 0, potion: 0, questRewardClaimed: false, ...inventory } } as never);
}

/**
 * Laboratório do Mago em memória: confere o que o Mago promete em todo o conteúdo dele: nasce com mana cheia e a vida do Mago; a magia fere, gasta mana e derruba
 * um slime com experiência e saque; **cada um dos onze cajados** gasta a mana pela regra do intervalo (10 ÷ intervalo magias de uma barra cheia) no nível dele; **cada peça de roupa** só se veste no
 * nível dela; os bônus nunca passam do teto; comer devolve mana; o save guarda classe, mana e roupas. Só o motor real, sem navegador nem rede.
 */
export function runMageQa(seed: number = 842136): MageQaReport {
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) throw new RangeError("seed precisa ser um uint32");
  const findings: MageQaFinding[] = [];
  const record = (id: string, category: MageQaFinding["category"], ok: boolean, detail: string): void => { findings.push({ id, category, status: ok ? "passed" : "failed", detail }); };

  // 1. nascimento
  const sim = new OfflineSimulation(seed, undefined, "mage");
  record("spawn", "spawn", sim.heroClass === "mage" && sim.usesMana && sim.maxMana > 0 && sim.mana === sim.maxMana && sim.player.hp === sim.player.maxHp, `mana ${sim.mana}/${sim.maxMana}, vida ${sim.player.hp}/${sim.player.maxHp}`);
  record("spawn-dressed", "spawn", Object.keys(sim.inventory.gear).length === 7 && sim.inventory.defense >= 1, `peças vestidas: ${Object.keys(sim.inventory.gear).length}, defesa ${sim.inventory.defense}`);

  // 2. a magia derruba um slime
  const id = "qa-mage-slime", spawn = { x: sim.player.x + 120, y: sim.player.y };
  if (!sim.collision.canMove(spawn.x, spawn.y)) record("cast-kills-slime", "combat", false, "ponto de treino bloqueado pela colisão");
  else {
    sim.slimes.clear(); sim.slimes.set(id, new Slime(id, spawn.x, spawn.y));
    sim.player.faceX = 1; sim.player.faceY = 0;
    const mana0 = sim.mana, xp0 = sim.experience;
    let ticks = 0;
    while (sim.slimes.has(id) && ticks < MAX_FIGHT_TICKS) { sim.update(STEP, ZERO, sim.player.attackCooldown <= 0, id); ticks++; }
    const killed = !sim.slimes.has(id) && sim.defeated.has(id);
    record("cast-kills-slime", "combat", killed && sim.mana < mana0 + 2.5 * ticks * STEP && sim.experience > xp0, `abatido: ${killed}, ticks ${ticks}, mana gasta, experiência ${sim.experience - xp0}`);
    const drop = sim.drops.get(id), gel0 = sim.inventory.gel;
    if (drop) { sim.player.x = drop.x; sim.player.y = drop.y; sim.update(STEP, ZERO, false); }
    record("loot", "combat", !!drop && Math.hypot(sim.player.x - (drop?.x ?? 1e9), sim.player.y - (drop?.y ?? 1e9)) <= PICKUP_DISTANCE && sim.inventory.gel === gel0 + 1, "o gel caiu e foi recolhido");
  }

  // 3. cada cajado, no nível dele
  for (const staffId of STAFF_IDS) {
    const staff = STAVES[staffId], at = mageAtLevel(seed, Math.max(1, staff.level));
    let casts = 0; at.spendMana(0);
    while (at.spendMana(staff.manaCost) && casts < 1000) casts++;
    const expected = Math.floor(FULL_BAR_SECONDS / staff.interval);
    record("staff-" + staffId, "staves", staff.damage > 0 && staff.interval > 0 && staff.windup > 0 && staff.windup < staff.interval && staff.manaCost > 0 && Math.abs(casts - expected) <= 1,
      `${staff.name}: dano ${staff.damage}, ${casts} magias de uma barra cheia (a regra dá ${expected})`);
  }

  // 4. cada peça de roupa só no nível dela; os bônus têm teto
  const pieces = gearIdsFor("mage");
  for (const piece of pieces) {
    const level = gearLevel(piece), slot = GEAR[piece].slot;
    const refused = level <= 1 || new Inventory({ gear: {} }, level - 1, "mage").equipGear(slot, piece, level - 1) === "gear-level-too-low";
    const accepted = new Inventory({ gear: {} }, level, "mage").equipGear(slot, piece, level) === "gear-equipped";
    record("gear-" + piece, "gear", refused && accepted && new Inventory({ gear: {} }, 1, "knight").equipGear(slot, piece, 99) === "gear-wrong-class", `${GEAR[piece].name}: nível ${level}`);
  }
  const everything = Object.fromEntries(pieces.map(piece => [GEAR[piece].slot, piece]));
  const total = gearBonus(everything as never);
  // os números de cada peça são inteiros de 0 a 100 (nada de fração, negativo ou lixo) e a soma de tudo respeita o teto
  const sane = pieces.filter(piece => { const bonus: { mana?: number; regen?: number; damage?: number } = (GEAR[piece] as { bonus?: { mana?: number; regen?: number; damage?: number } }).bonus ?? {}; return Object.values(bonus).some(value => !Number.isInteger(value) || value < 0 || value > MAX_GEAR_BONUS_PERCENT); });
  record("gear-bonus-cap", "gear", sane.length === 0 && total.mana <= MAX_GEAR_BONUS_PERCENT && total.regen <= MAX_GEAR_BONUS_PERCENT && total.damage <= MAX_GEAR_BONUS_PERCENT,
    `bônus somados: mana ${total.mana}%, recarga ${total.regen}%, dano ${total.damage}%; peças com número fora de 0 a 100: ${sane.length}`);

  // 5. comer devolve mana
  const eater = mageAtLevel(seed, 10, { food: { apple: 1, bread: 1, meat: 1 } });
  eater.spendMana(eater.mana);
  const eaten = eater.eatFood("meat");
  record("food-mana", "food", eaten.outcome === "ate" && eaten.mana === foodMana("meat", eater.maxMana) && eaten.mana === Math.round(eater.maxMana * FOODS.meat.manaPercent / 100), `carne: +${eaten.mana} de ${eater.maxMana}`);

  // 6. o save guarda tudo
  const saved = mageAtLevel(seed, 10, { gear: { head: "breeze-hat" } });
  saved.spendMana(7);
  const restored = new OfflineSimulation(seed, JSON.parse(JSON.stringify(saved.snapshot())));
  record("save-roundtrip", "persistence", restored.heroClass === "mage" && Math.abs(restored.mana - saved.mana) < 0.01 && restored.inventory.gear.head === "breeze-hat" && restored.experience === saved.experience, `classe ${restored.heroClass}, mana ${restored.mana.toFixed(2)}, chapéu ${restored.inventory.gear.head}`);

  const failed = findings.filter(item => item.status === "failed").length;
  return { environment: "offline-mage", seed, status: failed === 0 ? "passed" : "failed", staves: STAFF_IDS.length, gearPieces: pieces.length, findings, totals: { passed: findings.length - failed, failed } };
}
