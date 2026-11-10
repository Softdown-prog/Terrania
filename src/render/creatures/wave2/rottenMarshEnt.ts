/** Anatomia e movimentos próprios da espécie: não é uma ficha de atributos. */
import type { Ramp } from "./geometry.ts";
import { mass, eye, joint, etched, EDGE, GLINT } from "./geometry.ts";
import { ellipse } from "../../draw.ts";

export const ent = (ctx:CanvasRenderingContext2D,c:Ramp,t:number):void => {
  for(const s of [-1,1]){
    joint(ctx,[[s*6,-15],[s*15,-5],[s*24,0]],c,9);
    joint(ctx,[[s*10,-41],[s*26,-28],[s*30,-12]],c,7);
    for(let i=0;i<3;i++){
      joint(ctx,[[s*18,-46],[s*(23+i*6),-55-i*4],[s*(25+i*8),-63-i*6]],c,2.5);
      ellipse(ctx,s*(24+i*7),-65-i*6,3.4,4.3,i%2?c.accent:c.light);
    }
  }
  mass(ctx,0,-28,15,29,c);
  mass(ctx,0,-49,13,13,c);
  ctx.fillStyle=EDGE;
  ctx.beginPath();ctx.moveTo(-8,-39);ctx.lineTo(0,-34);ctx.lineTo(9,-39);ctx.lineTo(6,-28);
  ctx.lineTo(-3,-30);ctx.closePath();ctx.fill();
  eye(ctx,-6,-50,c,2);eye(ctx,6,-50,c,2);
  for(let i=0;i<11;i++){
    const x=Math.sin(i*17)*23,y=-40-Math.abs(Math.cos(i*19))*23;
    joint(ctx,[[x*.5,y+11],[x,y+2]],c,2);
    mass(ctx,x,y+Math.sin(t*1.4+i)*.8,3.4,1.7,{...c,base:i%2?c.accent:"#a161c6",light:GLINT,dark:c.dark});
  }
  etched(ctx,c,9,0,-24,9,19);
};
