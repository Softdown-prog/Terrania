/** Unicórnio de Prata — chifre prismático, crina luminosa e armadura cerimonial. */
import type { Palette } from "./geometry.ts";
import { body, longNeck, eyeShine, EDGE, GLINT } from "./geometry.ts";
import { ellipse, limb, rgba, TAU } from "../../draw.ts";

export const drawSilverUnicorn = (ctx:CanvasRenderingContext2D,p:Palette,time:number):void => {
  longNeck(ctx,p,time);
  for(const s of [-1,1]){
    body(ctx,21+s*5,-53,3.2,7.7,p,s*.16);
    ellipse(ctx,21+s*5,-55,1.25,4,rgba(p.accent,.6));
  }
  // Chifre em múltiplas faces com linhas espiraladas, não triângulo plano.
  const gleam=.55+Math.sin(time*1.5)*.13;
  ctx.fillStyle=p.accent;ctx.strokeStyle=EDGE;ctx.lineWidth=1.3;
  ctx.beginPath();ctx.moveTo(20,-58);ctx.lineTo(24,-88);
  ctx.lineTo(29,-58);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle=rgba(GLINT,gleam);ctx.beginPath();
  ctx.moveTo(23,-60);ctx.lineTo(24,-85);ctx.lineTo(25,-60);ctx.closePath();ctx.fill();
  for(let i=0;i<7;i++){
    const y=-61-i*3.6,r=4*(1-i/8);
    ctx.strokeStyle=i%2?p.light:p.dark;ctx.lineWidth=.8;
    ctx.beginPath();ctx.moveTo(24-r,y);ctx.lineTo(24+r,y-2);ctx.stroke();
  }
  // Focinho de cavalo, nariz, lábios e olho com reflexo frio.
  body(ctx,29,-42,8.5,5,p,.17);
  ellipse(ctx,35,-41,4.5,2.7,p.light);
  ellipse(ctx,36,-43,1.4,.9,p.dark);
  eyeShine(ctx,p,25,-50);
  ctx.strokeStyle=p.dark;ctx.lineWidth=1.2;
  ctx.beginPath();ctx.moveTo(31,-38);ctx.quadraticCurveTo(36,-35,40,-39);ctx.stroke();
  // Crina prateada com mechas que oscilam sem aleatoriedade por frame.
  for(let i=0;i<23;i++){
    const y=-53+i*1.4;
    const sway=Math.sin(time*1.5+i*.35)*1.2;
    limb(ctx,10-i%3,y,3-i%5+sway,y+7+i%4,1.4,
      i%3===0?p.accent:i%3===1?p.light:p.base);
  }
  // Costura da manta real, joias na rédea e detalhes de casco.
  ctx.strokeStyle=p.accent;ctx.lineWidth=2.1;
  ctx.beginPath();ctx.moveTo(-16,-33);ctx.quadraticCurveTo(1,-39,15,-31);ctx.stroke();
  for(let i=0;i<9;i++){
    const x=-13+i*3.5,y=-32-Math.sin(i/9*Math.PI)*5;
    ellipse(ctx,x,y,1.4,1.1,i%2?p.accent:GLINT);
  }
  for(let i=0;i<10;i++){
    const a=i*TAU/10,x=24+Math.cos(a)*8,y=-70+Math.sin(a)*8;
    ellipse(ctx,x,y,.6,.8,rgba(p.accent,.3+gleam*.28));
  }
};
