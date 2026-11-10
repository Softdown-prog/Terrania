/** Cavalo de Batalha — anatomia equina, couro e comportamento visual de galopada. */
import type { Palette } from "./geometry.ts";
import { body, longNeck, eyeShine, EDGE, GLINT } from "./geometry.ts";
import { ellipse, limb, rgba, TAU } from "../../draw.ts";

export const drawWarhorse = (ctx:CanvasRenderingContext2D,p:Palette,time:number):void => {
  longNeck(ctx,p,time);
  // Orelhas orientáveis, não chifres; ângulo sincronizado com a respiração.
  for(const side of [-1,1]){
    const flutter=Math.sin(time*1.8+side)*.035;
    ctx.save();ctx.translate(20+side*5,-54);ctx.rotate(side*.16+flutter);
    body(ctx,0,-5,3.6,8.5,p,side*.1);
    ellipse(ctx,-.5,-6,1.5,4.6,rgba(p.accent,.85));
    ctx.restore();
  }
  // Focinho longo e queixo separados: leitura clara mesmo em escala pequena.
  body(ctx,29,-41,9,5.5,p,.1);
  ellipse(ctx,34,-40,5.6,3.2,p.light,.14);
  ellipse(ctx,36,-42.7,1.7,1.1,EDGE);
  ellipse(ctx,35.4,-43.1,.53,.39,GLINT);
  ctx.strokeStyle=p.dark;ctx.lineWidth=1.4;
  ctx.beginPath();ctx.moveTo(31,-37);ctx.quadraticCurveTo(37,-35,40,-39);ctx.stroke();
  eyeShine(ctx,p,26,-49);
  // Freio, embocadura e tirantes: peças de equipamento com espessura real.
  ctx.strokeStyle=EDGE;ctx.lineWidth=4;
  ctx.beginPath();ctx.moveTo(20,-52);ctx.lineTo(35,-45);ctx.lineTo(35,-38);ctx.stroke();
  ctx.strokeStyle=p.tack;ctx.lineWidth=2.2;ctx.stroke();
  for(const x of [25,34]){
    ellipse(ctx,x,x===25?-49:-43,2,2,"#cfb27c");
    ellipse(ctx,x-.5,x===25?-49.5:-43.5,.6,.6,GLINT);
  }
  ctx.strokeStyle=rgba(GLINT,.5);ctx.lineWidth=.8;
  ctx.beginPath();ctx.moveTo(20,-52);ctx.lineTo(35,-45);ctx.stroke();
  // Juba em mechas, direção do vento e movimento do pescoço.
  for(let i=0;i<17;i++){
    const y=-52+i*1.7,wind=Math.sin(time*2.2+i*.37)*1.1;
    limb(ctx,11-i%4,y,4-i%5+wind,y+7+i%3,1.3,i%4?p.dark:p.light);
  }
  // Cauda com feixes independentes, não um traço imóvel.
  ctx.strokeStyle=EDGE;ctx.lineWidth=5;
  ctx.beginPath();ctx.moveTo(-22,-26);
  ctx.bezierCurveTo(-37,-42,-43,-25,-40+Math.sin(time*2)*2,-10);ctx.stroke();
  for(let i=0;i<11;i++){
    ctx.strokeStyle=i%3?p.dark:p.light;ctx.lineWidth=1.2+i%3*.3;
    ctx.beginPath();ctx.moveTo(-40,-24+i*.6);
    ctx.quadraticCurveTo(-46+Math.sin(time*2+i*.3)*2,-18,-39-i%3,-7+i);ctx.stroke();
  }
  ctx.strokeStyle=p.accent;ctx.lineWidth=1;
  ctx.beginPath();ctx.arc(28,-48,5,Math.PI*1.1,TAU*.88);ctx.stroke();
};
