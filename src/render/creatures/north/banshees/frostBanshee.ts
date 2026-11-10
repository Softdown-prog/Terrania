/** Anatomia e movimentos próprios da espécie: não é uma ficha de atributos. */
import type { Ramp } from "../../shared/wave2Geometry.ts";
import { mass, eye, joint, crystal, etched } from "../../shared/wave2Geometry.ts";
import { ellipse, rgba } from "../../../draw.ts";

export const banshee = (ctx:CanvasRenderingContext2D,c:Ramp,t:number):void => {
  // Torn veil is layered as translucent folds rather than a solid ground-touching actor.
  ctx.fillStyle=rgba(c.dark,.86);
  ctx.beginPath();ctx.moveTo(-10,-48);
  ctx.bezierCurveTo(-20,-35,-27,-14,-15,-7);
  ctx.quadraticCurveTo(-10,-16,-4,-6);
  ctx.quadraticCurveTo(2,-18,9,-8);
  ctx.quadraticCurveTo(25,-16,13,-43);ctx.closePath();ctx.fill();
  for(const s of [-1,1])joint(ctx,[[s*9,-38],[s*22,-28],[s*30,-18+Math.sin(t*2)*2]],c,4);
  mass(ctx,0,-37,13,21,c);
  mass(ctx,0,-52,12,13,c);
  for(let i=0;i<9;i++){
    const x=-17+i*4;
    crystal(ctx,x,-39+i%3*2,3.1,14-i%3*2,c.light,c.accent);
  }
  eye(ctx,-5,-53,c,2.9);eye(ctx,5,-53,c,2.9);
  ellipse(ctx,0,-46,2.4,4.3,c.dark);
  for(let i=0;i<8;i++){
    const a=i*2.4+t*.3;
    crystal(ctx,Math.cos(a)*27,-28+Math.sin(a)*19,3.3,8,c.accent);
  }
  etched(ctx,c,8,0,-30,9,12);
};
