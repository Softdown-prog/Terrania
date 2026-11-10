/** Anatomia e movimentos próprios da espécie: não é uma ficha de atributos. */
import type { Ramp } from "../../shared/wave2Geometry.ts";
import { mass, eye, joint, crystal, etched, EDGE } from "../../shared/wave2Geometry.ts";
import { rgba } from "../../../draw.ts";

export const triton = (ctx:CanvasRenderingContext2D,c:Ramp,t:number):void => {
  ctx.strokeStyle=EDGE;ctx.lineWidth=16;ctx.lineCap="round";
  ctx.beginPath();ctx.moveTo(1,-10);
  ctx.bezierCurveTo(21,0,38,-4,28,-18);ctx.stroke();
  ctx.strokeStyle=c.base;ctx.lineWidth=13;ctx.stroke();
  crystal(ctx,32,-16,9,20,c.accent);
  for(const s of [-1,1])joint(ctx,[[s*11,-39],[s*20,-26],[s*21,-13]],c,6);
  mass(ctx,0,-37,15,20,c);
  mass(ctx,0,-56,12,13,c);
  for(const s of [-1,1])crystal(ctx,s*9,-61,5,12,c.accent);
  for(let i=0;i<7;i++)crystal(ctx,-9+i*3,-67+(i%3)*3,3,9,c.light);
  eye(ctx,-5,-56,c,2.3);eye(ctx,5,-56,c,2.3);
  for(let i=0;i<7;i++){
    const x=-8+i*2.7;ctx.strokeStyle=c.accent;ctx.lineWidth=1.4;
    ctx.beginPath();ctx.moveTo(x,-29);
    ctx.quadraticCurveTo(x+2,-19,x,-17);ctx.stroke();
  }
  // Lightning trident is part of this species, not a generic sword.
  ctx.strokeStyle=EDGE;ctx.lineWidth=4;ctx.beginPath();
  ctx.moveTo(-24,-12);ctx.lineTo(-25,-68);ctx.stroke();
  ctx.strokeStyle=c.accent;ctx.lineWidth=2.4;ctx.stroke();
  for(const dx of [-7,0,7]){
    ctx.strokeStyle=rgba(c.accent,.8);ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(-25+dx,-55);
    ctx.lineTo(-25+dx,-73);ctx.lineTo(-25+dx+Math.sin(t*2+dx)*1.3,-78);ctx.stroke();
    crystal(ctx,-25+dx,-71,3,10,c.light,c.accent);
  }
  etched(ctx,c,9,0,-35,9,14);
};
