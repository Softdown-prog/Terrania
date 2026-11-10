import type { SouthCommonKind } from "../actors/CreatureCatalog.ts";
import { renderRegionalCreature } from "./regionalCreatures.ts";
/** Contrato público da fauna comum do Sul; identidade visual em cada espécie. */
export interface DesertCommonVisual {
 readonly kind:SouthCommonKind;
 readonly hp:number;
 readonly id?:string;
 readonly hurtTime?:number;
 readonly casting?:number;
 readonly motionPhase?:number;
 readonly moving?:number;
}
/** Adaptador de compatibilidade para os consumidores existentes. */
export function renderWave3Creature(ctx:CanvasRenderingContext2D,
 actor:DesertCommonVisual,sx:number,sy:number,time=0):void {
 renderRegionalCreature(ctx,actor,sx,sy,time);
}
