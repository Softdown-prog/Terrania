/**
 * Goblin Saqueador da Areia — acabamento de equipamento, expressão e estados
 * para leitura a 1x/2x zoom. O motor continua sendo fonte de dano e tempo.
 */
import type { DesertCommonVisual } from "../../regionalWave3.ts";
import { clamp01, ellipse, hashString, rgba, TAU } from "../../draw.ts";
import type { Palette } from "./geometry.ts";
import { body, line, tip, eye, freckles, OUTLINE, GLOW } from "./geometry.ts";
const C={
  leather:"#563e35",leatherLight:"#a67a4f",bronze:"#d1a15d",verdigris:"#63875e",
  linen:"#e3cfab",shadow:"#26322b",eye:"#f5ce69",glint:"#fff4d8",
  iron:"#82878b",rust:"#8e5a3e",green:"#8ca57d",darkGreen:"#425f42",
} as const;
function cloth(ctx:CanvasRenderingContext2D,time:number):void{
  const g=ctx.createLinearGradient(-9,-44,12,-8);
  g.addColorStop(0,C.linen);g.addColorStop(.45,"#baa27d");g.addColorStop(1,C.leather);
  ctx.fillStyle=g;ctx.strokeStyle=C.shadow;ctx.lineWidth=1.2;
  ctx.beginPath();ctx.moveTo(-9,-34);ctx.quadraticCurveTo(-17,-21,-14,-10);
  ctx.lineTo(-2,-13);ctx.lineTo(13,-9);
  ctx.quadraticCurveTo(13,-22,10,-34);ctx.closePath();ctx.fill();ctx.stroke();
  for(let i=0;i<6;i++){
    const y=-30+i*3.6;
    ctx.strokeStyle=i%2?rgba(C.glint,.35):rgba(C.leather,.44);ctx.lineWidth=.9;
    ctx.beginPath();ctx.moveTo(-8-(i%2),y);
    ctx.bezierCurveTo(-2,y+1.1,4,y-.5,10,y+1.2);ctx.stroke();
  }
  const fray=Math.sin(time*1.8)*.6;
  for(let i=0;i<8;i++){
    ctx.strokeStyle=rgba(C.linen,.67);ctx.lineWidth=.65;
    ctx.beginPath();ctx.moveTo(-12+i*3,-9);ctx.lineTo(-13+i*3,-6-i%3+fray);ctx.stroke();
  }
}
function turban(ctx:CanvasRenderingContext2D):void{
  for(let ring=0;ring<8;ring++){
    const y=-58+ring*2.4;
    ctx.strokeStyle=ring%2===0?C.linen:"#8e7f67";
    ctx.lineWidth=ring===0?3:1.8;
    ctx.beginPath();ctx.moveTo(-11+ring*.2,y);
    ctx.bezierCurveTo(-4,y-3,6,y+2,10-ring*.17,y+1);ctx.stroke();
    ctx.strokeStyle=rgba(C.glint,.18);ctx.lineWidth=.55;
    ctx.beginPath();ctx.moveTo(-9,y-.9);ctx.lineTo(6,y-.2);ctx.stroke();
  }
  ctx.fillStyle=C.leather;
  ctx.beginPath();ctx.moveTo(8,-52);ctx.quadraticCurveTo(16,-42,9,-34);
  ctx.lineTo(6,-39);ctx.closePath();ctx.fill();
  for(let k=0;k<4;k++){
    ctx.strokeStyle=C.linen;ctx.lineWidth=.8;
    ctx.beginPath();ctx.moveTo(8+k*.4,-45+k*2);
    ctx.lineTo(12-k*.3,-43+k*1.9);ctx.stroke();
  }
}
function ears(ctx:CanvasRenderingContext2D,time:number):void{
  for(const side of [-1,1]){
    const twitch=Math.sin(time*2+side)*.65;
    ctx.fillStyle=C.green;ctx.strokeStyle=C.shadow;ctx.lineWidth=1.2;
    ctx.beginPath();ctx.moveTo(side*8,-43);ctx.quadraticCurveTo(side*16,-48,
      side*(25+twitch),-53);ctx.quadraticCurveTo(side*23,-37,side*8,-36);
    ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle="#a66d64";ctx.beginPath();
    ctx.moveTo(side*12,-42);ctx.lineTo(side*21,-48);
    ctx.quadraticCurveTo(side*19,-41,side*12,-39);ctx.closePath();ctx.fill();
    ctx.strokeStyle=rgba(C.glint,.45);ctx.lineWidth=.7;
    ctx.beginPath();ctx.moveTo(side*14,-44);ctx.lineTo(side*20,-48);ctx.stroke();
  }
}
function face(ctx:CanvasRenderingContext2D,seed:number,time:number,hp:number):void{
  const blink=Math.sin(time*.9+seed*19)>.991;
  for(const side of [-1,1]){
    const x=side*5;
    ellipse(ctx,x,-43,3,blink?.6:2,C.shadow);
    if(!blink){
      ellipse(ctx,x,-43,1.8,1.5,C.eye);
      ellipse(ctx,x-.35,-43.6,.55,.55,C.glint);
    }
    ctx.strokeStyle=C.darkGreen;ctx.lineWidth=1.1;
    ctx.beginPath();ctx.moveTo(x-2.2,-47);
    ctx.quadraticCurveTo(x,-48.3,x+3.2,-47);ctx.stroke();
  }
  ellipse(ctx,2,-35,5,3,C.green);
  ellipse(ctx,4,-36,2.7,1.1,rgba(C.glint,.42));
  ctx.strokeStyle=C.shadow;ctx.lineWidth=1.4;
  ctx.beginPath();ctx.moveTo(-5,-30);
  ctx.quadraticCurveTo(1,-26+(hp<30?2:0),7,-31);ctx.stroke();
  for(const x of [-4,5]){
    ctx.fillStyle=C.linen;ctx.beginPath();
    ctx.moveTo(x,-31);ctx.lineTo(x+1,-26);ctx.lineTo(x+2,-31);
    ctx.closePath();ctx.fill();
  }
  if(hp<30){
    ctx.strokeStyle=rgba("#9a514b",.78);ctx.lineWidth=1.25;
    ctx.beginPath();ctx.moveTo(-6,-40);ctx.lineTo(-4,-35);ctx.lineTo(-5,-31);ctx.stroke();
  }
}
function dagger(ctx:CanvasRenderingContext2D,time:number,casting:number):void{
  const windup=clamp01(casting);
  const lift=windup*4+Math.sin(time*1.5)*.4;
  ctx.save();ctx.translate(24,-25-lift);ctx.rotate(.19*windup);
  ctx.fillStyle=C.leather;ctx.strokeStyle=C.shadow;ctx.lineWidth=1.1;
  ctx.fillRect(-3,-5,6,13);ctx.strokeRect(-3,-5,6,13);
  ctx.fillStyle=C.bronze;ctx.fillRect(-9,-7,18,3);
  ctx.fillStyle=C.iron;ctx.strokeStyle=C.shadow;ctx.lineWidth=1.3;
  ctx.beginPath();ctx.moveTo(-4,-7);ctx.quadraticCurveTo(-6,-19,-1,-33);
  ctx.lineTo(3,-40);ctx.quadraticCurveTo(6,-21,5,-7);ctx.closePath();
  ctx.fill();ctx.stroke();
  ctx.strokeStyle=rgba(C.glint,.66);ctx.lineWidth=.8;
  ctx.beginPath();ctx.moveTo(0,-35);ctx.lineTo(1,-9);ctx.stroke();
  for(let i=0;i<4;i++){
    ctx.strokeStyle=rgba(C.rust,.67);ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(-1+i%2*2,-10-i*5);
    ctx.lineTo(2+i%2,-12-i*5);ctx.stroke();
  }
  ctx.restore();
}
function bag(ctx:CanvasRenderingContext2D,seed:number):void{
  const g=ctx.createLinearGradient(-23,-28,-8,-9);
  g.addColorStop(0,C.leatherLight);g.addColorStop(1,C.leather);
  ellipse(ctx,-15,-18,7.3,9,g,-.18);
  ctx.strokeStyle=C.shadow;ctx.lineWidth=1.2;
  ctx.beginPath();ctx.ellipse(-15,-18,7.3,9,-.18,0,TAU);ctx.stroke();
  ctx.strokeStyle=C.bronze;ctx.lineWidth=1;
  for(let i=0;i<6;i++){
    const x=-20+(i%3)*4,y=-23+Math.floor(i/3)*10;
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+2.4,y+2);ctx.stroke();
  }
  ellipse(ctx,-16,-18,2.2,2.2,C.bronze);
  ellipse(ctx,-16.4,-18.4,.8,.7,C.glint);
  // Moedas presas à bolsa, derivadas da identidade e não de RNG.
  for(let i=0;i<4;i++){
    const a=i*1.6+seed*2.3,x=-16+Math.sin(a)*5,y=-9-i%2*2;
    ellipse(ctx,x,y,2.1,1.25,i%2?C.bronze:"#e9bc6b");
    ctx.strokeStyle=C.leather;ctx.lineWidth=.6;
    ctx.beginPath();ctx.moveTo(x-1,y);ctx.lineTo(x+1,y);ctx.stroke();
  }
}
function jewelry(ctx:CanvasRenderingContext2D,seed:number):void{
  ctx.strokeStyle=C.bronze;ctx.lineWidth=1.8;
  ctx.beginPath();ctx.moveTo(-11,-31);ctx.quadraticCurveTo(0,-27,10,-31);ctx.stroke();
  for(let i=0;i<5;i++){
    const x=-8+i*4;
    ellipse(ctx,x,-29.8+(i%2),1,1.6,i%2?C.bronze:C.glint);
  }
  for(const side of [-1,1]){
    ellipse(ctx,side*10,-38,1.8,2.4,C.bronze);
    ellipse(ctx,side*10-.6,-38.7,.6,.6,C.glint);
  }
  if(seed>.6){
    ctx.strokeStyle=rgba(C.iron,.55);ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(-8,-26);ctx.lineTo(-4,-22);ctx.stroke();
  }
}
function sandCloud(ctx:CanvasRenderingContext2D,casting:number,time:number):void{
  const alpha=clamp01(casting);
  if(alpha<=.02)return;
  const g=ctx.createRadialGradient(20,-16,0,20,-16,34);
  g.addColorStop(0,rgba("#e5ca91",.45*alpha));g.addColorStop(1,rgba(C.leatherLight,0));
  ellipse(ctx,20,-16,34,28,g);
  for(let i=0;i<15;i++){
    const t=i/15;
    const x=11+t*42,y=-17+Math.sin(i*2.9+time*1.3)*13*t;
    ellipse(ctx,x,y,1.8+(i%4)*.6,1.4,rgba(i%2?C.linen:C.leatherLight,(1-t)*alpha*.68));
  }
}
function movingCloth(ctx:CanvasRenderingContext2D,phase:number,moving:number):void{
  if(moving<=.02)return;
  for(let k=0;k<9;k++){
    const x=-12+k*3,y=-9;
    const sway=Math.sin(phase+k*.43)*moving*2;
    ctx.strokeStyle=rgba(k%2?C.linen:C.leatherLight,.43);
    ctx.lineWidth=.68;
    ctx.beginPath();ctx.moveTo(x,y);
    ctx.quadraticCurveTo(x+sway,y+4,x+sway*1.3,y+7);ctx.stroke();
  }
}
export function renderSandGoblinDetail(ctx:CanvasRenderingContext2D,actor:DesertCommonVisual,time:number):void{
  const seed=hashString(actor.id??"sand-goblin");
  cloth(ctx,time);turban(ctx);ears(ctx,time);
  bag(ctx,seed);jewelry(ctx,seed);
  face(ctx,seed,time,actor.hp);
  dagger(ctx,time,actor.casting??0);
  movingCloth(ctx,actor.motionPhase??0,clamp01(actor.moving??0));
  sandCloud(ctx,actor.casting??0,time);
}
export const goblin = (ctx:CanvasRenderingContext2D,c:Palette,t:number):void => {
  const linen:Palette={...c,base:"#b6a17e",light:"#f0dec0",dark:"#7b6958"};
  for(const side of [-1,1]){
    line(ctx,side*5,-13,side*9,-1,c,5);
    body(ctx,side*8,-1,6,3.7,c);
    line(ctx,side*9,-30,side*17,-17,c,4);
  }
  body(ctx,0,-23,12,17,linen);
  body(ctx,0,-40,11,11,c);
  // Long ears and pronounced nose give the bandit a readable goblin profile.
  for(const side of [-1,1]){
    ctx.fillStyle=c.base;ctx.strokeStyle=OUTLINE;ctx.lineWidth=1.4;
    ctx.beginPath();ctx.moveTo(side*10,-41);ctx.lineTo(side*21,-47);
    ctx.quadraticCurveTo(side*19,-35,side*10,-35);ctx.closePath();ctx.fill();ctx.stroke();
    ellipse(ctx,side*15,-41,3,1.5,c.accent,side*.1);
  }
  body(ctx,1,-35,6.5,4,c);
  ellipse(ctx,6,-37,5,3,c.light,.2);
  eye(ctx,-4,-43,c,2.1);eye(ctx,5,-43,c,2.1);
  for(const side of [-1,1])tip(ctx,side*4,-33,2,4,GLOW);
  // Wrapped pale turban, folded several times above the green face.
  body(ctx,0,-51,13,8,linen,.08);
  for(let i=0;i<5;i++){
    const y=-56+i*2.4;
    ctx.strokeStyle=i%2?"#a2927b":"#f3e6cf";ctx.lineWidth=2.3;
    ctx.beginPath();ctx.moveTo(-10+i%2*2,y);
    ctx.bezierCurveTo(-4,y-3,5,y+3,10-i%2*2,y);ctx.stroke();
  }
  ctx.fillStyle="#b9aa8e";
  ctx.beginPath();ctx.moveTo(-10,-52);ctx.quadraticCurveTo(-18,-43,-10,-36);
  ctx.lineTo(-7,-38);ctx.lineTo(-5,-51);ctx.closePath();ctx.fill();
  ctx.strokeStyle=OUTLINE;ctx.lineWidth=1.1;ctx.stroke();
  // Short tunic with crossing belt and a stolen copper pouch.
  ctx.strokeStyle="#77543b";ctx.lineWidth=3.7;
  ctx.beginPath();ctx.moveTo(-11,-28);ctx.quadraticCurveTo(0,-23,11,-28);ctx.stroke();
  body(ctx,-14,-19,5.5,7,{...c,base:"#9e7145",light:"#d3a878",dark:"#674d3b"});
  ellipse(ctx,-14,-20,2,2,c.accent);
  for(let i=0;i<5;i++)tip(ctx,-9+i*4,-13,1.6,4,linen.light);
  // Curved rusty dagger: separate curved silhouette and a gold hilt.
  line(ctx,17,-18,25,-27,{...c,base:"#97745c",light:"#c5a481"},2.7);
  ctx.strokeStyle="#b9c0c1";ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(25,-27);ctx.quadraticCurveTo(34,-38+Math.sin(t*1.6),35,-46);
  ctx.quadraticCurveTo(40,-42,37,-34);ctx.stroke();
  ctx.strokeStyle=GLOW;ctx.lineWidth=.9;ctx.stroke();
  freckles(ctx,c,11,0,-22,7,12);
};
