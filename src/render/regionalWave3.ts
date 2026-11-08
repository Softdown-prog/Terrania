import { CREATURE_CATALOG, type ThirdWaveKind } from "../actors/CreatureCatalog.ts";
import { clamp01, ellipse, hashString, limb, mix, pill, rgba, softShadow, TAU } from "./draw.ts";

/** Sprite-sheet 21–30 translated into original Canvas 2D geometry, never a texture. */
export interface Wave3Visual {
  readonly kind: ThirdWaveKind;
  readonly hp: number;
  readonly id?: string;
  readonly hurtTime?: number;
  readonly casting?: number;
}
type Ramp = Readonly<{ base:string; light:string; dark:string; accent:string; eye:string }>;
const PAL: Record<ThirdWaveKind,Ramp> = {
  "dune-rat": {base:"#b79369",light:"#e3c995",dark:"#574434",accent:"#d6a180",eye:"#211d22"},
  "sand-goblin": {base:"#6b9153",light:"#b4cc7a",dark:"#3a5741",accent:"#d5b38c",eye:"#e8c354"},
  "nomad-orc": {base:"#78784c",light:"#b4aa74",dark:"#4c4b37",accent:"#b89b73",eye:"#e9d39a"},
  "dry-clay-troll": {base:"#98734c",light:"#d0ab78",dark:"#503c33",accent:"#b88355",eye:"#f7b670"},
  "dune-halfling": {base:"#a98c64",light:"#e8cc96",dark:"#65543c",accent:"#c69c75",eye:"#4f3b29"},
  "oasis-ranger": {base:"#c4b38a",light:"#f2e5c8",dark:"#705d49",accent:"#8a9a73",eye:"#5c674c"},
  "mirage-imp": {base:"#f5aa39",light:"#fff6ba",dark:"#aa552a",accent:"#ffdc63",eye:"#fffadc"},
  "horned-viper": {base:"#ab874a",light:"#dfc487",dark:"#634d35",accent:"#b8985f",eye:"#edb75e"},
  "southern-vulture": {base:"#5e5553",light:"#a9a0a0",dark:"#302e35",accent:"#d69685",eye:"#e8d5ab"},
  "animated-cactus": {base:"#6aaf59",light:"#bbe07a",dark:"#336b4a",accent:"#e5aa49",eye:"#303d3b"},
};
const OUTLINE="#25232b", HIGHLIGHT="#fff9da";
function mass(ctx:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,c:Ramp,turn=0):void{
  const g=ctx.createLinearGradient(x-rx,y-ry,x+rx,y+ry);
  g.addColorStop(0,c.light);g.addColorStop(.5,c.base);g.addColorStop(1,c.dark);
  ellipse(ctx,x,y,rx,ry,g,turn);
  ctx.strokeStyle=OUTLINE;ctx.lineWidth=1.5;ctx.beginPath();
  ctx.ellipse(x,y,rx,ry,turn,0,TAU);ctx.stroke();
  ctx.strokeStyle=rgba(HIGHLIGHT,.38);ctx.lineWidth=.8;ctx.beginPath();
  ctx.ellipse(x-1,y-1,Math.max(1,rx-2),Math.max(1,ry-2),turn,Math.PI,Math.PI*1.8);ctx.stroke();
}
function stroke(ctx:CanvasRenderingContext2D,pts:readonly (readonly [number,number])[],
  color:string,w:number):void{
  ctx.lineCap="round";ctx.lineJoin="round";
  for(let layer=0;layer<2;layer++){
    ctx.strokeStyle=layer?color:OUTLINE;ctx.lineWidth=w+(layer?0:2.8);
    ctx.beginPath();ctx.moveTo(pts[0]![0],pts[0]![1]);
    for(const [x,y] of pts.slice(1))ctx.lineTo(x,y);ctx.stroke();
  }
}
function eye(ctx:CanvasRenderingContext2D,x:number,y:number,c:Ramp,r=2):void{
  ellipse(ctx,x,y,r+.6,r+.25,OUTLINE);
  ellipse(ctx,x,y-.3,r,r*.6,c.eye);
  ellipse(ctx,x-.5,y-.65,.65,.45,HIGHLIGHT);
}
function triangle(ctx:CanvasRenderingContext2D,
  points: readonly [number,number,number,number,number,number],fill:string):void{
  ctx.beginPath();ctx.moveTo(points[0],points[1]);
  ctx.lineTo(points[2],points[3]);ctx.lineTo(points[4],points[5]);ctx.closePath();
  ctx.fillStyle=fill;ctx.strokeStyle=OUTLINE;ctx.lineWidth=1.1;ctx.fill();ctx.stroke();
}
function grain(ctx:CanvasRenderingContext2D,c:Ramp,seed:number,
  n:number,rx=16,ry=12,y=-26):void{
  for(let i=0;i<n;i++){
    const angle=i*2.39996+seed*TAU;
    const r=Math.sqrt((i+.6)/(n+1)),x=Math.cos(angle)*rx*r,dy=Math.sin(angle)*ry*r+y;
    ellipse(ctx,x,dy,.8+i%3*.33,.6+i%2*.3,i%3?c.dark:c.accent,angle);
    ellipse(ctx,x-.4,dy-.5,.5,.3,rgba(HIGHLIGHT,.6));
  }
}
function duneRat(ctx:CanvasRenderingContext2D,c:Ramp,t:number,seed:number):void{
  ctx.strokeStyle=OUTLINE;ctx.lineWidth=5;ctx.beginPath();
  ctx.moveTo(-25,-16);ctx.bezierCurveTo(-42,-16,-36,-2,-46,-2+Math.sin(t*3)*3);ctx.stroke();
  ctx.strokeStyle=c.accent;ctx.lineWidth=2.7;ctx.stroke();
  for(const s of [-1,1]){
    stroke(ctx,[[s*13,-13],[s*16,-3],[s*23,0]],c.dark,4);
    mass(ctx,s*23,-2,5,2.5,c);
  }
  mass(ctx,-8,-19,23,15,c,-.15);
  for(let i=0;i<11;i++)triangle(ctx,[-24+i*3,-27,-20+i*3,-32-i%3*2,-17+i*3,-25],c.light);
  mass(ctx,15,-22,13,10,c);
  for(const s of [-1,1]){
    mass(ctx,8+s*9,-32,6,7,c,s*.18);
    mass(ctx,9+s*9,-32,3.2,4.2,{...c,base:c.accent,light:c.light});
  }
  triangle(ctx,[26,-22,31,-20,26,-17],c.accent);
  eye(ctx,17,-25,c,1.7);
  for(let i=-1;i<=1;i++)stroke(ctx,[[25,-18],[31+i*4,-19+i*4]],c.light,.6);
  grain(ctx,c,seed,18,19,9,-19);
}
function sandGoblin(ctx:CanvasRenderingContext2D,c:Ramp,t:number,seed:number):void{
  for(const s of [-1,1])stroke(ctx,[[s*7,-16],[s*10,-5],[s*13,0]],c.dark,6);
  mass(ctx,0,-28,13,17,c);
  ctx.fillStyle=c.accent;ctx.fillRect(-10,-29,20,8);
  for(const s of [-1,1])stroke(ctx,[[s*9,-37],[s*16,-23],[s*19,-17]],c.base,4);
  mass(ctx,0,-46,12,13,c);
  triangle(ctx,[-10,-49,-22,-55,-15,-42],c.base);
  triangle(ctx,[10,-49,22,-55,15,-42],c.base);
  mass(ctx,0,-54,15,6,{...c,base:"#d4c5a6",dark:"#857b64",light:"#eee6cf"});
  ctx.strokeStyle="#e7dcc0";ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,-55,11,3.2,6.3);ctx.stroke();
  eye(ctx,-5,-47,c);eye(ctx,5,-47,c);
  triangle(ctx,[-3,-42,2,-40,6,-42],c.dark);
  stroke(ctx,[[18,-18],[22,-45]],"#7d603d",3);
  triangle(ctx,[19,-46,25,-65,26,-44],"#d9dfdb");
  mass(ctx,-18,-19,5,7,{...c,base:"#986f45",dark:"#513d32",light:"#e3ba76"});
  grain(ctx,c,seed,11,10,14,-29);
  triangle(ctx,[-9,-14,6,-17,9,-13],c.accent);
}
function nomadOrc(ctx:CanvasRenderingContext2D,c:Ramp,t:number,seed:number):void{
  for(const s of [-1,1])stroke(ctx,[[s*11,-18],[s*13,-6],[s*15,0]],c.dark,10);
  mass(ctx,0,-31,23,24,c);
  for(const s of [-1,1]){
    mass(ctx,s*20,-38,12,14,c,s*.15);
    stroke(ctx,[[s*23,-34],[s*29,-18],[s*27,-8]],c.base,10);
    mass(ctx,s*29,-7,8,7,c);
  }
  mass(ctx,0,-52,17,15,c);
  mass(ctx,0,-42,12,7,{...c,base:c.dark,light:c.base});
  for(const s of [-1,1])triangle(ctx,[s*8,-46,s*13,-45,s*11,-39],"#e9d9b3");
  eye(ctx,-6,-54,c,2.2);eye(ctx,6,-54,c,2.2);
  triangle(ctx,[-19,-59,-23,-67,-14,-62],"#d6be90");
  stroke(ctx,[[-30,-7],[-38,-54]],"#705238",5);
  mass(ctx,-38,-59,11,7,{...c,base:"#d6c49e",dark:"#9c8368",light:"#f3e5ca"},-.2);
  triangle(ctx,[15,-28,18,-15,2,-13],c.accent);
  grain(ctx,c,seed,15,21,18,-34);
}
function clayTroll(ctx:CanvasRenderingContext2D,c:Ramp,t:number,seed:number):void{
  for(const s of [-1,1])stroke(ctx,[[s*13,-17],[s*16,-6],[s*19,0]],c.dark,10);
  mass(ctx,0,-31,25,23,c,-.17);
  mass(ctx,14,-48,21,18,c,-.2);
  for(const s of [-1,1]){
    stroke(ctx,[[s*22,-43],[s*31,-24],[s*31+Math.sin(t*1.5)*2,-5]],c.base,13);
    mass(ctx,s*32,-3,8,8,c);
    for(let i=-1;i<=1;i++)triangle(ctx,[s*32+i*4,1,s*33+i*4,8,s*35+i*4,2],c.light);
  }
  mass(ctx,22,-51,13,12,c,-.15);
  mass(ctx,23,-43,11,6,{...c,base:c.dark,light:c.base});
  eye(ctx,19,-54,c,2);eye(ctx,29,-54,c,2);
  for(let i=0;i<12;i++)mass(ctx,-13+Math.sin(i*6.7)*18,
    -38+Math.cos(i*2.7)*15,2.8+(i%3)*1.2,2.1,c);
  grain(ctx,c,seed,19,21,14,-36);
}
function duneHalfling(ctx:CanvasRenderingContext2D,c:Ramp,t:number,seed:number):void{
  stroke(ctx,[[-7,-16],[-10,-6],[-13,0]],c.dark,6);
  stroke(ctx,[[7,-16],[10,-6],[13,0]],c.dark,6);
  mass(ctx,0,-24,13,16,c);
  ctx.fillStyle=c.dark;ctx.beginPath();ctx.moveTo(-15,-32);ctx.lineTo(10,-35);
  ctx.lineTo(17,-8);ctx.lineTo(-18,-8);ctx.closePath();ctx.fill();
  mass(ctx,0,-43,14,15,c);
  ctx.fillStyle=c.dark;ctx.strokeStyle=c.light;ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(-15,-46);ctx.quadraticCurveTo(-12,-65,4,-60);
  ctx.quadraticCurveTo(19,-54,17,-41);ctx.lineTo(10,-42);
  ctx.quadraticCurveTo(9,-51,-3,-51);ctx.lineTo(-9,-39);ctx.closePath();ctx.fill();ctx.stroke();
  mass(ctx,0,-43,9,9,{...c,base:"#d5a178",dark:"#895c4a",light:"#f5c398"});
  eye(ctx,-4,-45,c,1.4);eye(ctx,5,-45,c,1.4);
  for(const s of [-1,1])stroke(ctx,[[s*11,-31],[s*20,-19],[s*22,-15]],c.accent,4);
  mass(ctx,-18,-14,6,6,{...c,base:"#8f6945",dark:"#5d4330",light:"#c9a774"});
  stroke(ctx,[[22,-15],[30,-23],[33,-19]],"#7e563b",2);
  stroke(ctx,[[30,-23],[33,-11]],"#7e563b",2);
  grain(ctx,c,seed,10,10,12,-25);
}
function oasisRanger(ctx:CanvasRenderingContext2D,c:Ramp,t:number,seed:number):void{
  for(const s of [-1,1])stroke(ctx,[[s*8,-16],[s*11,-5],[s*14,0]],c.dark,6);
  ctx.fillStyle=c.light;ctx.beginPath();ctx.moveTo(-12,-45);ctx.lineTo(15,-45);
  ctx.lineTo(20,0);ctx.lineTo(-21,0);ctx.closePath();ctx.fill();
  mass(ctx,0,-36,13,18,c);
  for(const s of [-1,1])stroke(ctx,[[s*10,-41],[s*19,-30],[s*19,-18]],c.base,5);
  mass(ctx,0,-56,12,13,{...c,base:"#d9b184",dark:"#8d6851",light:"#f8d8aa"});
  mass(ctx,0,-66,13,5,c);
  eye(ctx,-5,-57,c,1.8);eye(ctx,5,-57,c,1.8);
  stroke(ctx,[[-23,0],[-23,-79]],"#67543b",4);
  triangle(ctx,[-27,-76,-23,-89,-19,-76],"#dfe6d4");
  stroke(ctx,[[-23,-70],[-23,-89]],"#f4edc5",1.1);
  ctx.strokeStyle=c.accent;ctx.lineWidth=1.5;
  for(let i=0;i<4;i++){
    ctx.beginPath();ctx.moveTo(-8+i*5,-45);ctx.quadraticCurveTo(-5+i*5,-30,-8+i*5,-20);ctx.stroke();
  }
  grain(ctx,c,seed,12,10,11,-33);
}
function mirageImp(ctx:CanvasRenderingContext2D,c:Ramp,t:number,seed:number):void{
  softShadow(ctx,0,2,14,4,.26);
  const flicker=Math.sin(t*5+seed*TAU)*3;
  ctx.fillStyle=rgba(c.accent,.36);
  ctx.beginPath();ctx.moveTo(-10,-19);
  ctx.bezierCurveTo(-22,-35,-4,-49,-6,-62-flicker);
  ctx.quadraticCurveTo(0,-52,5,-75-flicker);
  ctx.bezierCurveTo(26,-53,11,-44,18,-26);
  ctx.quadraticCurveTo(12,-11,-2,-9);ctx.closePath();ctx.fill();
  for(const s of [-1,1])stroke(ctx,[[s*6,-30],[s*19,-26],[s*22,-21]],c.accent,3.5);
  mass(ctx,0,-31,11,20,c);
  mass(ctx,0,-52,13,13,c);
  for(const s of [-1,1])triangle(ctx,[s*5,-61,s*11,-78+flicker,s*15,-60],c.accent);
  eye(ctx,-5,-53,c,2.3);eye(ctx,5,-53,c,2.3);
  for(let i=0;i<14;i++){
    const angle=i*TAU/14,rx=19+Math.sin(i*3.7+seed)*5;
    ellipse(ctx,Math.cos(angle)*rx,-37+Math.sin(angle)*rx*1.2,
      1.1+i%3*.4,2.2,c.light,angle);
  }
  grain(ctx,c,seed,11,10,16,-35);
}
function hornedViper(ctx:CanvasRenderingContext2D,c:Ramp,t:number,seed:number):void{
  ctx.strokeStyle=OUTLINE;ctx.lineWidth=24;ctx.lineCap="round";
  ctx.beginPath();ctx.moveTo(18,-8);ctx.bezierCurveTo(-29,6,-30,-23,-7,-23);
  ctx.bezierCurveTo(14,-24,29,-3,0,-6);ctx.stroke();
  ctx.strokeStyle=c.base;ctx.lineWidth=20;ctx.stroke();
  ctx.strokeStyle=c.light;ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(18,-8);ctx.bezierCurveTo(-29,6,-30,-23,-7,-23);ctx.stroke();
  stroke(ctx,[[0,-17],[10,-33],[8,-49+Math.sin(t*2)*1.5]],c.base,14);
  mass(ctx,13,-49,13,9,c,-.1);
  mass(ctx,19,-44,12,5,{...c,base:c.light,light:HIGHLIGHT});
  for(const s of [-1,1])triangle(ctx,[6+s*8,-54,7+s*8,-66,12+s*8,-54],c.light);
  eye(ctx,20,-52,c,2);
  ctx.strokeStyle=c.dark;ctx.lineWidth=2;
  for(let i=0;i<9;i++){
    const x=-22+i*4,y=-13-Math.sin(i*1.3)*5;
    ctx.beginPath();ctx.moveTo(x-3,y);ctx.quadraticCurveTo(x,y+2,x+3,y+1);ctx.stroke();
  }
  grain(ctx,c,seed,16,15,10,-13);
}
function southernVulture(ctx:CanvasRenderingContext2D,c:Ramp,t:number,seed:number):void{
  stroke(ctx,[[-28,1],[30,1]],"#69543d",6);
  stroke(ctx,[[5,-4],[7,-13]],c.accent,3.5);
  for(const s of [-1,1])stroke(ctx,[[s*9,-19],[s*11,-7],[s*13,0]],c.accent,4);
  mass(ctx,6,-31,17,23,c,-.1);
  ctx.fillStyle=c.dark;ctx.strokeStyle=c.light;ctx.lineWidth=1.4;
  ctx.beginPath();ctx.moveTo(-3,-48);ctx.quadraticCurveTo(-40,-41,-26,-3);
  ctx.quadraticCurveTo(-13,-7,2,-21);ctx.closePath();ctx.fill();ctx.stroke();
  for(let i=0;i<9;i++)stroke(ctx,[[-8-i*.5,-33+i*3],[-27+i*.5,-20+i*2]],i%2?c.base:c.light,2);
  stroke(ctx,[[10,-45],[12,-57],[16,-62]],c.accent,10);
  mass(ctx,16,-65,9,9,{...c,base:c.accent,light:"#f6b8a8",dark:"#7f5554"});
  triangle(ctx,[22,-63,32,-60,22,-55],"#d7b18a");
  eye(ctx,18,-67,c,1.8);
  for(let i=0;i<7;i++)triangle(ctx,[-14+i*2,-35, -17+i*2,-38-i%3*2,-11+i*2,-31],c.light);
  grain(ctx,c,seed,11,12,18,-31);
}
function animatedCactus(ctx:CanvasRenderingContext2D,c:Ramp,t:number,seed:number):void{
  for(const s of [-1,1]){
    stroke(ctx,[[s*9,-18],[s*21,-11],[s*25,0]],c.dark,7);
    stroke(ctx,[[s*12,-36],[s*25,-26],[s*28,-39]],c.base,10);
    mass(ctx,s*28,-37,6,9,c);
  }
  mass(ctx,0,-31,16,28,c);
  for(const s of [-1,1]){
    mass(ctx,s*8,-45,5,12,c,s*.1);
    ctx.strokeStyle=c.dark;ctx.lineWidth=1;
    for(let i=0;i<6;i++){
      const y=-46+i*6;
      ctx.beginPath();ctx.moveTo(s*15,y);ctx.lineTo(s*20,y-2);ctx.stroke();
    }
  }
  for(let i=0;i<20;i++){
    const x=Math.sin(i*11.3)*12,y=-13-Math.abs(Math.cos(i*8))*37;
    stroke(ctx,[[x,y],[x+(i%2?4:-3),y-2]],c.light,.7);
  }
  eye(ctx,-6,-32,c,2);eye(ctx,6,-32,c,2);
  triangle(ctx,[-3,-25,0,-22,4,-25],c.dark);
  // Distinct bright flowering crown (reference sheet).
  for(let i=0;i<8;i++){
    const a=i*TAU/8+Math.sin(t*2)*.03;
    mass(ctx,Math.cos(a)*7,-64+Math.sin(a)*6,5,8,
      {...c,base:i%2?"#e46a85":"#d983b5",dark:"#943e6b",light:"#ffd1d4"},a);
  }
  mass(ctx,0,-64,6,5,{...c,base:"#f5b641",light:"#fff8a7",dark:"#c67f3d"});
  grain(ctx,c,seed,14,12,24,-31);
}
export function renderWave3Creature(ctx:CanvasRenderingContext2D,
  actor:Wave3Visual,sx:number,sy:number,time=0):void {
  const c=PAL[actor.kind], seed=hashString(actor.id??actor.kind);
  ctx.save();ctx.translate(sx,sy);
  softShadow(ctx,0,4,actor.kind==="dune-rat"?25:19,6,.38);
  ctx.translate(0,Math.sin(time*2.1+seed*TAU)*(actor.kind==="mirage-imp"?2.6:.62));
  switch(actor.kind){
    case "dune-rat":duneRat(ctx,c,time,seed);break;
    case "sand-goblin":sandGoblin(ctx,c,time,seed);break;
    case "nomad-orc":nomadOrc(ctx,c,time,seed);break;
    case "dry-clay-troll":clayTroll(ctx,c,time,seed);break;
    case "dune-halfling":duneHalfling(ctx,c,time,seed);break;
    case "oasis-ranger":oasisRanger(ctx,c,time,seed);break;
    case "mirage-imp":mirageImp(ctx,c,time,seed);break;
    case "horned-viper":hornedViper(ctx,c,time,seed);break;
    case "southern-vulture":southernVulture(ctx,c,time,seed);break;
    case "animated-cactus":animatedCactus(ctx,c,time,seed);break;
  }
  if((actor.hurtTime??0)>.02)
    ellipse(ctx,0,-31,27,32,rgba(HIGHLIGHT,clamp01((actor.hurtTime??0)/.25)*.22));
  if((actor.casting??0)>0){
    ctx.strokeStyle=rgba(c.accent,.4+clamp01(actor.casting??0)*.55);
    ctx.lineWidth=2.1;ctx.beginPath();ctx.arc(0,-22,24,0,TAU);ctx.stroke();
  }
  ctx.restore();
  if(actor.hp<CREATURE_CATALOG[actor.kind].maxHp){
    const ratio=clamp01(actor.hp/CREATURE_CATALOG[actor.kind].maxHp);
    ctx.save();ctx.translate(sx,sy);
    ctx.fillStyle=rgba(OUTLINE,.89);pill(ctx,-18,-88,36,6);ctx.fill();
    ctx.fillStyle=mix("#db644b","#b7e689",ratio);pill(ctx,-16,-86.8,32*ratio,3);ctx.fill();
    ctx.restore();
  }
}
