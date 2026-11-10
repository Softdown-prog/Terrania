/** Grifo-Sombrio — bico de águia, asas com penas articuladas e garras de felino. */
import type { Palette } from "./geometry.ts";
import { body, eyeShine, EDGE, GLINT } from "./geometry.ts";
import { ellipse, limb, rgba, TAU } from "../../draw.ts";

export const drawDarkGriffin = (ctx:CanvasRenderingContext2D,p:Palette,time:number):void => {
  const flap=Math.sin(time*2.8)*2;
  // Duas asas com raízes no dorso e remiges independentes, não o mesmo cavalo.
  for(const s of [-1,1]){
    const wing=ctx.createLinearGradient(-23,-68,15,-35);
    wing.addColorStop(0,p.light);wing.addColorStop(.6,p.base);wing.addColorStop(1,p.dark);
    ctx.fillStyle=wing;ctx.strokeStyle=EDGE;ctx.lineWidth=1.6;
    ctx.beginPath();ctx.moveTo(-5,-34);
    ctx.bezierCurveTo(s*10-25,-78+flap,s*19-10,-63+flap,s*20,-42);
    ctx.quadraticCurveTo(s*12,-42,-5,-34);ctx.closePath();ctx.fill();ctx.stroke();
    for(let k=0;k<12;k++){
      const x=s*(7+k*2),y=-45-(k%4)*2.2+flap*.3;
      body(ctx,x,y,2.4,6.2+(k%3)*1.6,{...p,base:p.accent},s*.24);
      ctx.strokeStyle=rgba(GLINT,.53);ctx.lineWidth=.65;
      ctx.beginPath();ctx.moveTo(x,y-5);ctx.lineTo(x+.7,y);ctx.stroke();
    }
  }
  body(ctx,18,-38,12,12,p);
  body(ctx,20,-47,9,10,{...p,base:p.light,light:GLINT},-.1);
  // Rosto de ave: olhos laterais, penas do colar e bico recurvado.
  eyeShine(ctx,p,26,-48);
  ctx.fillStyle=p.accent;ctx.strokeStyle=EDGE;ctx.lineWidth=1.35;
  ctx.beginPath();ctx.moveTo(28,-43);ctx.lineTo(42,-40);
  ctx.quadraticCurveTo(43,-36,38,-32);
  ctx.lineTo(33,-35);ctx.lineTo(34,-39);ctx.closePath();ctx.fill();ctx.stroke();
  ellipse(ctx,37,-39,1.5,.8,p.dark);
  for(let i=0;i<10;i++){
    const x=11+i*1.7,y=-53+i*1.8;
    body(ctx,x,y,2.6,5.2,{...p,base:p.light,dark:p.dark},-.18);
  }
  // Talões dianteiros com unha dupla e textura no tarso.
  for(const s of [-1,1]){
    limb(ctx,s*10,-16,s*14,-3,6,EDGE);
    limb(ctx,s*10,-16,s*14,-3,4,p.accent);
    for(let k=-1;k<=1;k++){
      const x=s*14+k*3.2;
      ctx.fillStyle=p.light;ctx.beginPath();
      ctx.moveTo(x-2,-4);ctx.lineTo(x,-.5);ctx.lineTo(x+1,5);
      ctx.closePath();ctx.fill();
    }
  }
  // Cauda felina termina em leque de penas escuras.
  ctx.strokeStyle=EDGE;ctx.lineWidth=4;
  ctx.beginPath();ctx.moveTo(-24,-26);
  ctx.bezierCurveTo(-36,-35,-42,-17,-38,-9);ctx.stroke();
  for(let i=0;i<7;i++){
    const a=i*TAU/7;
    ellipse(ctx,-38+Math.cos(a)*4,-9+Math.sin(a)*3,2.3,5,
      i%2?p.dark:p.accent,a);
  }
  ellipse(ctx,27,-47,.5,.5,rgba(GLINT,.8));
};
