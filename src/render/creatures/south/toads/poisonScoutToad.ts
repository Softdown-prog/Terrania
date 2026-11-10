/** Anatomia e movimentos próprios da espécie: não é uma ficha de atributos. */
import type { Ramp } from "../../shared/wave2Geometry.ts";
import { mass, eye, joint, GLINT } from "../../shared/wave2Geometry.ts";
import { ellipse, rgba } from "../../../draw.ts";

export const toad = (ctx:CanvasRenderingContext2D,c:Ramp,t:number):void => {
  for(const s of [-1,1]){
    joint(ctx,[[s*14,-16],[s*24,-7],[s*27,0]],c,10);
    joint(ctx,[[s*18,-21],[s*29,-17],[s*32,-8]],c,5);
    mass(ctx,s*25,-5,9,5,c);
  }
  mass(ctx,0,-21,27,22,c);
  mass(ctx,0,-12,18,9,{...c,base:c.light,light:GLINT,dark:c.base});
  for(const s of [-1,1])mass(ctx,s*17,-35,9,8,c);
  eye(ctx,-16,-37,c,3.4);eye(ctx,16,-37,c,3.4);
  ctx.strokeStyle=c.dark;ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(-13,-16);ctx.quadraticCurveTo(0,-11,14,-17);ctx.stroke();
  for(let i=0;i<15;i++){
    const x=Math.sin(i*7.3)*22,y=-21+Math.cos(i*12)*14;
    ellipse(ctx,x,y,2.4+(i%3),2.2,i%2?c.accent:c.dark);
    ellipse(ctx,x-.6,y-1,.8,.5,rgba(GLINT,.65));
  }
  ctx.strokeStyle=rgba(c.accent,.75);ctx.lineWidth=1.4;
  ctx.beginPath();ctx.moveTo(-2,-17);ctx.quadraticCurveTo(4+Math.sin(t*3)*3,-9,10,-15);ctx.stroke();
};

/** Paleta e renderizador próprios desta espécie. */
import { renderWave2Frame } from "../../shared/wave2Frame.ts";
import type { RegionalCreatureVisual } from "../../../regionalCreatures.ts";
const CREATURE_PALETTE: Ramp = {"base":"#779655","dark":"#44476c","light":"#c5c88a","accent":"#a45ac7","eyes":"#f6db74"};
export function renderPoisonScoutToadCreature(ctx:CanvasRenderingContext2D,actor:RegionalCreatureVisual,
  sx:number,sy:number,time=0):void {
  renderWave2Frame(ctx,actor,sx,sy,time,CREATURE_PALETTE,toad);
}
