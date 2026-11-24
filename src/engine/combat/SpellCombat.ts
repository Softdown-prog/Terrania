import { STAVES, type StaffId } from "../character/Staves.ts";
import { TILE_SIZE } from "../../world/terrain.ts";
import type { CollisionMap } from "../../world/collision.ts";
import type { Player } from "../../actors/Player.ts";
import type { Slime } from "../../actors/Slime.ts";
import { canStrike } from "./combat.ts";
import { moveBody } from "../../world/collision.ts";

/**
 * A magia do cajado do Mago (ADR 0069): fonte única para a superfície e para a caverna, como `SwordCombat` é para a espada. O dano usa
 * a mesma defesa do alvo que a espada; o alvo é o escolhido, a até `range` tiles e à vista (parede nenhuma no caminho).
 */
export const spellReach = (staff: StaffId): number => STAVES[staff].range * TILE_SIZE;

/** Dano da magia depois da defesa do alvo (mínimo 1), igual à regra da espada. */
export function spellHitDamage(staff: StaffId, target: Slime): number {
  return Math.max(1, STAVES[staff].damage - target.defense);
}

/**
 * Quem a magia atinge: só o alvo escolhido para esta magia (`targetId` texto), se estiver vivo, ao alcance e sem parede no caminho.
 * Sem alvo escolhido (`undefined` ou `null`) a magia não fere ninguém.
 */
export function spellStrikeTargets<T extends Slime>(staff: StaffId,
  hero: { x: number; y: number; faceX: number; faceY: number },
  mobs: Iterable<T>, world: CollisionMap, targetId?: string | null): T[] {
  if (typeof targetId !== "string") return [];
  for (const mob of mobs)
    if (mob.id === targetId)
      return mob.hp > 0 && canStrike(hero, mob, world, spellReach(staff), -0.1) ? [mob] : [];
  return [];
}

/**
 * O efeito extra do cajado depois de um acerto (ADR 0073): empurrar o alvo, deixá-lo mais lento ou curar o herói com parte do dano. Um
 * alvo que já caiu não é empurrado nem desacelerado; a cura é uma parte do dano **realmente causado** (o que sobrou de vida do alvo, não
 * o excesso do golpe que derrota), vale também nesse golpe, e nunca levanta um herói caído nem passa da vida máxima.
 */
export function applySpellEffect(staff: StaffId, hero: Player, target: Slime, damage: number, world: CollisionMap): void {
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
    case "heal":
      if (hero.hp > 0 && damage > 0) hero.hp = Math.min(hero.maxHp, hero.hp + Math.max(1, Math.round(damage * effect.percent / 100)));
      return;
  }
}

/** Resolve uma magia já decidida: o dano, o efeito do cajado e as criaturas abatidas (quem chama cuida de XP, saque e remoção). */
export function resolveSpellStrike<T extends Slime>(staff: StaffId, hero: Player,
  targets: readonly T[], world: CollisionMap, onDefeated: (mob: T) => void): void {
  for (const mob of targets) {
    if (mob.hp <= 0) continue;
    const damage = spellHitDamage(staff, mob), dealt = Math.min(damage, mob.hp);
    mob.takeHit(hero.x, hero.y, damage);
    applySpellEffect(staff, hero, mob, dealt, world);
    if (mob.hp <= 0) onDefeated(mob);
  }
}
