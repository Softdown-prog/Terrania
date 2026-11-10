import { GEAR } from '../../../src/engine/character/Equipment.ts';
import { FOODS } from '../../../src/engine/character/Food.ts';
import { WEAPONS } from '../../../src/engine/character/Weapons.ts';
import { MAX_STACK, POTION_HEAL } from '../../../src/engine/character/Inventory.ts';
import { SOUTH_RARE_LOOT } from '../../../src/monsters/south/rareLoot.ts';

/** Somente itens reais da aventura. O catálogo não comprova posse nem ativa negociação. */
export function gameCatalog() {
 return [
  {id:'gel',name:'Gel de slime',category:'material',rarity:'common' as const,maxStack:MAX_STACK,attributes:{}},
  {id:'potion',name:'Poção de cura',category:'consumable',rarity:'common' as const,maxStack:MAX_STACK,attributes:{heal:POTION_HEAL}},
  ...Object.entries(FOODS).map(([id,value])=>({id,name:value.name,category:'food',rarity:'common' as const,maxStack:MAX_STACK,attributes:{...value}})),
  ...Object.entries(WEAPONS).map(([id,value])=>({id:'sword-'+id,name:value.name,category:'weapon',rarity:'common' as const,maxStack:1,attributes:{...value}})),
  ...Object.entries(GEAR).map(([id,value])=>({id,name:value.name,category:'equipment',rarity:'common' as const,maxStack:1,attributes:{...value}})),
  ...Object.entries(SOUTH_RARE_LOOT).map(([monster,item])=>({
    id:item.id,name:item.name,category:'collectible',rarity:'rare' as const,
    maxStack:MAX_STACK,attributes:{region:'south',monster,dropChance:item.chance,description:item.description},
  })),
 ];
}
