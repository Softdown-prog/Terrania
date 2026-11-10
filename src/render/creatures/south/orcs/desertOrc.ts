/**
 * Orc Nômade do Deserto — volumes de carne, correias, osso, clube de guerra e
 * reação a ferimentos. Materiais não dependem de bitmap nem de horário real.
 */
import type { DesertCommonVisual } from "../../../regionalWave3.ts";
import { clamp01, ellipse, hashString, rgba, TAU } from "../../../draw.ts";
import type { Palette } from "../../shared/southGeometry.ts";
import { body, line, tip, eye, freckles, GLOW } from "../../shared/southGeometry.ts";
const C={
  leather:"#71513d",rawhide:"#ad8258",steel:"#666e69",bone:"#e8d9b6",
  bronze:"#d3aa61",skin:"#89967a",skinLight:"#c4c9a2",skinDark:"#394c40",
  shadow:"#242c2b",wine:"#5d2e40",blood:"#a2554b",glint:"#fff6de",dust:"#bc9a6b",
} as const;
function shoulders(ctx:CanvasRenderingContext2D,time:number):void{
  for(const side of [-1,1]){
    ctx.save();ctx.translate(side*18,-42);ctx.rotate(side*.22);
    const grad=ctx.createLinearGradient(-14,-15,16,12);
    grad.addColorStop(0,C.skinLight);grad.addColorStop(.45,C.skin);grad.addColorStop(1,C.skinDark);
    ellipse(ctx,0,0,12,11,grad);
    ctx.strokeStyle=C.shadow;ctx.lineWidth=1.3;
    ctx.beginPath();ctx.ellipse(0,0,12,11,0,0,TAU);ctx.stroke();
    for(let i=0;i<5;i++){
      ctx.strokeStyle=rgba(i%2?C.skinLight:C.skinDark,.5);
      ctx.lineWidth=.75;
      ctx.beginPath();ctx.moveTo(-8+i*3,-5);
      ctx.quadraticCurveTo(-10+i*3,3+Math.sin(time*.9)*.3,-5+i*3,5);ctx.stroke();
    }
    ctx.restore();
  }
}
function muscle(ctx:CanvasRenderingContext2D,time:number):void{
  const g=ctx.createLinearGradient(-17,-46,18,-17);
  g.addColorStop(0,rgba(C.skinLight,.73));g.addColorStop(.6,rgba(C.skin,.24));
  g.addColorStop(1,rgba(C.skinDark,.45));
  ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,-30,17,17,0,0,TAU);ctx.fill();
  ctx.strokeStyle=rgba(C.skinDark,.55);ctx.lineWidth=1.45;
  for(const side of [-1,1]){
    ctx.beginPath();ctx.moveTo(side*14,-41);
    ctx.quadraticCurveTo(side*5,-32,side*2,-29);ctx.stroke();
    for(let i=0;i<3;i++){
      const y=-27+i*5;
      ctx.beginPath();ctx.moveTo(side*3,y);
      ctx.quadraticCurveTo(side*10,y+2,side*12,y);ctx.stroke();
    }
  }
  const pulse=Math.sin(time*1.2)*.3;
  ellipse(ctx,0,-31+pulse,1.7,6.7,rgba(C.skinDark,.44));
}
function armor(ctx:CanvasRenderingContext2D):void{
  for(const side of [-1,1]){
    ctx.strokeStyle=C.shadow;ctx.lineWidth=5.7;
    ctx.beginPath();ctx.moveTo(side*11,-45);ctx.lineTo(-side*10,-20);ctx.stroke();
    ctx.strokeStyle=C.leather;ctx.lineWidth=4.1;ctx.stroke();
    ctx.strokeStyle=rgba(C.bronze,.85);ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(side*9,-43);ctx.lineTo(-side*8,-22);ctx.stroke();
    for(let k=0;k<4;k++){
      const t=k/3,x=side*(10-18*t),y=-43+20*t;
      ellipse(ctx,x,y,1.25,1.25,C.bronze);
      ellipse(ctx,x-.4,y-.5,.5,.4,C.glint);
    }
  }
  for(let i=0;i<7;i++){
    const x=-20+i*6,y=-48-(i%3)*2;
    ctx.fillStyle=C.bone;ctx.strokeStyle=C.shadow;ctx.lineWidth=.8;
    ctx.beginPath();ctx.moveTo(x-2.5,y+5);ctx.lineTo(x-.6,y-5-(i%3));
    ctx.lineTo(x+3.2,y+5);ctx.closePath();ctx.fill();ctx.stroke();
  }
  ctx.fillStyle=C.leather;ctx.strokeStyle=C.shadow;ctx.lineWidth=1.3;
  ctx.beginPath();ctx.moveTo(-17,-22);ctx.lineTo(17,-22);ctx.lineTo(16,-15);
  ctx.lineTo(-15,-15);ctx.closePath();ctx.fill();ctx.stroke();
  for(let i=0;i<5;i++){
    const x=-12+i*6;
    ellipse(ctx,x,-18,1.2,1.2,C.bronze);
  }
}
function face(ctx:CanvasRenderingContext2D,seed:number,time:number,hp:number):void{
  const blink=Math.sin(time*.88+seed*13)>.994;
  for(const side of [-1,1]){
    const eyeX=side*6;
    ellipse(ctx,eyeX,-56,3.1,blink?.65:2.1,C.shadow);
    if(!blink){
      ellipse(ctx,eyeX-.3,-56.3,1.55,1.45,C.bronze);
      ellipse(ctx,eyeX-.7,-56.9,.54,.58,C.glint);
    }
    ctx.strokeStyle=C.skinDark;ctx.lineWidth=2.9;
    ctx.beginPath();ctx.moveTo(eyeX-side*2,-61);
    ctx.quadraticCurveTo(eyeX,-63,eyeX+side*4,-59);ctx.stroke();
    ctx.fillStyle=C.bone;ctx.strokeStyle=C.shadow;ctx.lineWidth=.9;
    ctx.beginPath();ctx.moveTo(side*9,-47);
    ctx.lineTo(side*10,-39);
    ctx.lineTo(side*6,-46);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.strokeStyle=rgba(C.glint,.72);ctx.lineWidth=.7;
    ctx.beginPath();ctx.moveTo(side*9,-45);ctx.lineTo(side*9,-42);ctx.stroke();
  }
  ellipse(ctx,0,-47,9,3.8,C.skinDark);
  for(let i=0;i<5;i++){
    ellipse(ctx,-6+i*3,-47,1.4,1,C.shadow);
  }
  ctx.strokeStyle=C.shadow;ctx.lineWidth=1.7;
  ctx.beginPath();ctx.moveTo(-8,-44);ctx.quadraticCurveTo(0,-41,8,-44);ctx.stroke();
  if(hp<55){
    ctx.strokeStyle=C.blood;ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(-9,-60);ctx.lineTo(-6,-55);ctx.lineTo(-9,-49);ctx.stroke();
    ellipse(ctx,-8,-49,1.5,2.3,C.blood);
  }
}
function club(ctx:CanvasRenderingContext2D,time:number,casting:number):void{
  const windup=clamp01(casting),lift=windup*7;
  ctx.save();ctx.translate(29,-61-lift);ctx.rotate(windup*.23+Math.sin(time*.8)*.01);
  ctx.strokeStyle=C.shadow;ctx.lineWidth=7;
  ctx.beginPath();ctx.moveTo(0,40);ctx.lineTo(0,0);ctx.stroke();
  ctx.strokeStyle=C.rawhide;ctx.lineWidth=4.5;ctx.stroke();
  for(let i=0;i<8;i++){
    ctx.strokeStyle=i%2?C.bronze:C.leather;ctx.lineWidth=1.6;
    ctx.beginPath();ctx.moveTo(-2,34-i*3.1);ctx.lineTo(3,31-i*3.1);ctx.stroke();
  }
  const g=ctx.createLinearGradient(-9,-20,9,8);
  g.addColorStop(0,C.bone);g.addColorStop(.53,"#c8b79a");g.addColorStop(1,"#867965");
  ellipse(ctx,0,-5,10,13,g,-.14);
  ctx.strokeStyle=C.shadow;ctx.lineWidth=1.5;
  ctx.beginPath();ctx.ellipse(0,-5,10,13,-.14,0,TAU);ctx.stroke();
  for(let i=0;i<12;i++){
    const a=TAU*i/12,x=Math.cos(a)*9,y=-5+Math.sin(a)*12;
    ctx.fillStyle=i%2?C.bone:C.bronze;ctx.beginPath();
    ctx.moveTo(x-2,y);ctx.lineTo(x,y-5.7);ctx.lineTo(x+2,y);
    ctx.closePath();ctx.fill();
  }
  ctx.strokeStyle=C.skinDark;ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(-2,-14);ctx.lineTo(3,-6);
  ctx.lineTo(0,4);ctx.stroke();
  ctx.strokeStyle=rgba(C.glint,.7);ctx.lineWidth=.8;
  ctx.beginPath();ctx.moveTo(-5,-13);ctx.quadraticCurveTo(-8,-5,-6,3);ctx.stroke();
  ctx.restore();
}
function scars(ctx:CanvasRenderingContext2D,seed:number):void{
  for(let i=0;i<3;i++){
    const y=-39+i*7,x=-12+(i%2)*18;
    ctx.strokeStyle=rgba(i===0?C.blood:C.skinDark,.65);
    ctx.lineWidth=1+i%2*.5;ctx.beginPath();
    ctx.moveTo(x-2,y-3);ctx.lineTo(x+3,y);
    ctx.lineTo(x,y+4);ctx.stroke();
    if(seed>.45){
      ctx.strokeStyle=rgba(C.skinLight,.43);ctx.lineWidth=.65;
      ctx.beginPath();ctx.moveTo(x-1,y-3);ctx.lineTo(x+4,y);ctx.stroke();
    }
  }
}
function dust(ctx:CanvasRenderingContext2D,moving:number,phase:number):void{
  if(moving<=.05)return;
  for(let i=0;i<16;i++){
    const t=i/16,x=-24+48*t,y=Math.sin(phase+i*1.47)*3+1;
    ellipse(ctx,x,y,1+i%3*.5,.6+i%2*.3,rgba(C.dust,(1-t)*moving*.48));
  }
}
function warCry(ctx:CanvasRenderingContext2D,casting:number,time:number):void{
  if(casting<=.02)return;
  const a=clamp01(casting);
  ctx.strokeStyle=rgba(C.wine,a*.66);ctx.lineWidth=1.4;
  for(let i=0;i<4;i++){
    const x=sideX(i);
    ctx.beginPath();ctx.moveTo(x,-56);
    ctx.quadraticCurveTo(x+(i%2?4:-4),-65+Math.sin(time*2+i),x,-72);ctx.stroke();
  }
}
function sideX(i:number):number{return i%2===0?-17-i*2:17+i*2;}
export function renderDesertOrcDetail(ctx:CanvasRenderingContext2D,actor:DesertCommonVisual,time:number):void{
  const seed=hashString(actor.id??"desert-orc");
  shoulders(ctx,time);muscle(ctx,time);armor(ctx);
  scars(ctx,seed);face(ctx,seed,time,actor.hp);
  club(ctx,time,actor.casting??0);
  dust(ctx,clamp01(actor.moving??0),actor.motionPhase??0);
  warCry(ctx,actor.casting??0,time);
}
export const orc = (ctx:CanvasRenderingContext2D,c:Palette,t:number):void => {
  for(const s of [-1,1]){
    line(ctx,s*9,-14,s*11,0,c,8);
    line(ctx,s*13,-36,s*21,-17,c,7);
    body(ctx,s*20,-17,6,6,c);
  }
  body(ctx,0,-31,18,20,c);
  // Tribal harness crossing a muscular olive torso; shoulder bone plate.
  ctx.strokeStyle="#624c3e";ctx.lineWidth=5;
  ctx.beginPath();ctx.moveTo(-13,-44);ctx.lineTo(13,-21);
  ctx.moveTo(13,-43);ctx.lineTo(-12,-22);ctx.stroke();
  ctx.strokeStyle="#b09a73";ctx.lineWidth=1.7;
  ctx.beginPath();ctx.moveTo(-12,-42);ctx.lineTo(9,-24);ctx.stroke();
  for(let i=0;i<4;i++)tip(ctx,-18+i*4,-46+i%2*2,3.2,6,"#e2d6bd");
  body(ctx,0,-54,15,12,c);
  body(ctx,0,-47,10,5,c);
  eye(ctx,-6,-57,c,2.1);eye(ctx,6,-57,c,2.1);
  for(const s of [-1,1])tip(ctx,s*7,-45,3,7,c.light);
  body(ctx,0,-22,15,5,{...c,base:c.extra,light:c.accent});
  ctx.strokeStyle=c.dark;ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(-10,-30);ctx.lineTo(12,-31);ctx.stroke();
  line(ctx,23,-22,29,-61,{...c,base:c.extra,light:c.accent},4);
  // Bone-knobbed desert club, matching the pale weapon in the reference.
  body(ctx,29,-63,8,9,{...c,base:"#dad1b5",light:"#f5edd4",dark:"#a89b80"});
  for(const side of [-1,1]){
    ellipse(ctx,29+side*7,-68,4,3,"#e9ddc4");
    tip(ctx,29+side*8,-68,3.5,5,"#fff4dc");
  }
  freckles(ctx,c,16,0,-33,13,12);
  ellipse(ctx,-10,-27,2,2,c.accent);
  ellipse(ctx,10,-27,2,2,c.accent);
  ellipse(ctx,0,-23,2.5,1.3,rgba(GLOW,.4+Math.sin(t)*.1));
};

/** Paleta, anatomia e detalhes visuais desta espécie. */
import { renderWave3Frame } from "../../shared/wave3Frame.ts";
import type { RegionalCreatureVisual } from "../../../regionalCreatures.ts";
const CREATURE_PALETTE: Palette = {"base":"#718063","light":"#bec09c","dark":"#36453d","accent":"#b39362","eye":"#f1c76d","extra":"#745243"};
export function renderDesertOrcCreature(ctx:CanvasRenderingContext2D,actor:RegionalCreatureVisual,
  sx:number,sy:number,time=0):void {
  renderWave3Frame(ctx,actor,sx,sy,time,CREATURE_PALETTE,(surface, colors, t) => { orc(surface,colors,t,24); renderDesertOrcDetail(surface,{...actor,kind:"desert-orc"},t); });
}
