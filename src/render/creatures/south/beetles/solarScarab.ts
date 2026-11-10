/** Silhueta e materiais exclusivos, mantendo as mesmas regras de combate. */
import type { ColorRamp } from "../../shared/regionalGeometry.ts";
import { organic, shard, headEyes, curvedLeg, carapaceDetail, GLINT } from "../../shared/regionalGeometry.ts";
import { ellipse, rgba } from "../../../draw.ts";

export const drawScarab = (ctx: CanvasRenderingContext2D,c:ColorRamp,time:number):void => {
  for(const s of [-1,1]){
    for(let i=0;i<3;i++)curvedLeg(ctx,s*(10+i*2),-15+i*5,s*(20+i*3),-20+i*6,s*(27+i*2),-4+i*4,c,3);
    shard(ctx,s*12,-27,5,18,c.light);
  }
  organic(ctx,0,-17,20,16,c);
  ctx.strokeStyle=c.dark;ctx.lineWidth=2.5;
  ctx.beginPath();ctx.moveTo(0,-31);ctx.quadraticCurveTo(-2,-18,0,-3);ctx.stroke();
  ctx.strokeStyle=c.accent;ctx.lineWidth=1.7;
  for(let i=0;i<4;i++) {
    ctx.beginPath();ctx.arc(0,-18,7+i*3,Math.PI*1.15,Math.PI*1.85);ctx.stroke();
  }
  carapaceDetail(ctx,0,-17,15,12,c,15);
  headEyes(ctx,[[-6,-29],[6,-29]],c,1.7);
  const glow=.15+.1*Math.sin(time*3);
  ellipse(ctx,0,-21,11,8,rgba(GLINT,glow));
};
