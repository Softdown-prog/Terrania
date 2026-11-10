/** Bode Montanhês — cornos helicoidais, barba, lã e cascos fendidos. */
import type { Palette } from "./geometry.ts";
import { body, longNeck, eyeShine, EDGE, GLINT } from "./geometry.ts";
import { ellipse, limb, rgba } from "../../draw.ts";

export const drawMountainGoat = (ctx:CanvasRenderingContext2D,p:Palette,time:number):void => {
  longNeck(ctx,p,time,true);
  // A crina da nuca é curta; lã grossa cai em tufos sobre o peito.
  for(let i=0;i<22;i++){
    const x=3+i%6*3.7,y=-38+Math.floor(i/6)*5.2;
    const grad=ctx.createLinearGradient(x-2,y-4,x+2,y+3);
    grad.addColorStop(0,p.light);grad.addColorStop(1,p.dark);
    ellipse(ctx,x,y,3.3,4.5,grad,.12);
    ctx.strokeStyle=rgba(EDGE,.45);ctx.lineWidth=.65;
    ctx.beginPath();ctx.moveTo(x-1,y-2);ctx.lineTo(x,y+2);ctx.stroke();
  }
  for(const s of [-1,1]){
    ctx.strokeStyle=EDGE;ctx.lineWidth=6;
    ctx.beginPath();ctx.moveTo(18+s*5,-54);
    ctx.bezierCurveTo(26+s*8,-76,10+s*10,-82,11+s*8,-63);ctx.stroke();
    ctx.strokeStyle=p.accent;ctx.lineWidth=3.4;ctx.stroke();
    // Anéis de crescimento seguem a curva do corno.
    for(let i=0;i<7;i++){
      const t=i/7,x=18+s*(5+t*8),y=-57-t*20;
      ctx.strokeStyle=i%2?p.dark:p.light;ctx.lineWidth=.75;
      ctx.beginPath();ctx.moveTo(x-2,y);ctx.lineTo(x+2,y-1);ctx.stroke();
    }
    body(ctx,20+s*5,-49,3.6,5,p,s*.35);
    ellipse(ctx,20+s*5,-49,1.4,3,rgba(p.accent,.7),s*.2);
  }
  // Mandíbula larga, barba alongada de cabra e focinho chato.
  body(ctx,26,-40,8,5,p,.2);
  ellipse(ctx,32,-39,4.4,2.7,p.light);
  ellipse(ctx,33,-41,1.3,1,EDGE);
  for(let i=0;i<14;i++){
    const x=22+i*.7,y=-37+i%4*.5;
    limb(ctx,x,y,x+Math.sin(time*1.1+i*.3)*.8,-27+i%4,1.4,i%3?p.dark:p.light);
  }
  eyeShine(ctx,p,25,-47);
  ctx.strokeStyle=p.dark;ctx.lineWidth=1.3;
  ctx.beginPath();ctx.moveTo(23,-43);ctx.quadraticCurveTo(27,-44,30,-42);ctx.stroke();
  // Marca de sela reforçada para escalada, com costura diagonal.
  for(let k=0;k<8;k++){
    ctx.strokeStyle=k%2?p.tack:p.light;ctx.lineWidth=.8;
    ctx.beginPath();ctx.moveTo(-12+k*3,-28);
    ctx.lineTo(-9+k*3,-22);ctx.stroke();
  }
  ellipse(ctx,-24,-24,4.2,3.1,p.light);
  ellipse(ctx,-26,-23,2.4,1.6,p.dark);
  ellipse(ctx,17,-56,1,.5,GLINT);
};
