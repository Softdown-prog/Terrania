import { monsterPose } from "../../monsterMotion.ts";
import { CREATURE_CATALOG } from "../../../actors/CreatureCatalog.ts";
import { clamp01, ellipse, hashString, mix, pill, rgba, softShadow, TAU } from "../../draw.ts";
import type { RegionalCreatureVisual } from "../../regionalCreatures.ts";
import type { Ramp } from "./wave2Geometry.ts";
import { EDGE, GLINT } from "./wave2Geometry.ts";
/** Animação e indicador visual compartilhados, sem selecionar anatomias. */
export function renderWave2Frame(ctx:CanvasRenderingContext2D,
 actor:RegionalCreatureVisual,sx:number,sy:number,time:number,c:Ramp,
 draw:(ctx:CanvasRenderingContext2D,c:Ramp,time:number)=>void):void {
  const seed=hashString(actor.id??actor.kind);
  ctx.save();ctx.translate(sx,sy);
  softShadow(ctx,0,4,31,8,.38);
  const pose=monsterPose(actor,time);
  ctx.translate(pose.sway,pose.lift);
  ctx.rotate(pose.tilt);
  ctx.scale(pose.stretchX,pose.stretchY);
  draw(ctx,c,time);
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
