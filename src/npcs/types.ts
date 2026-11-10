/** Identificador e posição dos personagens e objetos de interação. */
export interface Npc {
  readonly id:string;
  readonly kind?: "character" | "sign" | "door";
  readonly name:string;
  readonly role:string;
  readonly x:number;
  readonly y:number;
}
/** Dados de aparência, sem Canvas nem dependências de renderização. */
export interface NpcAppearance {
  readonly robe:string;
  readonly trim:string;
  readonly accent:string;
  readonly skin:string;
  readonly hair:string;
  readonly hairStyle:"long"|"short"|"bald"|"bun";
  readonly prop:"staff"|"scroll"|"hammer"|"lantern"|"dagger"|"scales"|"vial"|"whip";
  readonly species?:"orc"|"goblin"|"troll"|"imp"|"elf";
  readonly width:number;
  readonly beard?:string;
  readonly apron?:string;
}
export interface NpcDialogueState {
  readonly defeated:number;
  readonly goal:number;
  readonly completed:boolean;
  readonly forgeAvailable:boolean;
}
