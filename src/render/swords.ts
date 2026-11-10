import { WEAPONS, type WeaponId } from "../engine/character/Weapons.ts";
import { paintSword, paintSwordTrail, type SwordArtwork, type Tone } from "./swords/shared.ts";
import { STARTER_ARTWORK } from "./swords/starter.ts";
import { FORGE_ARTWORK } from "./swords/forge.ts";
import { BRONZE_ARTWORK } from "./swords/bronze.ts";
import { COPPER_ARTWORK } from "./swords/copper.ts";
import { DUNES_ARTWORK } from "./swords/dunes.ts";
import { BOREAL_ARTWORK } from "./swords/boreal.ts";
import { OBSIDIAN_ARTWORK } from "./swords/obsidian.ts";
import { MARSH_ARTWORK } from "./swords/marsh.ts";
import { TEMPEST_ARTWORK } from "./swords/tempest.ts";
import { ASTRAL_ARTWORK } from "./swords/astral.ts";

const ARTWORK: Readonly<Record<WeaponId,SwordArtwork>> = {
  starter: STARTER_ARTWORK,
  forge: FORGE_ARTWORK,
  bronze: BRONZE_ARTWORK,
  copper: COPPER_ARTWORK,
  dunes: DUNES_ARTWORK,
  boreal: BOREAL_ARTWORK,
  obsidian: OBSIDIAN_ARTWORK,
  marsh: MARSH_ARTWORK,
  tempest: TEMPEST_ARTWORK,
  astral: ASTRAL_ARTWORK,
};
export function drawKnightSword(ctx:CanvasRenderingContext2D,weapon:WeaponId,
  impact=0,tone:Tone=(c)=>c,time=0):void {
  const s=WEAPONS[weapon].visual;
  paintSword(ctx,s,ARTWORK[weapon],impact,tone,time);
}
export function drawKnightTrail(ctx:CanvasRenderingContext2D,weapon:WeaponId,
  facing:number,angles:readonly number[],alpha:number):void {
  paintSwordTrail(ctx,WEAPONS[weapon],ARTWORK[weapon],facing,angles,alpha);
}
