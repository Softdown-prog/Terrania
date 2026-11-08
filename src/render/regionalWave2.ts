import { CREATURE_CATALOG, type SecondWaveKind } from "../actors/CreatureCatalog.ts";
import { clamp01, ellipse, hashString, mix, pill, rgba, shade, softShadow, TAU } from "./draw.ts";

export interface Wave2Visual {
  readonly kind: SecondWaveKind;
  readonly hp: number;
  readonly id?: string;
  readonly hurtTime?: number;
  readonly casting?: number;
}
type Ramp = Readonly<{ base:string; dark:string; light:string; accent:string; eyes:string }>;
const PAL: Readonly<Record<SecondWaveKind,Ramp>> = {
  "summit-griffin": { base:"#88909e",dark:"#414957",light:"#d2d6d6",accent:"#d5a24c",eyes:"#ffc866" },
  "magma-salamander": { base:"#5b413a",dark:"#292f38",light:"#a47558",accent:"#ff6a26",eyes:"#ffbd65" },
  "rotten-marsh-ent": { base:"#625d49",dark:"#2e463b",light:"#a29b70",accent:"#61a782",eyes:"#7ff7e1" },
  "poison-scout-toad": { base:"#779655",dark:"#44476c",light:"#c5c88a",accent:"#a45ac7",eyes:"#f6db74" },
  "carrion-sandworm": { base:"#a57959",dark:"#594237",light:"#dbc4a0",accent:"#b39c7f",eyes:"#f9bd68" },
  "tundra-mammoth": { base:"#9e7965",dark:"#584b50",light:"#d0ae87",accent:"#d4e6df",eyes:"#d9d5b6" },
  "frost-banshee": { base:"#4986a2",dark:"#28485f",light:"#c8edf0",accent:"#7fdbff",eyes:"#d9feff" },
  "runic-polar-bear": { base:"#b3d4d9",dark:"#5b90a4",light:"#eefcff",accent:"#53baf0",eyes:"#365670" },
  "abyssal-octopus": { base:"#7a58ae",dark:"#354668",light:"#bb78c9",accent:"#4adbc8",eyes:"#ffe987" },
  "tide-hunter-triton": { base:"#349b93",dark:"#27516f",light:"#8be6c7",accent:"#82bdef",eyes:"#ffe17c" },
};
const EDGE="#142a2a", GLINT="#fff6dc";
/** Polished organic volume: upper-left light, three-tone material and dark single outline. */
function mass(ctx:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,c:Ramp,angle=0):void {
  const g=ctx.createLinearGradient(x-rx,y-ry,x+rx,y+ry);
  g.addColorStop(0,c.light);g.addColorStop(.48,c.base);g.addColorStop(1,c.dark);
  ellipse(ctx,x,y,rx,ry,g,angle);
  ctx.strokeStyle=EDGE;ctx.lineWidth=1.5;
  ctx.beginPath();ctx.ellipse(x,y,rx,ry,angle,0,TAU);ctx.stroke();
  ctx.strokeStyle=rgba(GLINT,.35);ctx.lineWidth=1;
  ctx.beginPath();ctx.ellipse(x-1,y-1,Math.max(1,rx-2),Math.max(1,ry-2),angle,Math.PI,1.86*Math.PI);ctx.stroke();
}
function eye(ctx:CanvasRenderingContext2D,x:number,y:number,c:Ramp,r=2.1):void {
  ellipse(ctx,x,y,r+1,r,EDGE);
  ellipse(ctx,x,y-.25,r,r*.67,c.eyes);
  ellipse(ctx,x-.6,y-.8,.6,.5,GLINT);
}
function joint(ctx:CanvasRenderingContext2D,points:readonly (readonly [number,number])[],c:Ramp,w=5):void {
  ctx.lineCap="round";
  ctx.lineJoin="round";
  for(let k=0;k<2;k++){
    ctx.beginPath();ctx.moveTo(points[0]![0],points[0]![1]);
    for(const [x,y] of points.slice(1))ctx.lineTo(x,y);
    ctx.strokeStyle=k?c.base:EDGE;ctx.lineWidth=w+(k?-1:2);ctx.stroke();
  }
  const p=points[points.length-2]!;
  ellipse(ctx,p[0],p[1],w*.55,w*.5,c.light);
}
function crystal(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,
  fill:string,shine=GLINT):void {
  ctx.fillStyle=EDGE;
  ctx.beginPath();ctx.moveTo(x-w,y);ctx.lineTo(x-w*.45,y-h*.75);
  ctx.lineTo(x+w*.1,y-h);ctx.lineTo(x+w,y-h*.2);ctx.lineTo(x+w*.4,y+w*.1);
  ctx.closePath();ctx.fill();
  ctx.fillStyle=fill;ctx.beginPath();ctx.moveTo(x-w+1,y-1);
  ctx.lineTo(x+w*.1,y-h+1);ctx.lineTo(x+.2,y-1);ctx.closePath();ctx.fill();
  ctx.strokeStyle=rgba(shine,.85);ctx.lineWidth=1.2;
  ctx.beginPath();ctx.moveTo(x-w*.5,y-h*.35);ctx.lineTo(x+w*.1,y-h+2);ctx.stroke();
}
function etched(ctx:CanvasRenderingContext2D,c:Ramp,count:number,x=0,y=-22,rx=14,ry=14):void {
  // Sparse fine markings clipped in organic materials by the parent's silhouette.
  for(let i=0;i<count;i++){
    const a=i*2.39996, r=Math.sqrt((i+.5)/count);
    const px=x+Math.cos(a)*rx*r,py=y+Math.sin(a)*ry*r;
    ellipse(ctx,px,py,1.1+(i%3)*.5,.6+(i%2)*.5,i%3?shade(c.light,-.14):c.accent,a);
    ellipse(ctx,px-.6,py-.5,.55,.3,rgba(GLINT,.63));
  }
}
function griffin(ctx:CanvasRenderingContext2D,c:Ramp,t:number):void {
  for(const s of [-1,1]){
    ctx.fillStyle=c.dark;ctx.strokeStyle=EDGE;ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(s*7,-34);
    ctx.bezierCurveTo(s*32,-68+Math.sin(t*2)*3,s*45,-51,s*42,-38);
    ctx.quadraticCurveTo(s*32,-43,s*18,-26);ctx.closePath();ctx.fill();ctx.stroke();
    for(let k=0;k<5;k++)crystal(ctx,s*(18+k*5),-40-k%2*3,4,10-k,c.light);
    joint(ctx,[[s*12,-17],[s*16,-7],[s*20,0]],c,6);
    joint(ctx,[[s*4,-25],[s*14,-15],[s*9,-2]],c,5);
    crystal(ctx,s*20,1,3,6,c.accent);
  }
  mass(ctx,0,-29,20,15,c);
  mass(ctx,15,-42,12,12,c,-.15);
  mass(ctx,25,-37,7,5,c,.1);
  ctx.fillStyle=c.accent;ctx.beginPath();ctx.moveTo(30,-37);ctx.lineTo(40,-34);ctx.lineTo(29,-27);ctx.closePath();ctx.fill();
  for(let i=0;i<8;i++)crystal(ctx,4+i*3,-45+i%3*2,2.8,6+i%2*2,c.light);
  eye(ctx,20,-44,c);etched(ctx,c,9,-2,-30,14,11);
}
function salamander(ctx:CanvasRenderingContext2D,c:Ramp,t:number):void {
  ctx.strokeStyle=EDGE;ctx.lineWidth=15;ctx.lineCap="round";
  ctx.beginPath();ctx.moveTo(15,-17);ctx.bezierCurveTo(39,-8,37,-50,12,-51);ctx.stroke();
  ctx.strokeStyle=c.base;ctx.lineWidth=11;ctx.stroke();
  for(const s of [-1,1])for(const x of [-13,12])
    joint(ctx,[[x,-17],[x+s*7,-6],[x+s*10,0]],c,6);
  mass(ctx,0,-23,28,14,c,-.18);
  mass(ctx,-24,-28,14,9,c);
  for(let i=0;i<9;i++){
    const x=-24+i*5;
    crystal(ctx,x,-32-Math.sin(i*1.3)*2,3.4,9+(i%3)*3,c.dark,c.accent);
    ctx.strokeStyle=c.accent;ctx.lineWidth=1.7;
    ctx.beginPath();ctx.moveTo(x,-17);ctx.lineTo(x+2+Math.sin(i+t)*.5,-25);ctx.stroke();
  }
  eye(ctx,-30,-31,c);eye(ctx,-22,-32,c);etched(ctx,c,13,2,-22,19,9);
}
function ent(ctx:CanvasRenderingContext2D,c:Ramp,t:number):void {
  for(const s of [-1,1]){
    joint(ctx,[[s*6,-15],[s*15,-5],[s*24,0]],c,9);
    joint(ctx,[[s*10,-41],[s*26,-28],[s*30,-12]],c,7);
    for(let i=0;i<3;i++){
      joint(ctx,[[s*18,-46],[s*(23+i*6),-55-i*4],[s*(25+i*8),-63-i*6]],c,2.5);
      ellipse(ctx,s*(24+i*7),-65-i*6,3.4,4.3,i%2?c.accent:c.light);
    }
  }
  mass(ctx,0,-28,15,29,c);
  mass(ctx,0,-49,13,13,c);
  ctx.fillStyle=EDGE;
  ctx.beginPath();ctx.moveTo(-8,-39);ctx.lineTo(0,-34);ctx.lineTo(9,-39);ctx.lineTo(6,-28);
  ctx.lineTo(-3,-30);ctx.closePath();ctx.fill();
  eye(ctx,-6,-50,c,2);eye(ctx,6,-50,c,2);
  for(let i=0;i<11;i++){
    const x=Math.sin(i*17)*23,y=-40-Math.abs(Math.cos(i*19))*23;
    joint(ctx,[[x*.5,y+11],[x,y+2]],c,2);
    mass(ctx,x,y+Math.sin(t*1.4+i)*.8,3.4,1.7,{...c,base:i%2?c.accent:"#a161c6",light:GLINT,dark:c.dark});
  }
  etched(ctx,c,9,0,-24,9,19);
}
function toad(ctx:CanvasRenderingContext2D,c:Ramp,t:number):void {
  for(const s of [-1,1]){
    joint(ctx,[[s*14,-16],[s*24,-7],[s*27,0]],c,10);
    joint(ctx,[[s*18,-21],[s*29,-17],[s*32,-8]],c,5);
    mass(ctx,s*25,-5,9,5,c);
  }
  mass(ctx,0,-21,27,22,c);
  mass(ctx,0,-12,18,9,{...c,base:c.light,light:GLINT,dark:c.base});
  for(const s of [-1,1])mass(ctx,s*17,-35,9,8,c);
  eye(ctx,-16,-37,c,3.4);eye(ctx,16,-37,c,3.4);
  ctx.strokeStyle=c.dark;ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(-13,-16);ctx.quadraticCurveTo(0,-11,14,-17);ctx.stroke();
  for(let i=0;i<15;i++){
    const x=Math.sin(i*7.3)*22,y=-21+Math.cos(i*12)*14;
    ellipse(ctx,x,y,2.4+(i%3),2.2,i%2?c.accent:c.dark);
    ellipse(ctx,x-.6,y-1,.8,.5,rgba(GLINT,.65));
  }
  ctx.strokeStyle=rgba(c.accent,.75);ctx.lineWidth=1.4;
  ctx.beginPath();ctx.moveTo(-2,-17);ctx.quadraticCurveTo(4+Math.sin(t*3)*3,-9,10,-15);ctx.stroke();
}
function worm(ctx:CanvasRenderingContext2D,c:Ramp,t:number):void {
  softShadow(ctx,0,1,32,9,.45);
  for(let i=0;i<7;i++){
    const y=-7-i*6,x=Math.sin(i*.29+t*.6)*2;
    mass(ctx,x,y,23-i*1.2,7,c);
    ctx.strokeStyle=c.dark;ctx.lineWidth=1.2;
    ctx.beginPath();ctx.arc(x,y,18-i,Math.PI*.15,Math.PI*.85);ctx.stroke();
  }
  mass(ctx,-2,-54,23,18,c);
  for(let i=0;i<9;i++){
    const a=i*TAU/9;
    crystal(ctx,Math.cos(a)*20,-54+Math.sin(a)*13,4.1,9,c.light);
  }
  ellipse(ctx,-1,-54,16,12,EDGE);
  ellipse(ctx,-1,-54,13,9,"#6e333c");
  for(let i=0;i<12;i++){
    const a=i*TAU/12,x=-1+Math.cos(a)*11,y=-54+Math.sin(a)*7;
    crystal(ctx,x,y+2,2.1,6,c.light);
  }
  ellipse(ctx,-1,-54,5,4,shade(c.dark,-.4));
  etched(ctx,c,11,-1,-29,15,17);
}
function mammoth(ctx:CanvasRenderingContext2D,c:Ramp,t:number):void {
  for(const s of [-1,1]){
    joint(ctx,[[s*16,-18],[s*22,-6],[s*23,1]],c,12);
    mass(ctx,s*23,0,9,5,c);
  }
  mass(ctx,0,-29,30,27,c);
  mass(ctx,18,-42,20,21,c);
  mass(ctx,30,-37,12,12,c);
  for(let i=0;i<10;i++){
    const x=Math.sin(i*2.2)*26,y=-48+Math.cos(i*3.1)*12;
    crystal(ctx,x,y+5,4,8,c.light);
  }
  for(const s of [-1,1]){
    ctx.strokeStyle=EDGE;ctx.lineWidth=9;ctx.lineCap="round";
    ctx.beginPath();ctx.moveTo(19+s*12,-35);
    ctx.bezierCurveTo(34+s*20,-8,45+s*12,-13,43+s*13,-27);ctx.stroke();
    ctx.strokeStyle=c.accent;ctx.lineWidth=6;ctx.stroke();
    ctx.strokeStyle=rgba(GLINT,.68);ctx.lineWidth=1;ctx.stroke();
  }
  eye(ctx,31,-46,c,2.5);
  joint(ctx,[[40,-37],[47,-22],[46+Math.sin(t)*2,-12]],c,6);
  etched(ctx,c,12,-8,-27,22,20);
}
function banshee(ctx:CanvasRenderingContext2D,c:Ramp,t:number):void {
  // Torn veil is layered as translucent folds rather than a solid ground-touching actor.
  ctx.fillStyle=rgba(c.dark,.86);
  ctx.beginPath();ctx.moveTo(-10,-48);
  ctx.bezierCurveTo(-20,-35,-27,-14,-15,-7);
  ctx.quadraticCurveTo(-10,-16,-4,-6);
  ctx.quadraticCurveTo(2,-18,9,-8);
  ctx.quadraticCurveTo(25,-16,13,-43);ctx.closePath();ctx.fill();
  for(const s of [-1,1])joint(ctx,[[s*9,-38],[s*22,-28],[s*30,-18+Math.sin(t*2)*2]],c,4);
  mass(ctx,0,-37,13,21,c);
  mass(ctx,0,-52,12,13,c);
  for(let i=0;i<9;i++){
    const x=-17+i*4;
    crystal(ctx,x,-39+i%3*2,3.1,14-i%3*2,c.light,c.accent);
  }
  eye(ctx,-5,-53,c,2.9);eye(ctx,5,-53,c,2.9);
  ellipse(ctx,0,-46,2.4,4.3,c.dark);
  for(let i=0;i<8;i++){
    const a=i*2.4+t*.3;
    crystal(ctx,Math.cos(a)*27,-28+Math.sin(a)*19,3.3,8,c.accent);
  }
  etched(ctx,c,8,0,-30,9,12);
}
function bear(ctx:CanvasRenderingContext2D,c:Ramp,t:number):void {
  for(const s of [-1,1]){
    joint(ctx,[[s*14,-22],[s*20,-8],[s*22,0]],c,13);
    mass(ctx,s*21,-1,10,7,c);
    for(let i=0;i<3;i++)crystal(ctx,s*(17+i*4),1,2,4,c.dark);
  }
  mass(ctx,0,-30+Math.sin(t*2)*.38,27,21,c);
  mass(ctx,21,-38,17,16,c);
  for(const s of [-1,1])mass(ctx,20+s*10,-51,6,7,c);
  mass(ctx,31,-32,11,7,c);
  eye(ctx,16,-41,c,2.6);eye(ctx,29,-42,c,2.6);
  ellipse(ctx,40,-31,3.5,2.7,c.dark);
  ctx.strokeStyle=c.accent;ctx.lineWidth=2;
  for(let i=0;i<5;i++){
    const x=-18+i*8,y=-31+(i%2)*5;
    ctx.beginPath();ctx.moveTo(x-3,y-5);
    ctx.lineTo(x,y+1);ctx.lineTo(x+3,y-6);ctx.stroke();
    crystal(ctx,x,y-5,2.7,5,c.accent);
  }
  etched(ctx,c,12,0,-26,19,15);
}
function octopus(ctx:CanvasRenderingContext2D,c:Ramp,t:number):void {
  for(let i=0;i<8;i++){
    const a=i*TAU/8,phase=Math.sin(t*1.7+i*.82)*2.2;
    const mx=Math.cos(a)*22,my=-7+Math.sin(a)*10;
    const endX=Math.cos(a)*34+phase,endY=my+6+Math.cos(i)*5;
    ctx.strokeStyle=EDGE;ctx.lineWidth=10;ctx.lineCap="round";
    ctx.beginPath();ctx.moveTo(Math.cos(a)*11,-16+Math.sin(a)*5);
    ctx.bezierCurveTo(mx,my,endX-12,endY-10,endX,endY);ctx.stroke();
    ctx.strokeStyle=c.base;ctx.lineWidth=7;ctx.stroke();
    for(let k=1;k<4;k++){
      const u=k/4;
      ellipse(ctx,mx*u+endX*(1-u)*.6,-11+u*8,1.5,1.7,c.accent);
    }
    ellipse(ctx,endX,endY,2.6,2,c.light);
  }
  mass(ctx,0,-29,19,19,c);
  mass(ctx,0,-42,15,10,c);
  eye(ctx,-7,-28,c,3.8);eye(ctx,9,-28,c,3.8);
  for(let i=0;i<7;i++)crystal(ctx,-15+i*5,-44+i%2*4,2.8,7,i%2?c.accent:c.light);
  etched(ctx,c,11,0,-39,12,10);
}
function triton(ctx:CanvasRenderingContext2D,c:Ramp,t:number):void {
  ctx.strokeStyle=EDGE;ctx.lineWidth=16;ctx.lineCap="round";
  ctx.beginPath();ctx.moveTo(1,-10);
  ctx.bezierCurveTo(21,0,38,-4,28,-18);ctx.stroke();
  ctx.strokeStyle=c.base;ctx.lineWidth=13;ctx.stroke();
  crystal(ctx,32,-16,9,20,c.accent);
  for(const s of [-1,1])joint(ctx,[[s*11,-39],[s*20,-26],[s*21,-13]],c,6);
  mass(ctx,0,-37,15,20,c);
  mass(ctx,0,-56,12,13,c);
  for(const s of [-1,1])crystal(ctx,s*9,-61,5,12,c.accent);
  for(let i=0;i<7;i++)crystal(ctx,-9+i*3,-67+(i%3)*3,3,9,c.light);
  eye(ctx,-5,-56,c,2.3);eye(ctx,5,-56,c,2.3);
  for(let i=0;i<7;i++){
    const x=-8+i*2.7;ctx.strokeStyle=c.accent;ctx.lineWidth=1.4;
    ctx.beginPath();ctx.moveTo(x,-29);
    ctx.quadraticCurveTo(x+2,-19,x,-17);ctx.stroke();
  }
  // Lightning trident is part of this species, not a generic sword.
  ctx.strokeStyle=EDGE;ctx.lineWidth=4;ctx.beginPath();
  ctx.moveTo(-24,-12);ctx.lineTo(-25,-68);ctx.stroke();
  ctx.strokeStyle=c.accent;ctx.lineWidth=2.4;ctx.stroke();
  for(const dx of [-7,0,7]){
    ctx.strokeStyle=rgba(c.accent,.8);ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(-25+dx,-55);
    ctx.lineTo(-25+dx,-73);ctx.lineTo(-25+dx+Math.sin(t*2+dx)*1.3,-78);ctx.stroke();
    crystal(ctx,-25+dx,-71,3,10,c.light,c.accent);
  }
  etched(ctx,c,9,0,-35,9,14);
}
/** Procedural artwork for the second ten species; origin is the ground contact point. */
export function renderWave2Creature(ctx:CanvasRenderingContext2D,
  actor:Wave2Visual,sx:number,sy:number,time=0):void {
  const c=PAL[actor.kind],seed=hashString(actor.id??actor.kind);
  ctx.save();ctx.translate(sx,sy);
  softShadow(ctx,0,4,31,8,.38);
  ctx.translate(0,Math.sin(time*2+seed*TAU)*.8);
  switch(actor.kind){
    case "summit-griffin":griffin(ctx,c,time);break;
    case "magma-salamander":salamander(ctx,c,time);break;
    case "rotten-marsh-ent":ent(ctx,c,time);break;
    case "poison-scout-toad":toad(ctx,c,time);break;
    case "carrion-sandworm":worm(ctx,c,time);break;
    case "tundra-mammoth":mammoth(ctx,c,time);break;
    case "frost-banshee":banshee(ctx,c,time);break;
    case "runic-polar-bear":bear(ctx,c,time);break;
    case "abyssal-octopus":octopus(ctx,c,time);break;
    case "tide-hunter-triton":triton(ctx,c,time);break;
  }
  // Shared specular accents, deterministic by identity, not Math.random or real time.
  for(let i=0;i<11;i++){
    const x=Math.sin(i*7.77+seed*23)*15,y=-13-Math.abs(Math.cos(i*17+seed*11))*25;
    ellipse(ctx,x,y,1.05+(i%3)*.25,.55,rgba(i%2?c.light:c.accent,.62));
    ellipse(ctx,x-.4,y-.6,.5,.3,rgba(GLINT,.62));
  }
  if((actor.hurtTime??0)>.02)
    ellipse(ctx,0,-31,29,31,rgba(GLINT,clamp01((actor.hurtTime??0)/.25)*.18));
  if((actor.casting??0)>0){
    ctx.strokeStyle=rgba(c.accent,.42+clamp01(actor.casting??0)*.5);ctx.lineWidth=2.1;
    ctx.beginPath();ctx.arc(0,-25,30,0,TAU);ctx.stroke();
  }
  ctx.restore();
  const max=CREATURE_CATALOG[actor.kind].maxHp;
  if(actor.hp<max){
    const fraction=clamp01(actor.hp/max);
    ctx.save();ctx.translate(sx,sy);
    ctx.fillStyle=rgba(EDGE,.88);pill(ctx,-18,-82,36,6);ctx.fill();
    ctx.fillStyle=mix("#d85f45","#a6e08f",fraction);
    pill(ctx,-16,-80.8,32*fraction,3);ctx.fill();
    ctx.fillStyle=rgba(GLINT,.47);ctx.fillRect(-16,-80.8,32*fraction,.9);
    ctx.restore();
  }
}
