/** Silhueta procedural da espécie, separada das fichas de domínio. */
import type { Palette } from "../../shared/southGeometry.ts";
import { body, line, tip, eye, freckles, GLOW } from "../../shared/southGeometry.ts";
import { ellipse, TAU } from "../../../draw.ts";

export const cactus = (ctx:CanvasRenderingContext2D,c:Palette,t:number):void => {
  for(const s of [-1,1]){
    line(ctx,s*11,-13,s*12,-3,c,5);
    line(ctx,s*13,-22,s*23,-30,c,7);
    body(ctx,s*23,-32,6,10,c);
    for(let j=0;j<3;j++)tip(ctx,s*(19+j*4),-39+j%2*4,2.4,7,c.light);
  }
  body(ctx,0,-24,14,22,c);
  body(ctx,0,-43,11,8,c);
  eye(ctx,-5,-40,c,1.9);eye(ctx,5,-40,c,1.9);
  ctx.strokeStyle=c.dark;ctx.lineWidth=1.7;
  for(let i=-1;i<=1;i++){
    ctx.beginPath();ctx.moveTo(i*6,-38);ctx.lineTo(i*6,-9);ctx.stroke();
  }
  for(let i=0;i<11;i++){
    const a=i*2.4,x=Math.sin(a)*13,y=-23+Math.cos(a)*16;
    tip(ctx,x,y,2.1,5,c.light);
  }
  body(ctx,0,-52,5+Math.sin(t*2)*.2,5,{...c,base:c.accent,light:GLOW,dark:c.extra});
  // Layered purple-pink petals around a golden flower center.
  for(let i=0;i<8;i++){
    const a=i*TAU/8+t*.01;
    ellipse(ctx,Math.cos(a)*6,-52+Math.sin(a)*5,3.2,2.2,
      i%2?"#b86bc2":"#f087af",a);
    ellipse(ctx,Math.cos(a)*5,-52+Math.sin(a)*4,1.3,.8,"#ffcf7a",a);
  }
  ellipse(ctx,0,-52,2.3,2.4,"#ffd75a");
  freckles(ctx,c,14,0,-25,8,12);
};

/** Paleta e renderizador próprios desta espécie. */
import { renderWave3Frame } from "../../shared/wave3Frame.ts";
import type { RegionalCreatureVisual } from "../../../regionalCreatures.ts";
const CREATURE_PALETTE: Palette = {"base":"#428f64","light":"#9ddb92","dark":"#24694f","accent":"#df99b4","eye":"#f9e2a3","extra":"#f3d47e"};
export function renderCactusSproutCreature(ctx:CanvasRenderingContext2D,actor:RegionalCreatureVisual,
  sx:number,sy:number,time=0):void {
  renderWave3Frame(ctx,actor,sx,sy,time,CREATURE_PALETTE,cactus);
}
