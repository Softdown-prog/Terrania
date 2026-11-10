/** Anatomia e movimentos próprios da espécie: não é uma ficha de atributos. */
import type { Ramp } from "./geometry.ts";
import { mass, eye, crystal, etched, EDGE } from "./geometry.ts";
import { ellipse, TAU } from "../../draw.ts";

export const octopus = (ctx:CanvasRenderingContext2D,c:Ramp,t:number):void => {
  for(let i=0;i<8;i++){
    const a=i*TAU/8,phase=Math.sin(t*1.7+i*.82)*2.2;
    const mx=Math.cos(a)*22,my=-7+Math.sin(a)*10;
    const endX=Math.cos(a)*34+phase,endY=my+6+Math.cos(i)*5;
    ctx.strokeStyle=EDGE;ctx.lineWidth=10;ctx.lineCap="round";
    ctx.beginPath();ctx.moveTo(Math.cos(a)*11,-16+Math.sin(a)*5);
    ctx.bezierCurveTo(mx,my,endX-12,endY-10,endX,endY);ctx.stroke();
    ctx.strokeStyle=c.base;ctx.lineWidth=7;ctx.stroke();
    for(let k=1;k<4;k++){
      const u=k/4;
      ellipse(ctx,mx*u+endX*(1-u)*.6,-11+u*8,1.5,1.7,c.accent);
    }
    ellipse(ctx,endX,endY,2.6,2,c.light);
  }
  mass(ctx,0,-29,19,19,c);
  mass(ctx,0,-42,15,10,c);
  eye(ctx,-7,-28,c,3.8);eye(ctx,9,-28,c,3.8);
  for(let i=0;i<7;i++)crystal(ctx,-15+i*5,-44+i%2*4,2.8,7,i%2?c.accent:c.light);
  etched(ctx,c,11,0,-39,12,10);
};
