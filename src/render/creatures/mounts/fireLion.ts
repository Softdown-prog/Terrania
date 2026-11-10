/** Leão do Fogo — juba em camadas, focinho felino e cauda flamejante. */
import type { Palette } from "./geometry.ts";
import { body, eyeShine, EDGE, GLINT } from "./geometry.ts";
import { ellipse, rgba, TAU } from "../../draw.ts";

export const drawFireLion = (ctx:CanvasRenderingContext2D,p:Palette,time:number):void => {
  const flicker=Math.sin(time*4.7)*.7;
  // Juba radial que se mexe individualmente; não um círculo chapado.
  for(let ring=0;ring<2;ring++)for(let i=0;i<20;i++){
    const a=i*TAU/20+(ring*.1),s=ring?12:17;
    const rx=18+Math.cos(a)*s,ry=-41+Math.sin(a)*s;
    const length=8+ring*2+Math.sin(time*4+i*1.1)*1.5;
    body(ctx,rx,ry,4+ring, length,{...p,base:p.accent,light:p.light,dark:p.dark},a);
    ctx.strokeStyle=rgba(p.light,.65);ctx.lineWidth=.75;
    ctx.beginPath();ctx.moveTo(rx-2,ry-3);ctx.lineTo(rx+2,ry+2);ctx.stroke();
  }
  body(ctx,21,-43,11,9,p);
  for(const s of [-1,1]){
    body(ctx,20+s*7,-50,4.7,5,p,s*.2);
    ellipse(ctx,20+s*7,-50,2.1,2.7,p.accent);
  }
  // Olhos triangulares e focinho dividido em duas bochechas.
  eyeShine(ctx,p,18,-45);
  eyeShine(ctx,p,25,-45);
  ellipse(ctx,23,-37,9,4.5,p.light);
  ellipse(ctx,18,-36,5,3.8,p.base);
  ellipse(ctx,27,-36,5,3.8,p.base);
  ctx.fillStyle=EDGE;ctx.beginPath();ctx.moveTo(21,-41);
  ctx.lineTo(25,-41);ctx.lineTo(23,-37);ctx.closePath();ctx.fill();
  for(let side=-1;side<=1;side+=2)for(let k=0;k<4;k++){
    ctx.strokeStyle=rgba(GLINT,.68);ctx.lineWidth=.6;
    ctx.beginPath();ctx.moveTo(23+side*3,-36);
    ctx.quadraticCurveTo(29+side*6,-40+k*2,37+side*6,-41+k*3);ctx.stroke();
  }
  // Curva da cauda, ponta incendiada e partículas localizadas.
  ctx.strokeStyle=EDGE;ctx.lineWidth=5;
  ctx.beginPath();ctx.moveTo(-20,-21);
  ctx.bezierCurveTo(-34,-38,-42,-20,-34,-12);ctx.stroke();
  ctx.strokeStyle=p.accent;ctx.lineWidth=3.2;ctx.stroke();
  for(let i=0;i<12;i++){
    const a=i*TAU/12,r=4+i%3*1.5;
    const x=-34+Math.cos(a)*r,y=-12+Math.sin(a)*r+flicker;
    ellipse(ctx,x,y,3.2,5,i%3?p.accent:p.light,a);
    ellipse(ctx,x-.6,y-1,1,.8,rgba(GLINT,.7));
  }
  for(let i=0;i<7;i++){
    const x=-37+i*5,y=-18-Math.sin(time*2+i)*5;
    ellipse(ctx,x,y,1.2,.7,rgba(p.accent,.45));
  }
};
