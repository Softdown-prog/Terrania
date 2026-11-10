/** Anatomia e movimentos próprios da espécie: não é uma ficha de atributos. */
import type { Ramp } from "../../shared/wave2Geometry.ts";
import { mass, eye, joint, crystal, etched, EDGE, GLINT } from "../../shared/wave2Geometry.ts";
import { rgba } from "../../../draw.ts";

export const mammoth = (ctx:CanvasRenderingContext2D,c:Ramp,t:number):void => {
  for(const s of [-1,1]){
    joint(ctx,[[s*16,-18],[s*22,-6],[s*23,1]],c,12);
    mass(ctx,s*23,0,9,5,c);
  }
  mass(ctx,0,-29,30,27,c);
  mass(ctx,18,-42,20,21,c);
  mass(ctx,30,-37,12,12,c);
  for(let i=0;i<10;i++){
    const x=Math.sin(i*2.2)*26,y=-48+Math.cos(i*3.1)*12;
    crystal(ctx,x,y+5,4,8,c.light);
  }
  for(const s of [-1,1]){
    ctx.strokeStyle=EDGE;ctx.lineWidth=9;ctx.lineCap="round";
    ctx.beginPath();ctx.moveTo(19+s*12,-35);
    ctx.bezierCurveTo(34+s*20,-8,45+s*12,-13,43+s*13,-27);ctx.stroke();
    ctx.strokeStyle=c.accent;ctx.lineWidth=6;ctx.stroke();
    ctx.strokeStyle=rgba(GLINT,.68);ctx.lineWidth=1;ctx.stroke();
  }
  eye(ctx,31,-46,c,2.5);
  joint(ctx,[[40,-37],[47,-22],[46+Math.sin(t)*2,-12]],c,6);
  etched(ctx,c,12,-8,-27,22,20);
};
