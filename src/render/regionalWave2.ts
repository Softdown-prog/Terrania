import type { SecondWaveKind } from "../actors/CreatureCatalog.ts";
import { renderRegionalCreature } from "./regionalCreatures.ts";
/** Contrato público da segunda leva; identidade visual pertence a cada espécie. */
export interface Wave2Visual {
 readonly kind:SecondWaveKind;
 readonly hp:number;
 readonly id?:string;
 readonly hurtTime?:number;
 readonly casting?:number;
 readonly motionPhase?:number;
 readonly moving?:number;
}
/** Adaptador de compatibilidade para os consumidores existentes. */
export function renderWave2Creature(ctx:CanvasRenderingContext2D,
 actor:Wave2Visual,sx:number,sy:number,time=0):void {
 renderRegionalCreature(ctx,actor,sx,sy,time);
}
