import { monsterPose } from "../../monsterMotion.ts";
import { CREATURE_CATALOG } from "../../../actors/CreatureCatalog.ts";
import { clamp01, ellipse, hashString, mix, pill, rgba, softShadow, TAU } from "../../draw.ts";
import type { RegionalCreatureVisual } from "../../regionalCreatures.ts";
import type { Palette } from "./southGeometry.ts";
import { GLOW, OUTLINE } from "./southGeometry.ts";
/** Animação e indicador visual compartilhados, sem selecionar anatomias. */
export function renderWave3Frame(ctx:CanvasRenderingContext2D,
 actor:RegionalCreatureVisual,sx:number,sy:number,time:number,c:Palette,
 draw:(ctx:CanvasRenderingContext2D,c:Palette,time:number)=>void,shadowRadius=16):void {
  const seed=hashString(actor.id??actor.kind);
  ctx.save();ctx.translate(sx,sy);
  softShadow(ctx,0,3,shadowRadius,5,.3);
  const pose=monsterPose(actor,time);ctx.translate(pose.sway,pose.lift);ctx.rotate(pose.tilt);ctx.scale(pose.stretchX,pose.stretchY);
  draw(ctx,c,time);
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
