/** Anatomia-base compartilhada: matéria e proporções, nunca comportamento de montaria. */
import type { MountId } from "../../../actors/MountCatalog.ts";
import { ellipse, limb, rgba, shade, TAU } from "../../draw.ts";
export type Palette = Readonly<{ base:string; dark:string; light:string; accent:string; tack:string }>;
export const PALETTES: Readonly<Record<MountId,Palette>> = {
  warhorse:{base:"#8d583c",dark:"#352c35",light:"#ce9b6a",accent:"#9caeb7",tack:"#a2673e"},
  "mountain-goat":{base:"#948775",dark:"#393a3d",light:"#d6c6a5",accent:"#e5d7aa",tack:"#805a43"},
  "imperial-elk":{base:"#9c7653",dark:"#44352f",light:"#cdb18e",accent:"#c7a475",tack:"#786046"},
  "fire-lion":{base:"#d78037",dark:"#7e392c",light:"#ffcf66",accent:"#ff6f19",tack:"#80543d"},
  "sand-basilisk":{base:"#82965c",dark:"#3d563f",light:"#b5c997",accent:"#d8a45a",tack:"#93583a"},
  "cavern-bear":{base:"#b7cad1",dark:"#63788a",light:"#ecf6f1",accent:"#c8e6ff",tack:"#845d42"},
  "silver-unicorn":{base:"#d0dbe7",dark:"#667b95",light:"#fff8ef",accent:"#d8e4ff",tack:"#9ca5bb"},
  "dark-griffin":{base:"#997046",dark:"#373f48",light:"#dec09a",accent:"#f0d0aa",tack:"#6c5142"},
  "cargo-beetle":{base:"#9d9777",dark:"#4c493d",light:"#d0c6a1",accent:"#c9a56e",tack:"#75543f"},
  "tidal-hippocampus":{base:"#3eaca2",dark:"#265a70",light:"#a4e3d4",accent:"#6bddce",tack:"#885d53"},
};
export const EDGE="#142a2a",GLINT="#fff6dc";
export const body = (ctx:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,
  p:Palette,angle=0):void => {
  const g=ctx.createLinearGradient(x-rx,y-ry,x+rx,y+ry);
  g.addColorStop(0,p.light);g.addColorStop(.48,p.base);g.addColorStop(1,p.dark);
  ellipse(ctx,x,y,rx,ry,g,angle);
  ctx.strokeStyle=EDGE;ctx.lineWidth=1.25;
  ctx.beginPath();ctx.ellipse(x,y,rx,ry,angle,0,TAU);ctx.stroke();
  ctx.strokeStyle=rgba(GLINT,.42);ctx.lineWidth=.9;
  ctx.beginPath();ctx.ellipse(x-1,y-1,Math.max(1,rx-2),Math.max(1,ry-2),
    angle,Math.PI,Math.PI*1.85);ctx.stroke();
};
export const outlineLeg = (ctx:CanvasRenderingContext2D,x:number,y:number,dx:number,phase:number,p:Palette,heavy=false):void => {
  const width=heavy?9:5.5;
  limb(ctx,x,y,x+dx,y+12+phase,width+2,EDGE);
  limb(ctx,x,y,x+dx,y+12+phase,width,p.base);
  limb(ctx,x+dx,y+12+phase,x+dx+2,y+19+phase,width*.9,EDGE);
  limb(ctx,x+dx,y+12+phase,x+dx+2,y+19+phase,width*.7,p.light);
  ellipse(ctx,x+dx+2,y+20+phase,width*.9,2.5,p.dark);
  ellipse(ctx,x+dx+1,y+19+phase,width*.55,1,rgba(GLINT,.48));
};
export const pack = (ctx:CanvasRenderingContext2D,p:Palette):void => {
  // Sela em couro recortado, fivelas, crina e as duas correias de três passadas.
  const belt=ctx.createLinearGradient(-12,-30,12,-7);
  belt.addColorStop(0,shade(p.tack,.35));belt.addColorStop(1,shade(p.tack,-.35));
  ctx.fillStyle=belt;ctx.strokeStyle=EDGE;ctx.lineWidth=1.3;
  ctx.beginPath();ctx.moveTo(-16,-26);ctx.quadraticCurveTo(-3,-34,14,-27);
  ctx.lineTo(11,-14);ctx.quadraticCurveTo(-3,-20,-15,-15);ctx.closePath();
  ctx.fill();ctx.stroke();
  for(const xx of [-11,11]){
    limb(ctx,xx,-25,xx-1,-5,3.8,EDGE);
    limb(ctx,xx,-25,xx-1,-5,2.2,p.tack);
    limb(ctx,xx,-25,xx-1,-5,.7,rgba(GLINT,.62));
    ellipse(ctx,xx-1,-5,2.3,2.1,"#dcc48e");
  }
  ellipse(ctx,-5,-25,6,2,rgba(GLINT,.34));
};
export const decorativeFur = (ctx:CanvasRenderingContext2D,p:Palette,seed:number,rx=19,ry=12):void => {
  // Microfibras recortadas na silhueta, não pontilhado solto no fundo.
  ctx.save();ctx.beginPath();ctx.ellipse(0,-23,rx,ry,0,0,TAU);ctx.clip();
  for(let i=0;i<20;i++){
    const a=i*2.39996,r=Math.sqrt((i+.5)/20);
    const x=Math.cos(a)*rx*r,y=-23+Math.sin(a)*ry*r;
    ctx.strokeStyle=rgba(i%3?p.light:p.dark,.32);
    ctx.lineWidth=.6+i%2*.35;
    ctx.beginPath();ctx.moveTo(x-3,y-2);ctx.quadraticCurveTo(x,y-3,x+3,y-1);ctx.stroke();
    if(i%3===seed%3)ellipse(ctx,x-.8,y-2,1.1,.6,rgba(GLINT,.3));
  }
  ctx.restore();
};

/** Cabeça e crina de equinos e cervídeos. A ornamentação pertence ao arquivo de cada espécie. */
export const longNeck = (ctx:CanvasRenderingContext2D,p:Palette,time:number,goat=false):void => {
  body(ctx,16,-37,goat?11:9,goat?15:18,p,-.15);
  body(ctx,21,-47,goat?11:8,10,p,-.15);
  for(let i=0;i<9;i++){
    const y=-50+i*3,flutter=Math.sin(time*1.3+i*.38)*.3;
    limb(ctx,10-i%2*2,y,5-Math.sin(i)*2+flutter,y+6,1.7,p.dark);
  }
};
export const eyeShine = (ctx:CanvasRenderingContext2D,p:Palette,x=27,y=-43):void => {
  ellipse(ctx,x,y,3,2.7,EDGE);
  ellipse(ctx,x-.4,y-.2,1.7,1.6,p.accent);
  ellipse(ctx,x-1,y-.8,.6,.6,GLINT);
};
export const flankMarks = (ctx:CanvasRenderingContext2D,p:Palette,time:number,count=7):void => {
  for(let i=0;i<count;i++){
    const u=i/Math.max(1,count-1),x=-16+u*30;
    const y=-25+Math.sin(i*2.8)*3+Math.sin(time*1.1)*.25;
    ellipse(ctx,x,y,1.6+i%3*.28,.75,rgba(i%2?p.accent:p.light,.54));
    ellipse(ctx,x-.5,y-.6,.48,.3,rgba(GLINT,.55));
  }
};
