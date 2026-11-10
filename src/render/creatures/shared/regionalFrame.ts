import { monsterPose } from "../../monsterMotion.ts";
import { CREATURE_CATALOG } from "../../../actors/CreatureCatalog.ts";
import { clamp01, ellipse, hashString, mix, pill, rgba, softShadow, TAU } from "../../draw.ts";
import type { RegionalCreatureVisual } from "../../regionalCreatures.ts";
import type { ColorRamp } from "./regionalGeometry.ts";
import { OUTLINE, GLINT } from "./regionalGeometry.ts";
/** Animação e indicador visual compartilhados, sem selecionar anatomias. */
export function renderRegionalFrame(ctx:CanvasRenderingContext2D,
 creature:RegionalCreatureVisual,sx:number,sy:number,time:number,c:ColorRamp,
 draw:(ctx:CanvasRenderingContext2D,c:ColorRamp,time:number)=>void):void {
  const seed=hashString(creature.id ?? creature.kind);
  const max=CREATURE_CATALOG[creature.kind].maxHp;
  const flash=clamp01((creature.hurtTime ?? 0)/.24);
  ctx.save();ctx.translate(sx,sy);
  softShadow(ctx,0,3,25,7,.34);
  const pose=monsterPose(creature,time);
  ctx.translate(pose.sway,pose.lift);
  ctx.rotate(pose.tilt);
  ctx.scale(pose.stretchX,pose.stretchY);
  if(flash>.01)ctx.globalAlpha=1;
  draw(ctx,c,time);  // Micro-reflexos e grãos da matéria completam o volume sem textura externa.
  for(let i=0;i<7;i++){
    const px=Math.sin(i*23.1+seed*17)*14,py=-9-Math.abs(Math.cos(i*11.7+seed))*23;
    ellipse(ctx,px,py,1.1+i%3*.5,.55+i%2*.25,i%2?rgba(c.accent,.6):rgba(c.light,.6));
    ellipse(ctx,px-.4,py-.7,.5,.3,rgba(GLINT,.55));
  }
  if(flash>.02){
    ellipse(ctx,0,-28,26,29,rgba(GLINT,flash*.29));
  }
  if((creature.casting??0)>0){
    ctx.strokeStyle=rgba(c.accent,.38+clamp01(creature.casting??0)*.55);
    ctx.lineWidth=2.2;
    ctx.beginPath();ctx.arc(0,-18,26,0,TAU);ctx.stroke();
  }
  ctx.restore();
  // Barra de vida só aparece quando sofreu dano.
  if(creature.hp<max){
    const value=clamp01(creature.hp/max);
    ctx.save();ctx.translate(sx,sy);
    ctx.fillStyle=rgba(OUTLINE,.85);pill(ctx,-17,-73,34,6);ctx.fill();
    ctx.fillStyle=mix("#d85f45","#a6e08f",value);pill(ctx,-15,-71.7,30*value,3);ctx.fill();
    ctx.fillStyle=rgba(GLINT,.6);ctx.fillRect(-15,-71.7,30*value,1);
    ctx.restore();
  }
}
