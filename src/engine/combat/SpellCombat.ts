import { STAVES, type StaffId } from "../character/Staves.ts";
import { TILE_SIZE } from "../../world/terrain.ts";
import type { CollisionMap } from "../../world/collision.ts";
import type { Player } from "../../actors/Player.ts";
import type { Slime } from "../../actors/Slime.ts";
import { canStrike } from "./combat.ts";

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

/** Resolve uma magia já decidida: o dano e as criaturas abatidas (quem chama cuida de XP, saque e remoção). */
export function resolveSpellStrike<T extends Slime>(staff: StaffId, hero: Player,
  targets: readonly T[], onDefeated: (mob: T) => void): void {
  for (const mob of targets) {
    if (mob.hp <= 0) continue;
    mob.takeHit(hero.x, hero.y, spellHitDamage(staff, mob));
    if (mob.hp <= 0) onDefeated(mob);
  }
}
