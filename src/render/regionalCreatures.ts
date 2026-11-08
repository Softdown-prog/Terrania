import { CREATURE_CATALOG, type RegionalCreatureKind } from "../actors/CreatureCatalog.ts";
import { clamp01, ellipse, hashString, limb, mix, pill, rgba, shade, softShadow, TAU } from "./draw.ts";

export interface RegionalCreatureVisual {
  readonly kind: RegionalCreatureKind;
  readonly hp: number;
  readonly id?: string;
  readonly hurtTime?: number;
  readonly casting?: number;
}
type ColorRamp = { base: string; light: string; dark: string; accent: string; eye: string };
const PALETTE: Readonly<Record<RegionalCreatureKind, ColorRamp>> = {
  "basalt-golem": { base: "#716f6b", light: "#b4a79a", dark: "#343944", accent: "#729267", eye: "#ffbf59" },
  "cliff-draconid": { base: "#66646a", light: "#b0a499", dark: "#292d3b", accent: "#e38b4f", eye: "#f7bb4d" },
  "mire-hydra": { base: "#4bba66", light: "#a0e375", dark: "#376a56", accent: "#ad54b1", eye: "#b6f6ef" },
  "dune-scorpion": { base: "#b88842", light: "#f2d184", dark: "#504636", accent: "#f4a345", eye: "#ffd46c" },
  "solar-scarab": { base: "#ab713d", light: "#eec37d", dark: "#443442", accent: "#f0a859", eye: "#ffe09a" },
  "boreal-yeti": { base: "#8dbed4", light: "#e5f5f0", dark: "#376184", accent: "#9edcf1", eye: "#293750" },
  "glacial-wolf": { base: "#368cc4", light: "#a0f0fd", dark: "#24436e", accent: "#5bccf9", eye: "#e9fcfc" },
  "frost-spirit": { base: "#519bcc", light: "#dcf7ff", dark: "#205c8e", accent: "#83e4ff", eye: "#cffaff" },
  "coral-crab": { base: "#af6745", light: "#f3a36d", dark: "#5a3d43", accent: "#7ab79a", eye: "#fff1b6" },
  "storm-serpent": { base: "#4653ac", light: "#79d1de", dark: "#302656", accent: "#d37ad8", eye: "#fce46f" },
};
const OUTLINE = "#142a2a", GLINT = "#fff6dc";

function organic(ctx: CanvasRenderingContext2D, x: number, y: number,
  rx: number, ry: number, ramp: ColorRamp, turn = 0): void {
  const gradient = ctx.createLinearGradient(x - rx, y - ry, x + rx, y + ry);
  gradient.addColorStop(0, ramp.light);
  gradient.addColorStop(.42, ramp.base);
  gradient.addColorStop(1, ramp.dark);
  ellipse(ctx, x, y, rx, ry, gradient, turn);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, turn, 0, TAU); ctx.stroke();
  ctx.strokeStyle = rgba(GLINT, .37);
  ctx.lineWidth = .95;
  ctx.beginPath(); ctx.ellipse(x - 1.2, y - 1.4, Math.max(1, rx - 2), Math.max(1, ry - 2),
    turn, Math.PI * 1.04, Math.PI * 1.89); ctx.stroke();
}
function shard(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number,
  rise: number, fill: string, glow = GLINT): void {
  ctx.fillStyle = OUTLINE; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.25;
  ctx.beginPath(); ctx.moveTo(x - rx, y); ctx.lineTo(x - rx * .38, y - rise * .65);
  ctx.lineTo(x + rx * .13, y - rise); ctx.lineTo(x + rx, y - rise * .1);
  ctx.lineTo(x + rx * .42, y + rx * .35); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = fill; ctx.beginPath();
  ctx.moveTo(x - rx + 1.5, y - 1); ctx.lineTo(x + rx * .13, y - rise + 2);
  ctx.lineTo(x + rx * .04, y - 2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba(glow, .7); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x - rx * .3, y - rise * .5); ctx.lineTo(x + rx * .13, y - rise + 3); ctx.stroke();
}
function headEyes(ctx: CanvasRenderingContext2D, points: readonly (readonly [number,number])[],
  c: ColorRamp, size = 2): void {
  for (const [x, y] of points) {
    ellipse(ctx, x, y, size + .8, size + .25, OUTLINE);
    ellipse(ctx, x, y - .3, size, size * .62, c.eye);
    ellipse(ctx, x - .45, y - .75, .65, .55, GLINT);
  }
}
function curvedLeg(ctx: CanvasRenderingContext2D, x1: number, y1: number,
  x2: number, y2: number, x3: number, y3: number, c: ColorRamp, width = 5): void {
  limb(ctx, x1, y1, x2, y2, width + 2.5, OUTLINE);
  limb(ctx, x1, y1, x2, y2, width, c.dark);
  limb(ctx, x2, y2, x3, y3, width + 1.8, OUTLINE);
  limb(ctx, x2, y2, x3, y3, width - .7, c.base);
  ellipse(ctx, x2, y2, width * .55, width * .6, c.light);
}
function carapaceDetail(ctx: CanvasRenderingContext2D, x: number, y: number,
  rx: number, ry: number, c: ColorRamp, count = 8): void {
  for (let i = 0; i < count; i++) {
    const a = i * 2.39996;
    const r = Math.sqrt((i + .5) / count);
    const px = x + Math.cos(a) * rx * r, py = y + Math.sin(a) * ry * r;
    ellipse(ctx, px, py, 1.2 + i % 3, .7 + i % 2, i % 3 === 0 ? c.accent : shade(c.light, -.28), a);
    ellipse(ctx, px - .6, py - .5, .65, .42, rgba(GLINT, .55));
  }
}
function drawBasaltGolem(ctx: CanvasRenderingContext2D, c: ColorRamp): void {
  for (const s of [-1,1]) {
    curvedLeg(ctx, s * 9, -12, s * 12, -3, s * 13, 1, c, 11);
    organic(ctx, s * 14, -25, 13, 11, c, s * .2);
    curvedLeg(ctx, s * 19, -24, s * 25, -16, s * 27, -5, c, 9);
    organic(ctx, s * 27, -4, 9, 7, c);
  }
  organic(ctx, 0, -25, 19, 22, c);
  organic(ctx, 0, -46, 12, 11, c);
  for (let i = 0; i < 7; i++) {
    const y = -42 + i * 5;
    ctx.strokeStyle = i % 2 ? c.dark : c.accent; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(-10 + i % 3, y); ctx.lineTo(-3, y + 2);
    ctx.lineTo(2 + i % 4, y - 1); ctx.stroke();
  }
  for (const s of [-1,1]) shard(ctx, s * 22, -32, 6, 7, c.accent, c.light);
  headEyes(ctx,[[-5,-48],[5,-48]],c,2.5);
  ctx.strokeStyle = c.dark; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-5,-41);ctx.lineTo(5,-41);ctx.stroke();
}
function drawDraconid(ctx: CanvasRenderingContext2D, c: ColorRamp, time: number): void {
  ctx.fillStyle = c.dark; ctx.strokeStyle = c.light; ctx.lineWidth = 1.3;
  for (const s of [-1,1]) {
    ctx.beginPath(); ctx.moveTo(s*6,-30);ctx.quadraticCurveTo(s*25,-67+Math.sin(time*2)*2,s*34,-50);
    ctx.lineTo(s*24,-43);ctx.lineTo(s*30,-34);ctx.lineTo(s*13,-28);ctx.closePath();ctx.fill();ctx.stroke();
    curvedLeg(ctx,s*8,-13,s*13,-6,s*16,1,c,5);
  }
  ctx.strokeStyle = OUTLINE;ctx.lineWidth = 9;
  ctx.beginPath();ctx.moveTo(12,-13);ctx.quadraticCurveTo(33,-11,29,-28);ctx.stroke();
  ctx.strokeStyle = c.base;ctx.lineWidth = 6;ctx.stroke();
  organic(ctx,0,-26,15,19,c,.09);
  organic(ctx,0,-47,12,11,c,-.15);
  for(const s of [-1,1]){
    shard(ctx,s*9,-56,5,12,c.light);
    curvedLeg(ctx,s*12,-34,s*17,-22,s*19,-15,c,4);
  }
  carapaceDetail(ctx,0,-26,11,14,c,11);
  headEyes(ctx,[[-4,-49],[5,-49]],c,2.1);
  shard(ctx,0,-38,4,5,c.accent);
}
function drawHydra(ctx: CanvasRenderingContext2D, c: ColorRamp, time: number): void {
  organic(ctx,0,-8,26,11,c);
  for(let h=0;h<3;h++){
    const s=h-1, n=Math.sin(time*1.6+h)*1.4;
    ctx.strokeStyle=OUTLINE;ctx.lineWidth=12;
    ctx.beginPath();ctx.moveTo(s*12,-12);ctx.bezierCurveTo(s*24,-26,s*12,-40,s*16+n,-52+(h%2)*7);ctx.stroke();
    ctx.strokeStyle=c.base;ctx.lineWidth=9;ctx.stroke();
    organic(ctx,s*16+n,-53+(h%2)*7,8,7,c,s*.13);
    headEyes(ctx,[[s*16+n-2,-55+(h%2)*7],[s*16+n+4,-55+(h%2)*7]],c,1.65);
    ellipse(ctx,s*16+n+5,-49+(h%2)*7,3,1.2,c.dark);
  }
  for(let i=0;i<12;i++){
    const x=Math.sin(i*8.19)*20,y=-8+Math.cos(i*9.1)*5;
    ellipse(ctx,x,y,3.2,1.9,i%2?c.accent:c.light);
  }
  carapaceDetail(ctx,0,-12,21,6,c,12);
}
function drawScorpion(ctx: CanvasRenderingContext2D, c: ColorRamp): void {
  for(const s of [-1,1]){
    for(let i=0;i<4;i++)curvedLeg(ctx,s*(9+i*2),-12+i*2,s*(20+i*2),-9+i*3,s*(25+i*3),-2+i,c,3);
    curvedLeg(ctx,s*11,-22,s*24,-24,s*30,-13,c,7);
    organic(ctx,s*30,-13,9,7,c,s*.3);
    shard(ctx,s*38,-14,5,11,c.light);
  }
  organic(ctx,0,-20,17,14,c);
  carapaceDetail(ctx,0,-20,14,11,c,12);
  const points:[[number,number],[number,number],[number,number],[number,number]]=[
    [10,-28],[16,-39],[11,-53],[1,-59]];
  for(let i=0;i<points.length;i++){
    const p=points[i]!;
    organic(ctx,p[0],p[1],7-i*.6,6-i*.4,c,-.2);
  }
  shard(ctx,-4,-61,6,17,c.accent);
  headEyes(ctx,[[-4,-25],[4,-25]],c,1.7);
}
function drawScarab(ctx: CanvasRenderingContext2D,c:ColorRamp,time:number):void {
  for(const s of [-1,1]){
    for(let i=0;i<3;i++)curvedLeg(ctx,s*(10+i*2),-15+i*5,s*(20+i*3),-20+i*6,s*(27+i*2),-4+i*4,c,3);
    shard(ctx,s*12,-27,5,18,c.light);
  }
  organic(ctx,0,-17,20,16,c);
  ctx.strokeStyle=c.dark;ctx.lineWidth=2.5;
  ctx.beginPath();ctx.moveTo(0,-31);ctx.quadraticCurveTo(-2,-18,0,-3);ctx.stroke();
  ctx.strokeStyle=c.accent;ctx.lineWidth=1.7;
  for(let i=0;i<4;i++) {
    ctx.beginPath();ctx.arc(0,-18,7+i*3,Math.PI*1.15,Math.PI*1.85);ctx.stroke();
  }
  carapaceDetail(ctx,0,-17,15,12,c,15);
  headEyes(ctx,[[-6,-29],[6,-29]],c,1.7);
  const glow=.15+.1*Math.sin(time*3);
  ellipse(ctx,0,-21,11,8,rgba(GLINT,glow));
}
function drawYeti(ctx:CanvasRenderingContext2D,c:ColorRamp):void {
  for(const s of [-1,1]){
    organic(ctx,s*11,-8,10,11,c);
    curvedLeg(ctx,s*14,-32,s*25,-23,s*29,-5,c,12);
    for(let i=0;i<5;i++)shard(ctx,s*(20+i%3*4),-23+i*4,3,7,c.light);
  }
  organic(ctx,0,-30,20,24,c);
  organic(ctx,0,-50,15,15,c);
  for(let i=0;i<9;i++){
    const a=i*TAU/9,x=Math.sin(a)*16,y=-32+Math.cos(a)*16;
    shard(ctx,x,y+4,4,8,c.light,c.accent);
  }
  for(const s of [-1,1])shard(ctx,s*11,-60,6,14,c.dark);
  organic(ctx,0,-45,9,8,{...c,base:shade(c.base,-.25)},.1);
  headEyes(ctx,[[-5,-52],[5,-52]],c,2.3);
  ellipse(ctx,0,-43,3,2.1,OUTLINE);
}
function drawWolf(ctx:CanvasRenderingContext2D,c:ColorRamp,time:number):void {
  ctx.strokeStyle=OUTLINE;ctx.lineWidth=9;
  ctx.beginPath();ctx.moveTo(-18,-21);ctx.quadraticCurveTo(-33,-37+Math.sin(time*2)*2,-32,-42);ctx.stroke();
  ctx.strokeStyle=c.light;ctx.lineWidth=5;ctx.stroke();
  for(const s of [-1,1])for(const x of [-11,12]){
    curvedLeg(ctx,x+s*2,-16,x+s*3,-8,x+s*4,0,c,4);
  }
  organic(ctx,0,-25,23,12,c);
  organic(ctx,17,-35,13,11,c,.19);
  organic(ctx,28,-29,10,5,c,.09);
  for(let i=0;i<7;i++)shard(ctx,-16+i*6,-31-(i%2)*3,4,10+i%3*3,c.accent);
  for(const s of [-1,1])shard(ctx,15+s*7,-42,5,14,c.light);
  headEyes(ctx,[[21,-39],[30,-37]],c,1.9);
  ellipse(ctx,36,-29,2.2,1.6,OUTLINE);
}
function drawSpirit(ctx:CanvasRenderingContext2D,c:ColorRamp,time:number):void {
  for(let i=0;i<7;i++){
    const y=-7-i*6,rx=3+i*2.8;
    organic(ctx,Math.sin(time*1.8+i*.7)*2,y,rx,4,c,Math.sin(i)*.1);
  }
  for(let i=0;i<11;i++){
    const a=i*2.4+time*.7,r=13+(i%3)*5;
    shard(ctx,Math.cos(a)*r,-29+Math.sin(a)*16,3,7,c.light);
  }
  organic(ctx,0,-41,20,11,c);
  ellipse(ctx,0,-42,17,7,rgba(c.accent,.38));
  headEyes(ctx,[[-9,-43],[9,-43]],c,3.2);
  ctx.strokeStyle=GLINT;ctx.lineWidth=1.7;
  for(let k=0;k<3;k++){
    ctx.beginPath();ctx.arc(0,-40,14+k*3,Math.PI*.14,Math.PI*.83);ctx.stroke();
  }
}
function drawCrab(ctx:CanvasRenderingContext2D,c:ColorRamp,time:number):void {
  for(const s of [-1,1]){
    for(let i=0;i<3;i++)curvedLeg(ctx,s*14,-11,s*(20+i*4),-4+i*3,s*(21+i*5),3+i,c,4);
    curvedLeg(ctx,s*16,-21,s*27,-20,s*32,-9,c,8);
    organic(ctx,s*33,-9,12,10,c);
    shard(ctx,s*39,-11,5,10,c.light);
  }
  organic(ctx,0,-20,22,16,c);
  for(let i=0;i<9;i++){
    const x=Math.sin(i*5.1)*15, y=-32+Math.cos(i*3.7)*5;
    ctx.strokeStyle=i%2?c.accent:c.light;ctx.lineWidth=2.5;
    ctx.beginPath();ctx.moveTo(x,y+8);ctx.quadraticCurveTo(x+Math.sin(i)*4,y-4,
      x+Math.sin(time*.5+i)*3,y-11);ctx.stroke();
    shard(ctx,x,y-6,3,6,i%2?c.accent:c.light);
  }
  carapaceDetail(ctx,0,-23,18,12,c,12);
  headEyes(ctx,[[-7,-22],[7,-22]],c,2);
}
function drawSerpent(ctx:CanvasRenderingContext2D,c:ColorRamp,time:number):void {
  ctx.strokeStyle=OUTLINE;ctx.lineWidth=19;ctx.lineCap="round";
  ctx.beginPath();ctx.moveTo(-4,-9);ctx.bezierCurveTo(26,4,30,-13,15,-24);
  ctx.bezierCurveTo(-3,-38,-21,-22,-14,-45);ctx.stroke();
  ctx.strokeStyle=c.base;ctx.lineWidth=15;ctx.stroke();
  ctx.strokeStyle=c.light;ctx.lineWidth=4.2;ctx.stroke();
  organic(ctx,-14,-48,13,10,c,-.18);
  organic(ctx,-21,-44,12,5,c,.1);
  for(let i=0;i<7;i++){
    shard(ctx,-3+Math.sin(i*1.5)*20,-18-i*4,4,10+(i%3)*2,
      i%2?c.accent:c.light);
  }
  headEyes(ctx,[[-19,-51],[-10,-50]],c,2.4);
  ctx.strokeStyle=c.accent;ctx.lineWidth=1.4;
  for(let i=0;i<4;i++) {
    ctx.beginPath();ctx.moveTo(10+i*2,-27-i*3);
    ctx.lineTo(16+i*2+Math.sin(time*3+i),-30-i*4);
    ctx.lineTo(13+i*2,-35-i*4);ctx.stroke();
  }
  shard(ctx,-8,-58,7,12,c.accent);
  // Secondary conductor facets along the crest; real silhouette depth,
  // not a relaxed quality threshold.
  ellipse(ctx,-5,-59,3.1,1.8,c.dark,-.4);
  ellipse(ctx,-5.7,-59.6,1.1,.6,rgba(GLINT,.73),-.4);
}
/** Dez silhuetas próprias; volumes, detalhes e animações são geometria Canvas, sem sprites. */
export function renderRegionalCreature(ctx: CanvasRenderingContext2D,
  creature: RegionalCreatureVisual, sx: number, sy: number, time = 0): void {
  const c=PALETTE[creature.kind], seed=hashString(creature.id ?? creature.kind);
  const max=CREATURE_CATALOG[creature.kind].maxHp;
  const flash=clamp01((creature.hurtTime ?? 0)/.24);
  ctx.save();ctx.translate(sx,sy);
  softShadow(ctx,0,3,25,7,.34);
  const float=creature.kind==="frost-spirit" || creature.kind==="storm-serpent";
  ctx.translate(0,float?Math.sin(time*2+seed*6)*2:Math.sin(time*2.7+seed*4)*.65);
  if(flash>.01)ctx.globalAlpha=1;
  switch(creature.kind) {
    case "basalt-golem": drawBasaltGolem(ctx,c);break;
    case "cliff-draconid": drawDraconid(ctx,c,time);break;
    case "mire-hydra": drawHydra(ctx,c,time);break;
    case "dune-scorpion": drawScorpion(ctx,c);break;
    case "solar-scarab": drawScarab(ctx,c,time);break;
    case "boreal-yeti": drawYeti(ctx,c);break;
    case "glacial-wolf": drawWolf(ctx,c,time);break;
    case "frost-spirit": drawSpirit(ctx,c,time);break;
    case "coral-crab": drawCrab(ctx,c,time);break;
    case "storm-serpent": drawSerpent(ctx,c,time);break;
  }
  // Micro-reflexos e grãos da matéria completam o volume sem textura externa.
  for(let i=0;i<7;i++){
    const px=Math.sin(i*23.1+seed*17)*14,py=-9-Math.abs(Math.cos(i*11.7+seed))*23;
    ellipse(ctx,px,py,1.1+i%3*.5,.55+i%2*.25,i%2?rgba(c.accent,.6):rgba(c.light,.6));
    ellipse(ctx,px-.4,py-.7,.5,.3,rgba(GLINT,.55));
  }
  if(flash>.02){
    ellipse(ctx,0,-28,26,29,rgba(GLINT,flash*.29));
  }
  if((creature.casting??0)>0){
    ctx.strokeStyle=rgba(c.accent,.38+clamp01(creature.casting??0)*.55);
    ctx.lineWidth=2.2;
    ctx.beginPath();ctx.arc(0,-18,26,0,TAU);ctx.stroke();
  }
  ctx.restore();
  // Barra de vida só aparece quando sofreu dano.
  if(creature.hp<max){
    const value=clamp01(creature.hp/max);
    ctx.save();ctx.translate(sx,sy);
    ctx.fillStyle=rgba(OUTLINE,.85);pill(ctx,-17,-73,34,6);ctx.fill();
    ctx.fillStyle=mix("#d85f45","#a6e08f",value);pill(ctx,-15,-71.7,30*value,3);ctx.fill();
    ctx.fillStyle=rgba(GLINT,.6);ctx.fillRect(-15,-71.7,30*value,1);
    ctx.restore();
  }
}
