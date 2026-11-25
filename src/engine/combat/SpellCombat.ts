import { STAVES, type StaffId } from "../character/Staves.ts";
import { TILE_SIZE } from "../../world/terrain.ts";
import type { CollisionMap } from "../../world/collision.ts";
import type { Player } from "../../actors/Player.ts";
import type { Slime } from "../../actors/Slime.ts";
import { canStrike } from "./combat.ts";
import { clearPath, moveBody } from "../../world/collision.ts";

/**
 * A magia do cajado do Mago (ADR 0069): fonte única para a superfície e para a caverna, como `SwordCombat` é para a espada. O dano usa
 * a mesma defesa do alvo que a espada; o alvo é o escolhido, a até `range` tiles e à vista (parede nenhuma no caminho).
 */
export const spellReach = (staff: StaffId): number => STAVES[staff].range * TILE_SIZE;

/** A largura do feixe do Sol Nascente de cada lado da reta, em pixels: quem está mais longe dela que isso não é atravessado. */
export const BEAM_HALF_WIDTH = 16;

/**
 * Dano da magia depois da defesa do alvo (mínimo 1), igual à regra da espada. `link` é o lugar do alvo na magia: 0 é o alvo escolhido; os
 * saltos do raio (1 em diante) levam só a parte do dano do cajado (`percent`%) antes da defesa; o feixe atravessa com o dano inteiro. `bonusPercent` é o bônus
 * das roupas do Mago (ADR 0079): aumenta o dano do cajado antes de tudo (e dos saltos, que são uma parte dele).
 */
export function spellHitDamage(staff: StaffId, target: Slime, link = 0, bonusPercent = 0): number {
  const effect = STAVES[staff].effect, base = Math.round(STAVES[staff].damage * (1 + bonusPercent / 100));
  const raw = effect?.kind === "chain" && link > 0 ? Math.round(base * effect.percent / 100) : base;
  return Math.max(1, raw - target.defense);
}

/** O vizinho vivo mais perto de `from` (até `radius` pixels, sem parede no meio) que ainda não foi atingido; empate decidido pelo id. */
function nearestNeighbor<T extends Slime>(from: { x: number; y: number }, pool: readonly T[], hit: readonly T[], radius: number, world: CollisionMap): T | null {
  let best: T | null = null, bestDistance = Infinity;
  for (const mob of pool) {
    if (mob.hp <= 0 || hit.includes(mob)) continue;
    const distance = Math.hypot(mob.x - from.x, mob.y - from.y);
    if (distance > radius || !clearPath(from, mob, world)) continue;
    if (distance < bestDistance || (distance === bestDistance && best !== null && mob.id < best.id)) { best = mob; bestDistance = distance; }
  }
  return best;
}

/**
 * Quem mais a magia atinge depois do alvo escolhido (ADR 0076): o feixe atravessa e pega até `extra` monstros atrás dele, na mesma reta
 * (até `BEAM_HALF_WIDTH` de lado, dentro do alcance do herói e sem parede entre eles, do mais perto para o mais longe); o raio salta de vizinho em vizinho,
 * sempre para o mais perto do último atingido; o astral pega os `neighbors` mais perto **do alvo** (todos medidos a partir dele, não um do outro).
 * As outras magias só atingem o alvo.
 */
function extraTargets<T extends Slime>(staff: StaffId, hero: { x: number; y: number }, primary: T, pool: readonly T[], world: CollisionMap): T[] {
  const effect = STAVES[staff].effect;
  if (effect?.kind === "pierce") {
    const dx = primary.x - hero.x, dy = primary.y - hero.y, length = Math.hypot(dx, dy);
    if (length < 0.001) return [];
    const ux = dx / length, uy = dy / length, reach = spellReach(staff), behind: Array<{ mob: T; along: number }> = [];
    for (const mob of pool) {
      if (mob === primary || mob.hp <= 0) continue;
      const rx = mob.x - hero.x, ry = mob.y - hero.y, along = rx * ux + ry * uy, side = Math.abs(rx * uy - ry * ux);
      if (along > length && Math.hypot(rx, ry) < reach && side <= BEAM_HALF_WIDTH && clearPath(primary, mob, world)) behind.push({ mob, along });
    }
    return behind.sort((a, b) => a.along - b.along || (a.mob.id < b.mob.id ? -1 : 1)).slice(0, effect.extra).map(entry => entry.mob);
  }
  if (effect?.kind === "nova") {
    const hit: T[] = [primary];
    for (let count = 0; count < effect.neighbors; count++) {
      const next = nearestNeighbor(primary, pool, hit, effect.radius, world);
      if (!next) break;
      hit.push(next);
    }
    return hit.slice(1);
  }
  if (effect?.kind === "chain") {
    const hit: T[] = [primary];
    for (let jump = 0; jump < effect.jumps; jump++) {
      const next = nearestNeighbor(hit[hit.length - 1]!, pool, hit, effect.radius, world);
      if (!next) break;
      hit.push(next);
    }
    return hit.slice(1);
  }
  return [];
}

/**
 * Quem a magia atinge: o alvo escolhido para esta magia (`targetId` texto), se estiver vivo, ao alcance e sem parede no caminho, e, na ordem,
 * os que o cajado atinge junto com ele (o feixe do Sol Nascente e o raio da Tempestade, ADR 0076). Sem alvo escolhido (`undefined` ou `null`)
 * a magia não fere ninguém.
 */
export function spellStrikeTargets<T extends Slime>(staff: StaffId,
  hero: { x: number; y: number; faceX: number; faceY: number },
  mobs: Iterable<T>, world: CollisionMap, targetId?: string | null): T[] {
  if (typeof targetId !== "string") return [];
  const pool = [...mobs], primary = pool.find(mob => mob.id === targetId);
  if (!primary || primary.hp <= 0 || !canStrike(hero, primary, world, spellReach(staff), -0.1)) return [];
  return [primary, ...extraTargets(staff, hero, primary, pool, world)];
}

/**
 * O efeito extra do cajado depois de um acerto (ADR 0073): empurrar o alvo, deixá-lo mais lento ou curar o herói com parte do dano. Um
 * alvo que já caiu não é empurrado nem desacelerado; a cura é uma parte do dano **realmente causado** (o que sobrou de vida do alvo, não
 * o excesso do golpe que derrota), vale também nesse golpe, e nunca levanta um herói caído nem passa da vida máxima. A sombra da Lua Negra
 * devolve a mesma parte do dano realmente causado em **mana** (pelo `gainMana` de quem chama, que respeita o máximo); o feixe e o raio não têm
 * efeito sobre o alvo, só atingem mais gente (em `spellStrikeTargets`).
 */
export function applySpellEffect(staff: StaffId, hero: Player, target: Slime, damage: number, world: CollisionMap, gainMana?: (amount: number) => void): void {
  const effect = STAVES[staff].effect;
  if (!effect) return;
  switch (effect.kind) {
    case "push": {
      const dx = target.x - hero.x, dy = target.y - hero.y, length = Math.hypot(dx, dy);
      if (target.hp > 0 && length > 0.001) moveBody(target, dx / length * effect.distance, dy / length * effect.distance, world);
      return;
    }
    case "slow":
      target.applySpellSlow(effect.factor, effect.seconds); // o monstro já ignora a lentidão se caiu
      return;
    case "burn":
      target.applySpellBurn(effect.damage, effect.seconds); // o monstro já ignora a queimadura se caiu
      return;
    case "poison":
      target.applySpellPoison(effect.damage, effect.seconds, effect.maxStacks); // o monstro já ignora o veneno se caiu
      return;
    case "pierce": case "chain": case "nova":
      return;
    case "leech":
      if (hero.hp > 0 && damage > 0) gainMana?.(Math.max(1, Math.round(damage * effect.percent / 100)));
      return;
    case "heal":
      if (hero.hp > 0 && damage > 0) hero.hp = Math.min(hero.maxHp, hero.hp + Math.max(1, Math.round(damage * effect.percent / 100)));
      return;
  }
}

/** Resolve uma magia já decidida: o dano, o efeito do cajado e as criaturas abatidas (quem chama cuida de XP, saque e remoção). */
export function resolveSpellStrike<T extends Slime>(staff: StaffId, hero: Player,
  targets: readonly T[], world: CollisionMap, onDefeated: (mob: T) => void, gainMana?: (amount: number) => void, damagePercent = 0): void {
  targets.forEach((mob, link) => {
    if (mob.hp <= 0) return;
    const damage = spellHitDamage(staff, mob, link, damagePercent), dealt = Math.min(damage, mob.hp);
    mob.takeHit(hero.x, hero.y, damage);
    applySpellEffect(staff, hero, mob, dealt, world, gainMana);
    if (mob.hp <= 0) onDefeated(mob);
  });
}
