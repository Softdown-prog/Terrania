/** Hipocampo das Marés — pescoço equino, corpo de peixe, guelras e nadadeiras. */
import type { Palette } from "./geometry.ts";
import { body, eyeShine, EDGE, GLINT } from "./geometry.ts";
import { ellipse, rgba, TAU } from "../../draw.ts";

export const drawTidalHippocampus = (ctx:CanvasRenderingContext2D,p:Palette,time:number):void => {
  // Cauda de cavalo-marinho dobrada em curva orgânica.
  const curve=Math.sin(time*1.8)*2;
  ctx.strokeStyle=EDGE;ctx.lineWidth=14;ctx.lineCap="round";
  ctx.beginPath();ctx.moveTo(-16,-24);
  ctx.bezierCurveTo(-37,-18,-43,-40+curve,-52,-31);
  ctx.quadraticCurveTo(-61,-22,-50,-16);ctx.stroke();
  ctx.strokeStyle=p.base;ctx.lineWidth=10;ctx.stroke();
  ctx.strokeStyle=rgba(p.light,.45);ctx.lineWidth=2;ctx.stroke();
  for(let i=0;i<14;i++){
    const x=-23-(i%7)*4.2,y=-24-Math.floor(i/7)*7;
    ellipse(ctx,x,y,2.4,2.6,i%3?p.light:p.accent,.2);
  }
  // Coluna cervical longa e cabeça de peixe com focinho estreito.
  body(ctx,19,-44,8,20,p,-.2);
  body(ctx,23,-56,9,9,p);
  body(ctx,32,-52,10,4.5,p,-.12);
  ellipse(ctx,37,-51.5,3.7,2.2,p.light);
  ellipse(ctx,39,-52,1.2,.8,p.dark);
  eyeShine(ctx,p,25,-58);
  for(let i=0;i<5;i++){
    const y=-48+i*4;
    ctx.strokeStyle=i%2?p.dark:p.accent;ctx.lineWidth=1.1;
    ctx.beginPath();ctx.moveTo(18,y);ctx.quadraticCurveTo(21,y+2,24,y+2);ctx.stroke();
  }
  // Nadadeiras dorsais em leques estriados que ondulam ao nadar.
  for(let k=0;k<3;k++){
    const x=-18+k*14,y=-39-(k%2)*3,flutter=Math.sin(time*2.6+k)*1.8;
    ctx.fillStyle=k%2?p.accent:p.light;ctx.strokeStyle=EDGE;ctx.lineWidth=.8;
    ctx.beginPath();ctx.moveTo(x-7,y+7);
    ctx.quadraticCurveTo(x-7,y-17+flutter,x+4,y-18+flutter);
    ctx.lineTo(x+10,y+7);ctx.closePath();ctx.fill();ctx.stroke();
    for(let j=0;j<6;j++){
      ctx.strokeStyle=rgba(GLINT,.55);ctx.lineWidth=.6;
      ctx.beginPath();ctx.moveTo(x,y+6);
      ctx.lineTo(x-6+j*2,y-12+flutter);ctx.stroke();
    }
  }
  // Barbatanas peitorais laterais e cauda externa triangular.
  for(const s of [-1,1]){
    ctx.fillStyle=p.accent;ctx.strokeStyle=p.dark;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(s*12,-22);
    ctx.quadraticCurveTo(s*25,-10+Math.sin(time*2+s),s*28,-18);
    ctx.lineTo(s*12,-32);ctx.closePath();ctx.fill();ctx.stroke();
  }
  ctx.fillStyle=p.accent;ctx.beginPath();ctx.moveTo(-49,-17);
  ctx.quadraticCurveTo(-66,-45+curve,-63,-14);
  ctx.lineTo(-47,-12);ctx.closePath();ctx.fill();
  // Algas da sela, presilhas náuticas e bolhas em trajetórias determinísticas.
  for(let i=0;i<15;i++){
    const x=-17+i*2.3;
    ctx.strokeStyle=i%3?p.tack:p.accent;ctx.lineWidth=.7+i%3*.2;
    ctx.beginPath();ctx.moveTo(x,-35);
    ctx.quadraticCurveTo(x+Math.sin(time+i)*2,-41,x+2,-38);ctx.stroke();
  }
  for(let i=0;i<10;i++){
    const x=-29+i*8,y=-45+(i%4)*8+Math.sin(time*1.5+i)*2;
    ctx.strokeStyle=rgba(GLINT,.2+i%3*.2);ctx.lineWidth=.75;
    ctx.beginPath();ctx.arc(x,y,1+i%3*.7,0,TAU);ctx.stroke();
  }
};
