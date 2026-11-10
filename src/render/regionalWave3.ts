import { monsterPose } from "./monsterMotion.ts";
import { rat } from "./creatures/south/rats/duneRat.ts";
import { goblin } from "./creatures/south/goblins/sandGoblin.ts";
import { orc } from "./creatures/south/orcs/desertOrc.ts";
import { troll } from "./creatures/south/trolls/clayTroll.ts";
import { scout } from "./creatures/south/smallfolk/duneScout.ts";
import { elf } from "./creatures/south/elves/oasisElf.ts";
import { imp } from "./creatures/south/demons/mirageImp.ts";
import { viper } from "./creatures/south/snakes/hornedViper.ts";
import { vulture } from "./creatures/south/vultures/carrionVulture.ts";
import { cactus } from "./creatures/south/plants/cactusSprout.ts";
import { renderDuneRatDetail } from "./creatures/south/rats/duneRat.ts";
import { renderSandGoblinDetail } from "./creatures/south/goblins/sandGoblin.ts";
import { renderDesertOrcDetail } from "./creatures/south/orcs/desertOrc.ts";
import { CREATURE_CATALOG, type SouthCommonKind } from "../actors/CreatureCatalog.ts";
import { clamp01, ellipse, hashString, mix, pill, rgba, softShadow, TAU } from "./draw.ts";
import type { Palette } from "./creatures/shared/southGeometry.ts";
import { GLOW, OUTLINE } from "./creatures/shared/southGeometry.ts";
export interface DesertCommonVisual {
  readonly kind:SouthCommonKind;
  readonly hp:number;
  readonly hurtTime?:number;
  readonly casting?:number;
  readonly motionPhase?: number; readonly moving?: number;
  readonly id?:string;
}
const C:Readonly<Record<SouthCommonKind,Palette>>={
  "dune-rat":{base:"#98836b",light:"#ded3ae",dark:"#574c43",accent:"#b87871",eye:"#dfb55c",extra:"#c5aa93"},
  "sand-goblin":{base:"#79935e",light:"#c7d19b",dark:"#4c6844",accent:"#c08b52",eye:"#ffdc6f",extra:"#805e4d"},
  "desert-orc":{base:"#718063",light:"#bec09c",dark:"#36453d",accent:"#b39362",eye:"#f1c76d",extra:"#745243"},
  "clay-troll":{base:"#ac8864",light:"#d7b88e",dark:"#6e5643",accent:"#c79972",eye:"#eac778",extra:"#857c64"},
  "dune-scout":{base:"#aa8e66",light:"#eed9ab",dark:"#605044",accent:"#d9bb80",eye:"#e5cc91",extra:"#87765d"},
  "oasis-elf":{base:"#d5c4a2",light:"#f9edcf",dark:"#776451",accent:"#bd995f",eye:"#d5ebc1",extra:"#94806c"},
  "mirage-imp":{base:"#f4ae51",light:"#fff0a5",dark:"#a85027",accent:"#ffd770",eye:"#fff5b9",extra:"#ee762b"},
  "horned-viper":{base:"#ac915c",light:"#d8c498",dark:"#635d4b",accent:"#c68e54",eye:"#efcc6c",extra:"#8a8f4a"},
  "carrion-vulture":{base:"#54525c",light:"#908c91",dark:"#272933",accent:"#c69b67",eye:"#f0d68b",extra:"#cb8b92"},
  "cactus-sprout":{base:"#428f64",light:"#9ddb92",dark:"#24694f",accent:"#df99b4",eye:"#f9e2a3",extra:"#f3d47e"},
};
/** Source is text-defined anatomy, not a supplied sprite sheet. Every species
 * is a unique layered Canvas drawing; no PNG or texture dependencies.
 */
export function renderWave3Creature(ctx:CanvasRenderingContext2D,
 actor:DesertCommonVisual,sx:number,sy:number,time=0):void{
  const c=C[actor.kind],seed=hashString(actor.id??actor.kind);
  ctx.save();ctx.translate(sx,sy);
  softShadow(ctx,0,3,actor.kind==="clay-troll"||actor.kind==="desert-orc"?24:16,5,.3);
  const pose=monsterPose(actor,time);ctx.translate(pose.sway,pose.lift);ctx.rotate(pose.tilt);ctx.scale(pose.stretchX,pose.stretchY);
  switch(actor.kind){
    case "dune-rat":rat(ctx,c,time);break;
    case "sand-goblin":goblin(ctx,c,time);break;
    case "desert-orc":orc(ctx,c,time);break;
    case "clay-troll":troll(ctx,c,time);break;
    case "dune-scout":scout(ctx,c,time);break;
    case "oasis-elf":elf(ctx,c,time);break;
    case "mirage-imp":imp(ctx,c,time);break;
    case "horned-viper":viper(ctx,c,time);break;
    case "carrion-vulture":vulture(ctx,c,time);break;
    case "cactus-sprout":cactus(ctx,c,time);break;
  }
  // Espécies prioritárias recebem acabamento próprio sem alterar o motor de combate.
  if(actor.kind==="dune-rat")renderDuneRatDetail(ctx,actor,time);
  if(actor.kind==="sand-goblin")renderSandGoblinDetail(ctx,actor,time);
  if(actor.kind==="desert-orc")renderDesertOrcDetail(ctx,actor,time);
  // Stable micro-highlights supply material structure even on the smallest actors.
  for(let i=0;i<13;i++){
    const x=Math.sin(i*9.31+seed*7)*11,y=-12-Math.abs(Math.cos(i*5.71+seed))*19;
    ellipse(ctx,x,y,1+i%3*.25,.55,rgba(i%2?c.accent:c.light,.64));
    ellipse(ctx,x-.4,y-.4,.42,.3,rgba(GLOW,.62));
  }
  if((actor.hurtTime??0)>0)
    ellipse(ctx,0,-24,19,22,rgba(GLOW,clamp01((actor.hurtTime??0)/.3)*.22));
  if((actor.casting??0)>0){
    ctx.strokeStyle=rgba(c.accent,.44+clamp01(actor.casting??0)*.5);
    ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-23,20,0,TAU);ctx.stroke();
  }
  ctx.restore();
  const max=CREATURE_CATALOG[actor.kind].maxHp;
  if(actor.hp<max){
    const f=clamp01(actor.hp/max);
    ctx.save();ctx.translate(sx,sy);
    ctx.fillStyle=rgba(OUTLINE,.87);pill(ctx,-17,-66,34,6);ctx.fill();
    ctx.fillStyle=mix("#cb5e44","#a6e08f",f);pill(ctx,-15,-64.7,30*f,3);ctx.fill();
    ctx.strokeStyle=rgba(GLOW,.7);ctx.lineWidth=.7;ctx.strokeRect(-15,-64.7,30*f,1);
    ctx.restore();
  }
}
