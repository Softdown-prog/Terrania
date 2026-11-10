import { monsterPose } from "./monsterMotion.ts";
import { CREATURE_CATALOG, type SouthCommonKind } from "../actors/CreatureCatalog.ts";
import { clamp01, ellipse, hashString, mix, pill, rgba, shade, softShadow, TAU } from "./draw.ts";

type Palette={base:string;light:string;dark:string;accent:string;eye:string;extra:string};
export interface DesertCommonVisual {
  readonly kind:SouthCommonKind;
  readonly hp:number;
  readonly hurtTime?:number;
  readonly casting?:number;
  readonly motionPhase?: number;
  readonly moving?: number;
  readonly id?:string;
}
const C:Readonly<Record<SouthCommonKind,Palette>>={
  "dune-rat":{base:"#98836b",light:"#ded3ae",dark:"#574c43",accent:"#b87871",eye:"#dfb55c",extra:"#c5aa93"},
  "sand-goblin":{base:"#79935e",light:"#c7d19b",dark:"#4c6844",accent:"#c08b52",eye:"#ffdc6f",extra:"#805e4d"},
  "desert-orc":{base:"#718063",light:"#bec09c",dark:"#36453d",accent:"#b39362",eye:"#f1c76d",extra:"#745243"},
  "clay-troll":{base:"#ac8864",light:"#d7b88e",dark:"#6e5643",accent:"#c79972",eye:"#eac778",extra:"#857c64"},
  "dune-scout":{base:"#aa8e66",light:"#eed9ab",dark:"#605044",accent:"#d9bb80",eye:"#e5cc91",extra:"#87765d"},
  "oasis-elf":{base:"#d5c4a2",light:"#f9edcf",dark:"#776451",accent:"#bd995f",eye:"#d5ebc1",extra:"#94806c"},
  "mirage-imp":{base:"#f4ae51",light:"#fff0a5",dark:"#a85027",accent:"#ffd770",eye:"#fff5b9",extra:"#ee762b"},
  "horned-viper":{base:"#ac915c",light:"#d8c498",dark:"#635d4b",accent:"#c68e54",eye:"#efcc6c",extra:"#8a8f4a"},
  "carrion-vulture":{base:"#54525c",light:"#908c91",dark:"#272933",accent:"#c69b67",eye:"#f0d68b",extra:"#cb8b92"},
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
  // Coarse tufts on the arched dune-rat back, not a smooth domestic mouse.
  for(let i=0;i<12;i++){
    const x=-15+i*2.8,back=-19-Math.sin(i*Math.PI/12)*4;
    tip(ctx,x,back,2.2+i%3*.25,3.6+i%4*1.1,
      i%3===0?c.light:c.extra);
  }
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
}
function orc(ctx:CanvasRenderingContext2D,c:Palette,t:number):void {
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
}
function troll(ctx:CanvasRenderingContext2D,c:Palette,t:number):void {
  for(const s of [-1,1]){
    line(ctx,s*12,-15,s*15,0,c,11);
    line(ctx,s*18,-38,s*29,-15,c,9);
    body(ctx,s*29,-15,8,8,c);
  }
  body(ctx,0,-29,22,25,c);
  // Dust-baked plates and scars make this a clay troll, not a generic giant.
  for(let i=0;i<9;i++){
    const x=Math.sin(i*2.1)*16,y=-39+(i%5)*8;
    body(ctx,x,y,3+i%3,1.7,{...c,base:c.extra,light:c.light,dark:c.dark},i*.1);
  }
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
  const linen:Palette={...c,base:"#b5a17b",light:"#f0ddb0",dark:"#6d5d4d"};
  for(const side of [-1,1]){
    line(ctx,side*5,-13,side*10,-1,linen,4.1);
    line(ctx,side*8,-30,side*15,-19,linen,3.7);
    body(ctx,side*10,-1,5,3,linen);
  }
  // Soft brown cloak opening around a smaller traveler.
  ctx.fillStyle="#796b54";ctx.strokeStyle=OUTLINE;ctx.lineWidth=1.4;
  ctx.beginPath();ctx.moveTo(-10,-35);ctx.quadraticCurveTo(-18,-21,-14,-7);
  ctx.lineTo(12,-7);ctx.quadraticCurveTo(17,-25,9,-35);ctx.closePath();ctx.fill();ctx.stroke();
  body(ctx,0,-23,8.5,14,linen);
  body(ctx,0,-40,10,10,linen);
  // A large sand-colored hood frames a tiny face, not a pointed wizard hat.
  ctx.fillStyle="#b39b6f";ctx.beginPath();
  ctx.moveTo(-12,-36);ctx.bezierCurveTo(-18,-48,-11,-58,-2,-56);
  ctx.bezierCurveTo(8,-55,15,-46,13,-33);
  ctx.lineTo(8,-42);ctx.quadraticCurveTo(0,-48,-8,-40);
  ctx.closePath();ctx.fill();ctx.stroke();
  body(ctx,0,-40,7,7,{...c,base:"#ba9277",light:"#edb99a",dark:"#6d574a"});
  eye(ctx,-3,-41,c,1.55);eye(ctx,4,-41,c,1.55);
  ctx.strokeStyle="#7c5947";ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(-2,-36);ctx.quadraticCurveTo(1,-34,4,-36);ctx.stroke();
  // Crossed satchel and leather belts: practical nomadic clothing.
  ctx.strokeStyle="#634c40";ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(-9,-32);ctx.lineTo(9,-20);ctx.stroke();
  body(ctx,-12,-18,6,7,{...linen,base:"#825c42",light:"#b58d63"});
  ellipse(ctx,-11,-20,2,2,c.accent);
  for(const side of [-1,1])body(ctx,side*8,-29,3.8,6,linen);
  // U-shaped sling held on the right, taut pouch with a loaded pebble.
  ctx.strokeStyle="#58473d";ctx.lineWidth=2.7;
  ctx.beginPath();ctx.moveTo(17,-18);
  ctx.quadraticCurveTo(23,-35+Math.sin(t*2)*1.2,27,-32);
  ctx.quadraticCurveTo(32,-26,32,-16);ctx.stroke();
  ctx.strokeStyle=c.accent;ctx.lineWidth=1.2;
  ctx.beginPath();ctx.moveTo(27,-31);ctx.lineTo(28,-18);ctx.stroke();
  ellipse(ctx,29,-21,3,2.2,"#8e7c66");
  freckles(ctx,linen,13,0,-23,7,9);
}
function elf(ctx:CanvasRenderingContext2D,c:Palette,t:number):void {
  const robe:Palette={...c,base:"#d7c5a4",light:"#f4ecd6",dark:"#85715a"};
  const leather:Palette={...c,base:"#806851",light:"#b29975",dark:"#55483d"};
  for(const side of [-1,1]) {
    line(ctx,side*6,-12,side*9,-1,leather,5);
    body(ctx,side*9,-1,6,3.5,leather);
    line(ctx,side*10,-35,side*18,-19,robe,4.4);
    body(ctx,side*18,-19,3.7,5,robe);
  }
  // Long linen robe and windswept split lower hem.
  ctx.fillStyle="#d4c4a8";ctx.strokeStyle=OUTLINE;ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(-10,-35);ctx.lineTo(10,-35);
  ctx.quadraticCurveTo(11,-20,15,-5);ctx.lineTo(3,-9);
  ctx.lineTo(0,-1);ctx.lineTo(-4,-11);ctx.lineTo(-14,-6);
  ctx.quadraticCurveTo(-10,-20,-10,-35);ctx.closePath();ctx.fill();ctx.stroke();
  body(ctx,0,-31,11,15,robe);
  ctx.strokeStyle="#9d8c73";ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(-6,-33);ctx.lineTo(0,-8);ctx.lineTo(6,-33);ctx.stroke();
  body(ctx,0,-51,10,11,{...c,base:"#c0a386",light:"#efc9a1"});
  // Desert headdress with folded cloth; face remains visible.
  body(ctx,0,-61,11,5,robe);
  for(let i=0;i<4;i++){
    ctx.strokeStyle=i%2?"#a89475":"#f7ebcd";ctx.lineWidth=1.4;
    ctx.beginPath();ctx.moveTo(-10+i,-60+i*2);
    ctx.quadraticCurveTo(0,-64+i*1.5,11-i,-60+i*2);ctx.stroke();
  }
  body(ctx,0,-44,9,3,robe);
  eye(ctx,-5,-52,c,1.6);eye(ctx,5,-52,c,1.6);
  for(const side of [-1,1]) {
    // Small pointed elven ear beneath the headdress.
    tip(ctx,side*11,-49,3.3,7,c.light);
    body(ctx,side*10,-34,4,7,leather);
  }
  ctx.strokeStyle="#725e4c";ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(-11,-32);ctx.lineTo(10,-25);ctx.stroke();
  body(ctx,-10,-25,4.3,5,leather);
  // Long iron-tipped spear on the left (the iconic pose of the reference).
  line(ctx,-26,-1,-28,-68,{...c,base:"#8a7254",light:"#d1b280"},2.8);
  tip(ctx,-28,-64,5,16,"#d1d7d7");
  ctx.strokeStyle="#faf7ec";ctx.lineWidth=1.2;
  ctx.beginPath();ctx.moveTo(-28,-76);ctx.lineTo(-28,-62);ctx.stroke();
  ellipse(ctx,-28,-74,1.2,2,rgba(GLOW,.6+Math.sin(t*2)*.12));
  freckles(ctx,robe,12,0,-29,8,12);
}
function flameLick(ctx:CanvasRenderingContext2D,x:number,y:number,size:number,
  direction:number,phase:number,outer:string,inner:string):void {
  ctx.fillStyle=outer;ctx.strokeStyle=rgba("#8f4d29",.4);ctx.lineWidth=.8;
  const sway=Math.sin(phase)*size*.23;
  ctx.beginPath();ctx.moveTo(x-size*.6,y);
  ctx.bezierCurveTo(x-size*.9,y-size*.7,x+direction*size+sway,y-size*1.2,
    x+direction*size*.24+sway,y-size*1.85);
  ctx.bezierCurveTo(x+size*.62,y-size*.95,x+size*.9,y-size*.42,x+size*.52,y);
  ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle=inner;
  ctx.beginPath();ctx.moveTo(x-size*.25,y);
  ctx.quadraticCurveTo(x+size*.2+sway,y-size*.85,x+size*.04+sway,y-size*1.35);
  ctx.quadraticCurveTo(x+size*.65,y-size*.45,x+size*.3,y);
  ctx.closePath();ctx.fill();
}
function imp(ctx:CanvasRenderingContext2D,c:Palette,t:number):void {
  const hover=1.5*Math.sin(t*2.4), flicker=Math.sin(t*4.7);
  ctx.save();ctx.translate(0,hover);
  // Reference: luminous golden flame spirit, NOT a purple winged demon.
  const halo=ctx.createRadialGradient(0,-35,1,0,-35,36);
  halo.addColorStop(0,rgba("#ffe49a",.33));halo.addColorStop(1,rgba("#e88937",0));
  ellipse(ctx,0,-35,33,37,halo);
  flameLick(ctx,-11,-34,11,-1,t*2,"#dd7731","#ffe59b");
  flameLick(ctx,10,-33,10,1,t*2.3+1,"#f0a445","#fff0ac");
  flameLick(ctx,-4,-47,13,-1,t*3+2,"#e77c2a","#ffdb6c");
  flameLick(ctx,6,-50,16,1,t*2.7+1,"#e99235","#fff0af");
  // A tapering wisp replaces feet; hand, shoulders and face are human-like.
  ctx.fillStyle="#de843a";ctx.strokeStyle="#a95c33";ctx.lineWidth=1.8;
  ctx.beginPath();ctx.moveTo(-10,-17);
  ctx.bezierCurveTo(-12,-7,0,-3,-1,2+flicker);
  ctx.bezierCurveTo(7,-5,1,-11,8,-17);
  ctx.closePath();ctx.fill();ctx.stroke();
  body(ctx,0,-28,11,17,c);
  for(const side of [-1,1]){
    line(ctx,side*9,-35,side*17,-25,c,3.7);
    line(ctx,side*17,-25,side*22,-20+Math.sin(t*3+side)*1.5,c,2.4);
    ellipse(ctx,side*22,-19,2.4,3,c.light);
  }
  body(ctx,0,-45,10,11,c);
  // Crown of flickering translucent flames.
  for(let i=0;i<7;i++){
    const x=(i-3)*3.1;
    flameLick(ctx,x,-51,4+i%3*1.6,i%2?1:-1,t*3+i,
      i%2?"#f2ac46":"#e77a2e","#ffe9a4");
  }
  eye(ctx,-4,-46,{...c,eye:"#fff9ce"},2.3);
  eye(ctx,5,-46,{...c,eye:"#fff9ce"},2.3);
  ctx.strokeStyle="#a8582e";ctx.lineWidth=1.6;
  ctx.beginPath();ctx.moveTo(-3,-39);ctx.quadraticCurveTo(0,-37,3,-39);ctx.stroke();
  for(let i=0;i<9;i++){
    const x=Math.sin(i*11.9+t*.7)*22,y=-12-i*5+Math.cos(i+t)*3;
    ellipse(ctx,x,y,1.5+i%3*.5,1.2,i%2?"#ffd876":"#ffa94c");
  }
  freckles(ctx,c,14,0,-30,8,13);
  ctx.restore();
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
  const wood:Palette={...c,base:"#847052",light:"#b69a72",dark:"#554735"};
  // A vulture sits on an old branch, wings CLOSED: the source pose isn't flying.
  line(ctx,-36,-2,33,0,wood,5.7);
  line(ctx,-5,-1,-14,8,wood,3.8);
  line(ctx,21,1,30,7,wood,3.8);
  for(const side of [-1,1]){
    line(ctx,side*6,-15,side*8,-4,
      {...c,base:"#a06b67",light:"#e5ad95",dark:"#764d52"},3.4);
    for(let claw=-1;claw<=1;claw++){
      ctx.strokeStyle="#685059";ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(side*8,-4);
      ctx.quadraticCurveTo(side*8+claw*3,-1,side*8+claw*5,1);ctx.stroke();
    }
  }
  body(ctx,0,-29,16,23,c,-.18);
  // Folded dark primary feathers, tapering to a hanging tail.
  ctx.fillStyle="#34353f";ctx.strokeStyle=OUTLINE;ctx.lineWidth=1.6;
  ctx.beginPath();ctx.moveTo(-7,-43);
  ctx.bezierCurveTo(13,-49,21,-31,13,-12);
  ctx.quadraticCurveTo(5,-10,2,-8);
  ctx.quadraticCurveTo(-4,-21,-7,-43);ctx.closePath();ctx.fill();ctx.stroke();
  for(let i=0;i<7;i++){
    const x=8+i*.95;
    ctx.strokeStyle=i%2?"#696b73":"#97969d";ctx.lineWidth=1.4;
    ctx.beginPath();ctx.moveTo(-3+i*.7,-40+i*1.7);
    ctx.quadraticCurveTo(x+5,-26,x,-12+i*.4);ctx.stroke();
  }
  for(let i=0;i<6;i++){
    tip(ctx,-5+i*3,-9,2.6,7,i%2?c.base:c.dark);
  }
  // Gray-white ruff encircles an exposed pink, bald head and hooked beak.
  for(let i=0;i<9;i++){
    const x=-12+i*2.4;
    tip(ctx,x,-44+i%3*1.8,3,7,i%2?"#dfd2bc":"#aba5a2");
  }
  body(ctx,-5,-47,9,11,{...c,base:"#c88791",light:"#efb9ac",dark:"#775667"},-.08);
  body(ctx,-8,-59+Math.sin(t*1.2)*.6,8,8,
    {...c,base:"#bb7e85",light:"#e6acaa",dark:"#7b5262"});
  eye(ctx,-11,-60,{...c,eye:"#e3cf9b"},2.2);
  // Dark, hooked, downward-pointing carrion beak.
  ctx.fillStyle="#3c3b45";ctx.strokeStyle=OUTLINE;ctx.lineWidth=1.2;
  ctx.beginPath();ctx.moveTo(-14,-61);
  ctx.quadraticCurveTo(-25,-60,-26,-55);
  ctx.lineTo(-21,-52);ctx.quadraticCurveTo(-19,-56,-13,-56);
  ctx.closePath();ctx.fill();ctx.stroke();
  ellipse(ctx,-18,-58,2.2,1,"#ad9b72",-.2);
  freckles(ctx,c,13,3,-28,8,16);
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
  // Layered purple-pink petals around a golden flower center.
  for(let i=0;i<8;i++){
    const a=i*TAU/8+t*.01;
    ellipse(ctx,Math.cos(a)*6,-52+Math.sin(a)*5,3.2,2.2,
      i%2?"#b86bc2":"#f087af",a);
    ellipse(ctx,Math.cos(a)*5,-52+Math.sin(a)*4,1.3,.8,"#ffcf7a",a);
  }
  ellipse(ctx,0,-52,2.3,2.4,"#ffd75a");
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
  const pose=monsterPose(actor,time);
  ctx.translate(pose.sway,pose.lift);
  ctx.rotate(pose.tilt);
  ctx.scale(pose.stretchX,pose.stretchY);
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
