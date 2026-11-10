/** Silhueta e materiais exclusivos, mantendo as mesmas regras de combate. */
import type { ColorRamp } from "../../shared/regionalGeometry.ts";
import { organic, headEyes, carapaceDetail, OUTLINE } from "../../shared/regionalGeometry.ts";
import { ellipse } from "../../../draw.ts";

export const drawHydra = (ctx: CanvasRenderingContext2D, c: ColorRamp, time: number): void => {
  organic(ctx,0,-8,26,11,c);
  for(let h=0;h<3;h++){
    const s=h-1, n=Math.sin(time*1.6+h)*1.4;
    ctx.strokeStyle=OUTLINE;ctx.lineWidth=12;
    ctx.beginPath();ctx.moveTo(s*12,-12);ctx.bezierCurveTo(s*24,-26,s*12,-40,s*16+n,-52+(h%2)*7);ctx.stroke();
    ctx.strokeStyle=c.base;ctx.lineWidth=9;ctx.stroke();
    organic(ctx,s*16+n,-53+(h%2)*7,8,7,c,s*.13);
    headEyes(ctx,[[s*16+n-2,-55+(h%2)*7],[s*16+n+4,-55+(h%2)*7]],c,1.65);
    ellipse(ctx,s*16+n+5,-49+(h%2)*7,3,1.2,c.dark);
  }
  for(let i=0;i<12;i++){
    const x=Math.sin(i*8.19)*20,y=-8+Math.cos(i*9.1)*5;
    ellipse(ctx,x,y,3.2,1.9,i%2?c.accent:c.light);
  }
  carapaceDetail(ctx,0,-12,21,6,c,12);
};
