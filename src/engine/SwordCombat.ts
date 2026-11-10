import { WEAPONS, type WeaponId } from "./Weapons.ts";
import { clearPath, moveBody, type CollisionMap } from "../world/collision.ts";
import { hash2 } from "../world/random.ts";
import { ATTACK_REACH, canStrike } from "./combat.ts";
import type { Slime } from "../actors/Slime.ts";
import { RegionalMonster } from "../actors/RegionalMonster.ts";
import type { Player } from "../actors/Player.ts";

/** Pure target defense formula shared by outdoor and dungeon sword strikes. */
export function swordHitDamage(weapon: WeaponId, target: Slime): number {
  const definition=WEAPONS[weapon];
  const effectiveArmor=Math.floor(target.defense*(weapon==="astral"?.75:1));
  return Math.max(1,definition.damage-effectiveArmor);
}
/** Alcance, cone e número de alvos do golpe: única fonte para o solo, a caverna e o alvo clássico. */
export function swordArc(weapon: WeaponId): { readonly reach: number; readonly cone: number; readonly targets: number } {
  return weapon==="astral" ? {reach:72,cone:-.5,targets:3} : {reach:ATTACK_REACH,cone:-.1,targets:1};
}
/** Quem o golpe atinge, do mais próximo ao mais distante.
 * `targetId` indefinido: arco manual legado. `null`: golpe sem alvo, não fere ninguém.
 * Texto: o alvo escolhido precisa estar ao alcance; ele vem primeiro e só a lâmina
 * astral completa o arco com os vizinhos, sem atravessar paredes.
 */
export function swordStrikeTargets<T extends Slime>(weapon: WeaponId,
  hero: { x: number; y: number; faceX: number; faceY: number },
  mobs: Iterable<T>, world: CollisionMap, targetId?: string | null): T[] {
  if(targetId===null)return [];
  const arc=swordArc(weapon);
  const distance=(mob:T):number=>Math.hypot(mob.x-hero.x,mob.y-hero.y);
  const inArc=[...mobs].filter(mob=>mob.hp>0 && canStrike(hero,mob,world,arc.reach,arc.cone))
    .sort((a,b)=>distance(a)-distance(b) || a.id.localeCompare(b.id));
  if(targetId===undefined)return inArc.slice(0,arc.targets);
  const chosen=inArc.find(mob=>mob.id===targetId);
  return chosen ? [chosen,...inArc.filter(mob=>mob!==chosen)].slice(0,arc.targets) : [];
}
const seedFor=(id:string):number=>{
  let seed=2166136261;
  for(let i=0;i<id.length;i++)seed=Math.imul(seed^id.charCodeAt(i),16777619);
  return seed|0;
};
export interface SwordImpact<T extends Slime = Slime> {
  /** Additional creatures damaged by a special attack, never repeated targets. */
  readonly extra: readonly T[];
}
/** Adds real elemental statuses and secondary hits only after a successful
 * primary sword contact; callers retain authoritative defeat/loot bookkeeping.
 * Never reads DOM, client timestamps or random global state.
 */
export function applySwordImpact<T extends Slime>(weapon:WeaponId,hero:Player,target:Slime,
  others:Iterable<T>,world:CollisionMap):SwordImpact<T> {
  const spec=WEAPONS[weapon].special;
  if(!spec)return {extra:[]};
  switch(spec){
    case "push": {
      const dx=target.x-hero.x,dy=target.y-hero.y,len=Math.hypot(dx,dy);
      if(len>.001)moveBody(target,dx/len*12,dy/len*12,world);
      return {extra:[]};
    }
    case "bleed":
      if(hash2(seedFor(target.id),hero.attackSequence,73025)<.15)
        target.applySwordStatus("bleed",3,2);
      return {extra:[]};
    case "ice":
      target.applySwordStatus("ice",2,0);
      return {extra:[]};
    case "fire":
      target.applySwordStatus("fire",4,6);
      return {extra:[]};
    case "poison":
      target.applySwordStatus("poison",5,10);
      return {extra:[]};
    case "lightning": {
      const choices=[...others].filter(m=>m.id!==target.id && m.hp>0 &&
        Math.hypot(m.x-target.x,m.y-target.y)<=52 &&
        clearPath(target,m,world));
      choices.sort((a,b)=>Math.hypot(a.x-target.x,a.y-target.y)-
        Math.hypot(b.x-target.x,b.y-target.y) || a.id.localeCompare(b.id));
      const extra=choices.slice(0,2);
      for(const adjacent of extra)
        adjacent.takeHit(target.x,target.y,
          Math.max(1,Math.round(swordHitDamage(weapon,adjacent)*.3)));
      return {extra};
    }
    case "astral":
      // Larger cone and 25% defense penetration are evaluated by the hit caller
      // and swordHitDamage. Effects here are exclusively graphical.
      return {extra:[]};
  }
}

/**
 * Resolve um golpe já decidido: dano, efeito da lâmina e criaturas abatidas.
 * Fonte única para a superfície e para a caverna; antes cada uma tinha a sua cópia
 * do laço, e foi essa divergência que gerou os erros de defesa e de arco astral.
 *
 * `pool` é o conjunto vivo de criaturas do cenário (o raio pode saltar para vizinhas).
 * `onDefeated` recebe cada criatura abatida: primeiro as atingidas pelo efeito
 * secundário, depois a principal, e quem chama cuida de XP, saque e remoção.
 * Quem escolhe os alvos (`swordStrikeTargets`) e vira o herói continua sendo o chamador.
 */
export function resolveSwordStrike<T extends Slime>(weapon: WeaponId, hero: Player,
  targets: readonly T[], pool: ReadonlyMap<string, T>, world: CollisionMap,
  onDefeated: (mob: T) => void): void {
  for (const mob of targets) {
    if (mob.hp <= 0) continue;
    mob.takeHit(hero.x, hero.y, swordHitDamage(weapon, mob));
    if (mob instanceof RegionalMonster) mob.onSwordHit(hero, weapon);
    for (const struck of applySwordImpact(weapon, hero, mob, pool.values(), world).extra)
      if (struck.hp <= 0) onDefeated(struck);
    if (mob.hp <= 0) onDefeated(mob);
  }
}
