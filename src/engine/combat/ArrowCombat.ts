import { BOWS, type BowId } from "../character/Bows.ts";
import { ARROWS, type ArrowId } from "../character/Arrows.ts";
import { TILE_SIZE } from "../../world/terrain.ts";
import type { CollisionMap } from "../../world/collision.ts";
import type { Player } from "../../actors/Player.ts";
import type { Slime } from "../../actors/Slime.ts";
import { canStrike } from "./combat.ts";

/**
 * O tiro do arco do Arqueiro (ADR 0111): fonte única para a superfície e para a caverna, como `SpellCombat` é para o Mago. O dano usa a mesma
 * defesa do alvo que a espada e a magia; o alvo é o escolhido, a até `range` tiles e à vista (parede nenhuma no caminho). A flecha é gasta
 * ao começar o tiro (`Player.startShot`), não ao acertar: quem erra o alvo (ele morreu ou saiu do alcance no preparo) perde a flecha.
 */
export const bowReach = (bow: BowId): number => BOWS[bow].range * TILE_SIZE;

/** O tiro vai atrás do alvo que o jogador escolheu, para onde quer que o herói esteja virado, como a magia (o valor abaixo de -1 desliga o cone do `canStrike`). */
const ANY_DIRECTION = -2;

/** Dano do tiro depois da defesa do alvo (mínimo 1): o dano do arco mais o extra da flecha, aumentado pelo bônus em porcentagem. */
export function arrowHitDamage(bow: BowId, arrow: ArrowId, target: Slime, bonusPercent = 0): number {
  const base = Math.round((BOWS[bow].damage + ARROWS[arrow].bonusDamage) * (1 + bonusPercent / 100));
  return Math.max(1, base - target.defense);
}

/** Quem o tiro atinge: só o alvo escolhido para este tiro (`targetId` texto), se estiver vivo, ao alcance e sem parede no caminho; sem alvo escolhido nada é atingido. */
export function arrowStrikeTarget<T extends Slime>(bow: BowId,
  hero: { x: number; y: number; faceX: number; faceY: number },
  mobs: Iterable<T>, world: CollisionMap, targetId?: string | null): T | null {
  if (typeof targetId !== "string") return null;
  for (const mob of mobs) {
    if (mob.id !== targetId) continue;
    return mob.hp > 0 && canStrike(hero, mob, world, bowReach(bow), ANY_DIRECTION) ? mob : null;
  }
  return null;
}

/** Resolve um tiro já decidido: o dano e a criatura abatida (quem chama cuida de XP, saque e remoção). Devolve o dano causado (0 se não havia alvo). */
export function resolveArrowStrike<T extends Slime>(bow: BowId, arrow: ArrowId, hero: Player,
  target: T | null, onDefeated: (mob: T) => void, damagePercent = 0): number {
  if (!target || target.hp <= 0) return 0;
  const damage = arrowHitDamage(bow, arrow, target, damagePercent), dealt = Math.min(damage, target.hp);
  target.takeHit(hero.x, hero.y, damage);
  if (target.hp <= 0) onDefeated(target);
  return dealt;
}
