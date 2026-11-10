import { monsterPose } from "./monsterMotion.ts";
import { griffin } from "./creatures/west/griffins/summitGriffin.ts";
import { salamander } from "./creatures/west/salamanders/magmaSalamander.ts";
import { ent } from "./creatures/south/ents/rottenMarshEnt.ts";
import { toad } from "./creatures/south/toads/poisonScoutToad.ts";
import { worm } from "./creatures/south/worms/carrionSandworm.ts";
import { mammoth } from "./creatures/north/mammoths/tundraMammoth.ts";
import { banshee } from "./creatures/north/banshees/frostBanshee.ts";
import { bear } from "./creatures/north/bears/runicPolarBear.ts";
import { octopus } from "./creatures/east/octopuses/abyssalOctopus.ts";
import { triton } from "./creatures/east/tritons/tideHunterTriton.ts";
import { CREATURE_CATALOG, type SecondWaveKind } from "../actors/CreatureCatalog.ts";
import { clamp01, ellipse, hashString, mix, pill, rgba, softShadow, TAU } from "./draw.ts";

export interface Wave2Visual {
  readonly kind: SecondWaveKind;
  readonly hp: number;
  readonly id?: string;
  readonly hurtTime?: number;
  readonly casting?: number;
  readonly motionPhase?: number;
  readonly moving?: number;
}
import type { Ramp } from "./creatures/shared/wave2Geometry.ts";
import { EDGE, GLINT } from "./creatures/shared/wave2Geometry.ts";
const PAL: Readonly<Record<SecondWaveKind,Ramp>> = {
  "summit-griffin": { base:"#88909e",dark:"#414957",light:"#d2d6d6",accent:"#d5a24c",eyes:"#ffc866" },
  "magma-salamander": { base:"#5b413a",dark:"#292f38",light:"#a47558",accent:"#ff6a26",eyes:"#ffbd65" },
  "rotten-marsh-ent": { base:"#625d49",dark:"#2e463b",light:"#a29b70",accent:"#61a782",eyes:"#7ff7e1" },
  "poison-scout-toad": { base:"#779655",dark:"#44476c",light:"#c5c88a",accent:"#a45ac7",eyes:"#f6db74" },
  "carrion-sandworm": { base:"#a57959",dark:"#594237",light:"#dbc4a0",accent:"#b39c7f",eyes:"#f9bd68" },
  "tundra-mammoth": { base:"#9e7965",dark:"#584b50",light:"#d0ae87",accent:"#d4e6df",eyes:"#d9d5b6" },
  "frost-banshee": { base:"#4986a2",dark:"#28485f",light:"#c8edf0",accent:"#7fdbff",eyes:"#d9feff" },
  "runic-polar-bear": { base:"#b3d4d9",dark:"#5b90a4",light:"#eefcff",accent:"#53baf0",eyes:"#365670" },
  "abyssal-octopus": { base:"#7a58ae",dark:"#354668",light:"#bb78c9",accent:"#4adbc8",eyes:"#ffe987" },
  "tide-hunter-triton": { base:"#349b93",dark:"#27516f",light:"#8be6c7",accent:"#82bdef",eyes:"#ffe17c" },
};
/** Polished organic volume: upper-left light, three-tone material and dark single outline. */
/** Procedural artwork for the second ten species; origin is the ground contact point. */
export function renderWave2Creature(ctx:CanvasRenderingContext2D,
  actor:Wave2Visual,sx:number,sy:number,time=0):void {
  const c=PAL[actor.kind],seed=hashString(actor.id??actor.kind);
  ctx.save();ctx.translate(sx,sy);
  softShadow(ctx,0,4,31,8,.38);
  const pose=monsterPose(actor,time);
  ctx.translate(pose.sway,pose.lift);
  ctx.rotate(pose.tilt);
  ctx.scale(pose.stretchX,pose.stretchY);
  switch(actor.kind){
    case "summit-griffin":griffin(ctx,c,time);break;
    case "magma-salamander":salamander(ctx,c,time);break;
    case "rotten-marsh-ent":ent(ctx,c,time);break;
    case "poison-scout-toad":toad(ctx,c,time);break;
    case "carrion-sandworm":worm(ctx,c,time);break;
    case "tundra-mammoth":mammoth(ctx,c,time);break;
    case "frost-banshee":banshee(ctx,c,time);break;
    case "runic-polar-bear":bear(ctx,c,time);break;
    case "abyssal-octopus":octopus(ctx,c,time);break;
    case "tide-hunter-triton":triton(ctx,c,time);break;
  }
  // Shared specular accents, deterministic by identity, not Math.random or real time.
  for(let i=0;i<11;i++){
    const x=Math.sin(i*7.77+seed*23)*15,y=-13-Math.abs(Math.cos(i*17+seed*11))*25;
    ellipse(ctx,x,y,1.05+(i%3)*.25,.55,rgba(i%2?c.light:c.accent,.62));
    ellipse(ctx,x-.4,y-.6,.5,.3,rgba(GLINT,.62));
  }
  if((actor.hurtTime??0)>.02)
    ellipse(ctx,0,-31,29,31,rgba(GLINT,clamp01((actor.hurtTime??0)/.25)*.18));
  if((actor.casting??0)>0){
    ctx.strokeStyle=rgba(c.accent,.42+clamp01(actor.casting??0)*.5);ctx.lineWidth=2.1;
    ctx.beginPath();ctx.arc(0,-25,30,0,TAU);ctx.stroke();
  }
  ctx.restore();
  const max=CREATURE_CATALOG[actor.kind].maxHp;
  if(actor.hp<max){
    const fraction=clamp01(actor.hp/max);
    ctx.save();ctx.translate(sx,sy);
    ctx.fillStyle=rgba(EDGE,.88);pill(ctx,-18,-82,36,6);ctx.fill();
    ctx.fillStyle=mix("#d85f45","#a6e08f",fraction);
    pill(ctx,-16,-80.8,32*fraction,3);ctx.fill();
    ctx.fillStyle=rgba(GLINT,.47);ctx.fillRect(-16,-80.8,32*fraction,.9);
    ctx.restore();
  }
}
