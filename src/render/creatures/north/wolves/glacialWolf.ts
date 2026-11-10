/** Silhueta e materiais exclusivos, mantendo as mesmas regras de combate. */
import type { ColorRamp } from "../../shared/regionalGeometry.ts";
import { organic, shard, headEyes, curvedLeg, OUTLINE } from "../../shared/regionalGeometry.ts";
import { ellipse } from "../../../draw.ts";

export const drawWolf = (ctx:CanvasRenderingContext2D,c:ColorRamp,time:number):void => {
  ctx.strokeStyle=OUTLINE;ctx.lineWidth=9;
  ctx.beginPath();ctx.moveTo(-18,-21);ctx.quadraticCurveTo(-33,-37+Math.sin(time*2)*2,-32,-42);ctx.stroke();
  ctx.strokeStyle=c.light;ctx.lineWidth=5;ctx.stroke();
  for(const s of [-1,1])for(const x of [-11,12]){
    curvedLeg(ctx,x+s*2,-16,x+s*3,-8,x+s*4,0,c,4);
  }
  organic(ctx,0,-25,23,12,c);
  organic(ctx,17,-35,13,11,c,.19);
  organic(ctx,28,-29,10,5,c,.09);
  for(let i=0;i<7;i++)shard(ctx,-16+i*6,-31-(i%2)*3,4,10+i%3*3,c.accent);
  for(const s of [-1,1])shard(ctx,15+s*7,-42,5,14,c.light);
  headEyes(ctx,[[21,-39],[30,-37]],c,1.9);
  ellipse(ctx,36,-29,2.2,1.6,OUTLINE);
};
