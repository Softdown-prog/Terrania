/** Silhueta e materiais exclusivos, mantendo as mesmas regras de combate. */
import type { ColorRamp } from "../../shared/regionalGeometry.ts";
import { organic, shard, headEyes, curvedLeg, OUTLINE } from "../../shared/regionalGeometry.ts";
import { ellipse, shade, TAU } from "../../../draw.ts";

export const drawYeti = (ctx:CanvasRenderingContext2D,c:ColorRamp):void => {
  for(const s of [-1,1]){
    organic(ctx,s*11,-8,10,11,c);
    curvedLeg(ctx,s*14,-32,s*25,-23,s*29,-5,c,12);
    for(let i=0;i<5;i++)shard(ctx,s*(20+i%3*4),-23+i*4,3,7,c.light);
  }
  organic(ctx,0,-30,20,24,c);
  organic(ctx,0,-50,15,15,c);
  for(let i=0;i<9;i++){
    const a=i*TAU/9,x=Math.sin(a)*16,y=-32+Math.cos(a)*16;
    shard(ctx,x,y+4,4,8,c.light,c.accent);
  }
  for(const s of [-1,1])shard(ctx,s*11,-60,6,14,c.dark);
  organic(ctx,0,-45,9,8,{...c,base:shade(c.base,-.25)},.1);
  headEyes(ctx,[[-5,-52],[5,-52]],c,2.3);
  ellipse(ctx,0,-43,3,2.1,OUTLINE);
};
