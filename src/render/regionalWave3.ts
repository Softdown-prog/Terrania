import { CREATURE_CATALOG, type SouthCommonKind } from "../actors/CreatureCatalog.ts";
import { clamp01, ellipse, hashString, mix, pill, rgba, shade, softShadow, TAU } from "./draw.ts";

type Palette={base:string;light:string;dark:string;accent:string;eye:string;extra:string};
export interface DesertCommonVisual {
  readonly kind:SouthCommonKind;
  readonly hp:number;
  readonly hurtTime?:number;
  readonly casting?:number;
  readonly id?:string;
}
const C:Readonly<Record<SouthCommonKind,Palette>>={
  "dune-rat":{base:"#98836b",light:"#ded3ae",dark:"#574c43",accent:"#b87871",eye:"#dfb55c",extra:"#c5aa93"},
  "sand-goblin":{base:"#79935e",light:"#c7d19b",dark:"#4c6844",accent:"#c08b52",eye:"#ffdc6f",extra:"#805e4d"},
  "desert-orc":{base:"#718063",light:"#bec09c",dark:"#36453d",accent:"#b39362",eye:"#f1c76d",extra:"#745243"},
  "clay-troll":{base:"#ac8864",light:"#d7b88e",dark:"#6e5643",accent:"#c79972",eye:"#eac778",extra:"#857c64"},
  "dune-scout":{base:"#b59374",light:"#ecd0a2",dark:"#6c5547",accent:"#e3ad64",eye:"#e5cc91",extra:"#718963"},
  "oasis-elf":{base:"#5d9481",light:"#b6d7b0",dark:"#345c4e",accent:"#dcbb71",eye:"#ddf2b8",extra:"#6b9e63"},
  "mirage-imp":{base:"#aa6fca",light:"#f3bee0",dark:"#5a4787",accent:"#ffce7c",eye:"#fff0b2",extra:"#f6a0a1"},
  "horned-viper":{base:"#ac915c",light:"#d8c498",dark:"#635d4b",accent:"#c68e54",eye:"#efcc6c",extra:"#8a8f4a"},
  "carrion-vulture":{base:"#81706c",light:"#c6b0a2",dark:"#3c3d48",accent:"#caaa64",eye:"#ffd777",extra:"#8f625a"},
  "cactus-sprout":{base:"#428f64",light:"#9ddb92",dark:"#24694f",accent:"#df99b4",eye:"#f9e2a3",extra:"#f3d47e"},
};
const OUTLINE="#252a2a",GLOW="#fff5d7";
function body(ctx:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,c:Palette,rotation=0):void {
  const g=ctx.createLinearGradient(x-rx,y-ry,x+rx,y+ry);
  g.addColorStop(0,c.light);g.addColorStop(.45,c.base);g.addColorStop(1,c.dark);
  ellipse(ctx,x,y,rx,ry,g,rotation);
  ctx.beginPath();ctx.ellipse(x,y,rx,ry,rotation,0,TAU);
  ctx.strokeStyle=OUTLINE;ctx.lineWidth=1.4;ctx.stroke();
  ctx.strokeStyle=rgba(GLOW,.42);ctx.lineWidth=.8;
  ctx.beginPath();ctx.ellipse(x-.6,y-1,Math.max(1,rx-1.8),Math.max(1,ry-1.8),
    rotation,Math.PI*1.02,Math.PI*1.8);ctx.stroke();
}
function line(ctx:CanvasRenderingContext2D,x:number,y:number,x2:number,y2:number,c:Palette,width=4):void {
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);
  ctx.lineCap="round";ctx.strokeStyle=OUTLINE;ctx.lineWidth=width+2.2;ctx.stroke();
  ctx.strokeStyle=c.base;ctx.lineWidth=width;ctx.stroke();
  ellipse(ctx,x2,y2,width*.47,width*.48,c.light);
}
function tip(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,h:number,color:string):void {
  ctx.fillStyle=OUTLINE;
  ctx.beginPath();ctx.moveTo(x-r,y);ctx.lineTo(x,y-h);ctx.lineTo(x+r,y);
  ctx.closePath();ctx.fill();
  ctx.fillStyle=color;
  ctx.beginPath();ctx.moveTo(x-r+1,y-1);ctx.lineTo(x,y-h+2);ctx.lineTo(x+.6,y-1);ctx.closePath();ctx.fill();
  ctx.strokeStyle=rgba(GLOW,.65);ctx.lineWidth=.8;
  ctx.beginPath();ctx.moveTo(x-r*.5,y-2);ctx.lineTo(x,y-h+2);ctx.stroke();
}
function eye(ctx:CanvasRenderingContext2D,x:number,y:number,c:Palette,size=1.8):void {
  ellipse(ctx,x,y,size+.8,size*.85,OUTLINE);
  ellipse(ctx,x,y-.25,size,size*.67,c.eye);
  ellipse(ctx,x-.4,y-.7,.5,.36,GLOW);
}
function freckles(ctx:CanvasRenderingContext2D,c:Palette,count:number,x=0,y=-17,rx=15,ry=11):void {
  for(let i=0;i<count;i++){
    const a=i*2.399963,rad=Math.sqrt((i+.5)/count);
    const px=x+Math.cos(a)*rx*rad,py=y+Math.sin(a)*ry*rad;
    ellipse(ctx,px,py,1.1+i%3*.28,.6+i%2*.3,
      i%4===0?c.accent:i%3===0?shade(c.light,-.24):c.extra,a);
    ellipse(ctx,px-.4,py-.5,.45,.25,rgba(GLOW,.57));
  }
}
function rat(ctx:CanvasRenderingContext2D,c:Palette,t:number):void {
  ctx.strokeStyle=OUTLINE;ctx.lineWidth=5;ctx.lineCap="round";
  ctx.beginPath();ctx.moveTo(9,-10);ctx.bezierCurveTo(23,-6,26,-27,34+Math.sin(t*2)*2,-18);ctx.stroke();
  ctx.strokeStyle=c.accent;ctx.lineWidth=2.7;ctx.stroke();
  for(const x of [-9,7]){
    line(ctx,x,-10,x-4,-2,c,3);
    line(ctx,x+2,-9,x+8,-1,c,3);
  }
  body(ctx,-1,-14,16,10,c);
  body(ctx,-13,-19,10,8,c);
  for(const x of [-20,-8]){
    body(ctx,x,-26,5,6,{...c,base:c.accent,light:c.light,dark:c.dark});
    ellipse(ctx,x,-26,2.5,3,c.accent);
  }
  eye(ctx,-17,-21,c,1.8);
  ellipse(ctx,-23,-16,2,1.5,c.accent);
  for(const dir of [-1,1]){
    ctx.strokeStyle=rgba(c.light,.9);ctx.lineWidth=.8;
    ctx.beginPath();ctx.moveTo(-23,-15);ctx.quadraticCurveTo(-30,-15+dir*5,-34,-15+dir*4);ctx.stroke();
  }
  freckles(ctx,c,14,-2,-14,10,7);
}
function goblin(ctx:CanvasRenderingContext2D,c:Palette,t:number):void {
  for(const s of [-1,1]){
    line(ctx,s*6,-11,s*8,0,c,5);
    line(ctx,s*9,-29,s*15,-14,c,4);
  }
  body(ctx,0,-23,12,16,c);
  body(ctx,0,-42,11,9,c);
  for(const s of [-1,1])tip(ctx,s*13,-43,6,9,c.dark);
  body(ctx,0,-31,11,4,{...c,base:c.extra,light:c.accent,dark:c.dark});
  eye(ctx,-5,-44,c,2);eye(ctx,5,-44,c,2);
  for(const s of [-1,1])tip(ctx,s*4,-35,2.3,4,c.light);
  ctx.strokeStyle=c.accent;ctx.lineWidth=4;
  ctx.beginPath();ctx.moveTo(-10,-25);ctx.quadraticCurveTo(-3,-16,9,-26);ctx.stroke();
  // Rusty dagger and stolen pouch.
  line(ctx,18,-16,25,-6,{...c,base:c.extra},2);
  tip(ctx,25,-6,4,11,c.light);
  body(ctx,-15,-18,6,7,c);
  freckles(ctx,c,14,0,-23,8,11);
  ellipse(ctx,0,-20,2+Math.sin(t*2)*.4,1.1,c.accent);
}
function orc(ctx:CanvasRenderingContext2D,c:Palette,t:number):void {
  for(const s of [-1,1]){
    line(ctx,s*9,-14,s*11,0,c,8);
    line(ctx,s*13,-36,s*21,-17,c,7);
    body(ctx,s*20,-17,6,6,c);
  }
  body(ctx,0,-31,18,20,c);
  body(ctx,0,-54,15,12,c);
  body(ctx,0,-47,10,5,c);
  eye(ctx,-6,-57,c,2.1);eye(ctx,6,-57,c,2.1);
  for(const s of [-1,1])tip(ctx,s*7,-45,3,7,c.light);
  body(ctx,0,-22,15,5,{...c,base:c.extra,light:c.accent});
  ctx.strokeStyle=c.dark;ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(-10,-30);ctx.lineTo(12,-31);ctx.stroke();
  line(ctx,23,-22,29,-61,{...c,base:c.extra,light:c.accent},4);
  body(ctx,29,-63,8,9,{...c,base:c.extra});
  freckles(ctx,c,16,0,-33,13,12);
  ellipse(ctx,-10,-27,2,2,c.accent);
  ellipse(ctx,10,-27,2,2,c.accent);
  ellipse(ctx,0,-23,2.5,1.3,rgba(GLOW,.4+Math.sin(t)*.1));
}
function troll(ctx:CanvasRenderingContext2D,c:Palette,t:number):void {
  for(const s of [-1,1]){
    line(ctx,s*12,-15,s*15,0,c,11);
    line(ctx,s*18,-38,s*29,-15,c,9);
    body(ctx,s*29,-15,8,8,c);
  }
  body(ctx,0,-29,22,25,c);
  body(ctx,0,-54,18,15,c);
  body(ctx,0,-45,12,8,{...c,base:c.dark});
  eye(ctx,-7,-56,c,2.4);eye(ctx,7,-56,c,2.4);
  for(const s of [-1,1])tip(ctx,s*14,-59,6,8,c.extra);
  for(let i=0;i<7;i++)tip(ctx,-18+i*6,-33+i%3*3,3,7,c.dark);
  line(ctx,30,-15,34,-49,{...c,base:c.extra,light:c.accent},5);
  body(ctx,34,-51,11,7,{...c,base:c.extra});
  freckles(ctx,c,19,0,-32,17,18);
  ellipse(ctx,0,-42,3+Math.sin(t)*.3,1.5,c.accent);
}
function scout(ctx:CanvasRenderingContext2D,c:Palette,t:number):void {
  for(const s of [-1,1]){
    line(ctx,s*4,-10,s*8,-1,c,4);
    line(ctx,s*7,-27,s*16,-16,c,3.5);
  }
  body(ctx,0,-21,10,15,{...c,base:c.extra});
  body(ctx,0,-39,10,9,c);
  ctx.strokeStyle=OUTLINE;ctx.lineWidth=3.5;
  ctx.beginPath();ctx.arc(0,-43,12,Math.PI,TAU);ctx.stroke();
  tip(ctx,0,-40,12,21,c.accent);
  body(ctx,-12,-22,6,8,c);
  eye(ctx,-4,-41,c,1.6);eye(ctx,4,-41,c,1.6);
  ctx.strokeStyle=c.extra;ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(18,-18);ctx.lineTo(26,-31+Math.sin(t)*1.5);
  ctx.lineTo(31,-18);ctx.stroke();
  ctx.strokeStyle=c.accent;ctx.lineWidth=.9;
  ctx.beginPath();ctx.moveTo(26,-31);ctx.lineTo(27,-18);ctx.stroke();
  ellipse(ctx,27,-22,2,2,c.light);
  freckles(ctx,c,15,0,-19,7,9);
}
function elf(ctx:CanvasRenderingContext2D,c:Palette,t:number):void {
  for(const s of [-1,1]){
    line(ctx,s*6,-11,s*9,-1,c,5);
    line(ctx,s*10,-34,s*18,-17,c,4);
  }
  body(ctx,0,-28,12,19,c);
  body(ctx,0,-49,10,10,c);
  for(const s of [-1,1]){
    tip(ctx,s*13,-50,7,8,c.light);
    body(ctx,s*12,-36,6,4,{...c,base:c.extra});
  }
  eye(ctx,-5,-51,c,1.9);eye(ctx,5,-51,c,1.9);
  for(let i=0;i<6;i++){
    ctx.strokeStyle=i%2?c.accent:c.extra;ctx.lineWidth=1.8;
    ctx.beginPath();ctx.moveTo(-10+i*4,-34);
    ctx.lineTo(-13+i*4,-16);ctx.stroke();
  }
  line(ctx,22,-11,24,-70,{...c,base:c.extra},2.8);
  tip(ctx,24,-64,5,17,c.accent);
  body(ctx,0,-42,8,4,{...c,base:c.extra});
  freckles(ctx,c,12,0,-29,9,12);
  ellipse(ctx,24,-70,2,2,rgba(GLOW,.62+Math.sin(t*2)*.16));
}
function imp(ctx:CanvasRenderingContext2D,c:Palette,t:number):void {
  const hover=Math.sin(t*2)*2;
  for(const s of [-1,1]){
    ctx.fillStyle=c.dark;ctx.strokeStyle=OUTLINE;ctx.lineWidth=1.4;
    ctx.beginPath();ctx.moveTo(s*8,-31+hover);
    ctx.quadraticCurveTo(s*30,-48+hover,s*24,-24+hover);
    ctx.lineTo(s*19,-27+hover);ctx.lineTo(s*17,-16+hover);ctx.closePath();ctx.fill();ctx.stroke();
    line(ctx,s*7,-11+hover,s*12,-7+hover,c,3);
    tip(ctx,s*9,-40+hover,4,10,c.accent);
  }
  body(ctx,0,-25+hover,13,16,c);
  body(ctx,0,-41+hover,10,10,c);
  eye(ctx,-5,-42+hover,c,2.1);eye(ctx,5,-42+hover,c,2.1);
  for(let i=0;i<7;i++){
    const a=i*2.2+t*.8;
    const x=Math.cos(a)*20,y=-27+Math.sin(a)*16+hover;
    tip(ctx,x,y,3,5,i%2?c.accent:c.extra);
    ellipse(ctx,x,y-6,1.5,1.3,rgba(GLOW,.76));
  }
  freckles(ctx,c,16,0,-26+hover,8,11);
}
function viper(ctx:CanvasRenderingContext2D,c:Palette,t:number):void {
  ctx.strokeStyle=OUTLINE;ctx.lineWidth=15;ctx.lineCap="round";
  ctx.beginPath();ctx.moveTo(-20,-5);ctx.bezierCurveTo(-13,-29,27,-1,12,-26);
  ctx.bezierCurveTo(8,-37,-12,-29,-8,-38);ctx.stroke();
  ctx.strokeStyle=c.base;ctx.lineWidth=11;ctx.stroke();
  ctx.strokeStyle=c.light;ctx.lineWidth=2;ctx.stroke();
  body(ctx,-8,-41,12,8,c,.1);
  for(const s of [-1,1])tip(ctx,-8+s*7,-46,3.4,10,c.dark);
  eye(ctx,-14,-42,c,1.7);eye(ctx,-5,-42,c,1.7);
  ctx.strokeStyle=c.accent;ctx.lineWidth=1.3;
  ctx.beginPath();ctx.moveTo(-16,-38);ctx.quadraticCurveTo(-22,-35+Math.sin(t*3)*2,-26,-38);ctx.stroke();
  for(let i=0;i<12;i++){
    const a=i*1.3,x=Math.sin(a)*13,y=-8-Math.abs(Math.cos(a))*19;
    ellipse(ctx,x,y,2.6,1.1,i%2?c.extra:c.dark,a);
  }
  freckles(ctx,c,12,-7,-37,8,5);
}
function vulture(ctx:CanvasRenderingContext2D,c:Palette,t:number):void {
  for(const s of [-1,1]){
    ctx.fillStyle=c.dark;ctx.strokeStyle=OUTLINE;ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(s*4,-29);
    ctx.bezierCurveTo(s*20,-60+Math.sin(t*1.8)*2,s*43,-43,s*42,-28);
    ctx.lineTo(s*32,-32);ctx.lineTo(s*22,-19);ctx.lineTo(s*15,-24);
    ctx.closePath();ctx.fill();ctx.stroke();
    for(let i=0;i<5;i++)tip(ctx,s*(20+i*5),-31-i%3*4,3.5,7,c.light);
    line(ctx,s*5,-8,s*11,0,c,4);
  }
  body(ctx,0,-27,14,17,c);
  body(ctx,4,-46,10,11,{...c,base:c.light});
  body(ctx,10,-45,5,5,c);
  ctx.fillStyle=c.accent;ctx.beginPath();ctx.moveTo(13,-45);ctx.lineTo(24,-41);ctx.lineTo(17,-35);ctx.closePath();ctx.fill();
  eye(ctx,7,-49,c,2.3);
  for(let i=0;i<5;i++)tip(ctx,-10+i*4,-38+i%2*3,3,6,c.light);
  freckles(ctx,c,14,0,-27,10,12);
}
function cactus(ctx:CanvasRenderingContext2D,c:Palette,t:number):void {
  for(const s of [-1,1]){
    line(ctx,s*11,-13,s*12,-3,c,5);
    line(ctx,s*13,-22,s*23,-30,c,7);
    body(ctx,s*23,-32,6,10,c);
    for(let j=0;j<3;j++)tip(ctx,s*(19+j*4),-39+j%2*4,2.4,7,c.light);
  }
  body(ctx,0,-24,14,22,c);
  body(ctx,0,-43,11,8,c);
  eye(ctx,-5,-40,c,1.9);eye(ctx,5,-40,c,1.9);
  ctx.strokeStyle=c.dark;ctx.lineWidth=1.7;
  for(let i=-1;i<=1;i++){
    ctx.beginPath();ctx.moveTo(i*6,-38);ctx.lineTo(i*6,-9);ctx.stroke();
  }
  for(let i=0;i<11;i++){
    const a=i*2.4,x=Math.sin(a)*13,y=-23+Math.cos(a)*16;
    tip(ctx,x,y,2.1,5,c.light);
  }
  body(ctx,0,-52,5+Math.sin(t*2)*.2,5,{...c,base:c.accent,light:GLOW,dark:c.extra});
  for(let i=0;i<6;i++){
    const a=i*TAU/6;
    ellipse(ctx,Math.cos(a)*6,-52+Math.sin(a)*5,2.6,2,c.accent,a);
  }
  freckles(ctx,c,14,0,-25,8,12);
}

/** Source is text-defined anatomy, not a supplied sprite sheet. Every species
 * is a unique layered Canvas drawing; no PNG or texture dependencies.
 */
export function renderWave3Creature(ctx:CanvasRenderingContext2D,
 actor:DesertCommonVisual,sx:number,sy:number,time=0):void{
  const c=C[actor.kind],seed=hashString(actor.id??actor.kind);
  ctx.save();ctx.translate(sx,sy);
  softShadow(ctx,0,3,actor.kind==="clay-troll"||actor.kind==="desert-orc"?24:16,5,.3);
  ctx.translate(0,Math.sin(time*2.4+seed*TAU)*.65);
  switch(actor.kind){
    case "dune-rat":rat(ctx,c,time);break;
    case "sand-goblin":goblin(ctx,c,time);break;
    case "desert-orc":orc(ctx,c,time);break;
    case "clay-troll":troll(ctx,c,time);break;
    case "dune-scout":scout(ctx,c,time);break;
    case "oasis-elf":elf(ctx,c,time);break;
    case "mirage-imp":imp(ctx,c,time);break;
    case "horned-viper":viper(ctx,c,time);break;
    case "carrion-vulture":vulture(ctx,c,time);break;
    case "cactus-sprout":cactus(ctx,c,time);break;
  }
  // Stable micro-highlights supply material structure even on the smallest actors.
  for(let i=0;i<13;i++){
    const x=Math.sin(i*9.31+seed*7)*11,y=-12-Math.abs(Math.cos(i*5.71+seed))*19;
    ellipse(ctx,x,y,1+i%3*.25,.55,rgba(i%2?c.accent:c.light,.64));
    ellipse(ctx,x-.4,y-.4,.42,.3,rgba(GLOW,.62));
  }
  if((actor.hurtTime??0)>0)
    ellipse(ctx,0,-24,19,22,rgba(GLOW,clamp01((actor.hurtTime??0)/.3)*.22));
  if((actor.casting??0)>0){
    ctx.strokeStyle=rgba(c.accent,.44+clamp01(actor.casting??0)*.5);
    ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-23,20,0,TAU);ctx.stroke();
  }
  ctx.restore();
  const max=CREATURE_CATALOG[actor.kind].maxHp;
  if(actor.hp<max){
    const f=clamp01(actor.hp/max);
    ctx.save();ctx.translate(sx,sy);
    ctx.fillStyle=rgba(OUTLINE,.87);pill(ctx,-17,-66,34,6);ctx.fill();
    ctx.fillStyle=mix("#cb5e44","#a6e08f",f);pill(ctx,-15,-64.7,30*f,3);ctx.fill();
    ctx.strokeStyle=rgba(GLOW,.7);ctx.lineWidth=.7;ctx.strokeRect(-15,-64.7,30*f,1);
    ctx.restore();
  }
}
