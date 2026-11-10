/** Anatomia e movimentos próprios da espécie: não é uma ficha de atributos. */
import type { Ramp } from "./geometry.ts";
import { mass, eye, joint, crystal, etched, EDGE } from "./geometry.ts";

export const salamander = (ctx:CanvasRenderingContext2D,c:Ramp,t:number):void => {
  ctx.strokeStyle=EDGE;ctx.lineWidth=15;ctx.lineCap="round";
  ctx.beginPath();ctx.moveTo(15,-17);ctx.bezierCurveTo(39,-8,37,-50,12,-51);ctx.stroke();
  ctx.strokeStyle=c.base;ctx.lineWidth=11;ctx.stroke();
  for(const s of [-1,1])for(const x of [-13,12])
    joint(ctx,[[x,-17],[x+s*7,-6],[x+s*10,0]],c,6);
  mass(ctx,0,-23,28,14,c,-.18);
  mass(ctx,-24,-28,14,9,c);
  for(let i=0;i<9;i++){
    const x=-24+i*5;
    crystal(ctx,x,-32-Math.sin(i*1.3)*2,3.4,9+(i%3)*3,c.dark,c.accent);
    ctx.strokeStyle=c.accent;ctx.lineWidth=1.7;
    ctx.beginPath();ctx.moveTo(x,-17);ctx.lineTo(x+2+Math.sin(i+t)*.5,-25);ctx.stroke();
  }
  eye(ctx,-30,-31,c);eye(ctx,-22,-32,c);etched(ctx,c,13,2,-22,19,9);
};
