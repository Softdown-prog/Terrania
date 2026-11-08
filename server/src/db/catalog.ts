import { GEAR } from '../../../src/engine/Equipment.ts';
import { FOODS } from '../../../src/engine/Food.ts';
import { WEAPONS } from '../../../src/engine/Weapons.ts';
import { MAX_STACK, POTION_HEAL } from '../../../src/engine/Inventory.ts';

/** Existing game data only: no speculative rares, prices or player possessions. */
export function gameCatalog() {
 return [
  {id:'gel',name:'Gel de slime',category:'material',maxStack:MAX_STACK,attributes:{}},
  {id:'potion',name:'Poção de cura',category:'consumable',maxStack:MAX_STACK,attributes:{heal:POTION_HEAL}},
  ...Object.entries(FOODS).map(([id,value])=>({id,name:value.name,category:'food',maxStack:MAX_STACK,attributes:{...value}})),
  ...Object.entries(WEAPONS).map(([id,value])=>({id:'sword-'+id,name:value.name,category:'weapon',maxStack:1,attributes:{...value}})),
  ...Object.entries(GEAR).map(([id,value])=>({id,name:value.name,category:'equipment',maxStack:1,attributes:{...value}})),
 ];
}
