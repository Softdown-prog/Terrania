/** Urso-das-Cavernas — ombros maciços, pelagem ártica e garras pesadas. */
import type { Palette } from "./geometry.ts";
import { body, eyeShine, EDGE, GLINT } from "./geometry.ts";
import { ellipse, limb, rgba } from "../../draw.ts";

export const drawCavernBear = (ctx:CanvasRenderingContext2D,p:Palette,time:number):void => {
  // Corcova e pescoço fundem-se num volume glaciar irregular.
  body(ctx,9,-35,21,20,p,-.08);
  body(ctx,19,-36,14,13,p,.11);
  for(let i=0;i<26;i++){
    const x=-11+(i%9)*4,y=-49+Math.floor(i/9)*6;
    ctx.strokeStyle=i%4?p.dark:p.light;ctx.lineWidth=1.1+i%3*.2;
    ctx.beginPath();ctx.moveTo(x-2,y+2);
    ctx.quadraticCurveTo(x+2,y-2,x+5,y+3);ctx.stroke();
  }
  // Orelhas arredondadas, cabeça baixa de plantígrado.
  for(const side of [-1,1]){
    body(ctx,20+side*9,-44,5.4,6,p);
    ellipse(ctx,20+side*9,-43.8,2.5,3.7,rgba(p.dark,.77));
  }
  body(ctx,21,-36,13,11,p,.08);
  body(ctx,29,-31,11,6,{...p,base:p.light},.04);
  ellipse(ctx,37,-34,5,3.1,EDGE);
  ellipse(ctx,35.8,-34.7,1.6,.8,GLINT);
  eyeShine(ctx,p,25,-39);
  ctx.strokeStyle=EDGE;ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(30,-28);
  ctx.quadraticCurveTo(33,-26+Math.sin(time*1.1)*.3,37,-28);ctx.stroke();
  // Quatro dentes e placas de gelo presas à pelagem do flanco.
  for(let i=0;i<4;i++){
    ctx.fillStyle=p.light;ctx.beginPath();
    ctx.moveTo(30+i*2.2,-28);ctx.lineTo(31+i*2.2,-24);ctx.lineTo(32+i*2.2,-28);
    ctx.closePath();ctx.fill();
  }
  for(let i=0;i<13;i++){
    const x=-17+(i%5)*8,y=-40+Math.floor(i/5)*9;
    ctx.fillStyle=i%2?p.accent:p.light;ctx.strokeStyle=p.dark;ctx.lineWidth=.7;
    ctx.beginPath();ctx.moveTo(x-2,y);
    ctx.lineTo(x-1,y-6-i%3);ctx.lineTo(x+3,y-4);ctx.lineTo(x+4,y+1);
    ctx.closePath();ctx.fill();ctx.stroke();
  }
  // Garras próximas ao solo dão peso e permitem silhueta distinguível.
  for(const px of [-15,14])for(let i=0;i<4;i++){
    const x=px-5+i*3.5;
    limb(ctx,x,-1,x-1,5,1.1,p.dark);
    ellipse(ctx,x-1,5,1.6,1.3,p.light);
  }
  ctx.strokeStyle=rgba(GLINT,.5);ctx.lineWidth=1.3;
  ctx.beginPath();ctx.moveTo(-9,-43);ctx.quadraticCurveTo(3,-52,15,-45);ctx.stroke();
};
