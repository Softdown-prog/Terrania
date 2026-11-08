import { WEAPONS, type WeaponId } from "./Weapons.ts";
import { clearPath, moveBody, type CollisionMap } from "../world/collision.ts";
import { hash2 } from "../world/random.ts";
import type { Slime } from "../actors/Slime.ts";
import type { Player } from "../actors/Player.ts";

/** Pure target defense formula shared by outdoor and dungeon sword strikes. */
export function swordHitDamage(weapon: WeaponId, target: Slime): number {
  const definition=WEAPONS[weapon];
  const effectiveArmor=Math.floor(target.defense*(weapon==="astral"?.75:1));
  return Math.max(1,definition.damage-effectiveArmor);
}
const seedFor=(id:string):number=>{
  let seed=2166136261;
  for(let i=0;i<id.length;i++)seed=Math.imul(seed^id.charCodeAt(i),16777619);
  return seed|0;
};
export interface SwordImpact {
  /** Additional creatures damaged by a special attack, never repeated targets. */
  readonly extra: readonly Slime[];
}
/** Adds real elemental statuses and secondary hits only after a successful
 * primary sword contact; callers retain authoritative defeat/loot bookkeeping.
 * Never reads DOM, client timestamps or random global state.
 */
export function applySwordImpact(weapon:WeaponId,hero:Player,target:Slime,
  others:Iterable<Slime>,world:CollisionMap):SwordImpact {
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
