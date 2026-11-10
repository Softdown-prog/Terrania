/**
 * Rato das Dunas — direção de arte específica. O desenho base define silhueta
 * e colisão visual; esta camada acrescenta matéria, expressão e estados.
 * Referência: roedor de dunas, pelagem áspera, mordida infecciosa e fuga rápida.
 * Não decide acerto, dano ou loot: usa apenas dados reais da simulação.
 */
import type { DesertCommonVisual } from "../../../regionalWave3.ts";
import { clamp01, ellipse, hashString, rgba, TAU } from "../../../draw.ts";
import type { Palette } from "../../shared/southGeometry.ts";
import { body, line, tip, eye, freckles, OUTLINE } from "../../shared/southGeometry.ts";
const P = {
  fur:"#97806a", ridge:"#5b4b40", highlight:"#ead5ad", shadow:"#322d2b",
  undercoat:"#d2b98a", ear:"#cc8b82", inner:"#7c4a48",
  claw:"#d9cba4", infected:"#90c66a", glint:"#fff5d7", dirt:"#8b6b49",
} as const;

function coat(ctx:CanvasRenderingContext2D,seed:number,time:number):void {
  ctx.save();
  ctx.beginPath();ctx.ellipse(-1,-14,16,10,0,0,TAU);ctx.clip();
  const grad=ctx.createLinearGradient(-12,-24,14,-6);
  grad.addColorStop(0,rgba(P.highlight,.43));
  grad.addColorStop(.42,rgba(P.fur,.11));
  grad.addColorStop(1,rgba(P.ridge,.4));
  ctx.fillStyle=grad;ctx.fillRect(-18,-26,38,23);
  // Fibras direcionalmente alinhadas; densidade fixa, sem ruído por frame.
  for(let row=0;row<5;row++)for(let col=0;col<13;col++){
    const u=(col+.5)/13, v=(row+.5)/5;
    const x=-17+u*34, y=-25+v*24;
    const wrinkle=Math.sin(col*13.17+row*9.3+seed*12)*1.2;
    ctx.strokeStyle=rgba((row+col)%4===0?P.highlight:P.ridge,.3+.12*u);
    ctx.lineWidth=.42+(row%3)*.14;
    ctx.beginPath();ctx.moveTo(x,y);
    ctx.quadraticCurveTo(x-2,y-1.6+wrinkle,x-4.2,y-2);
    ctx.stroke();
  }
  // Uma única respiração sutil de pele, sem "piscar" de textura por frame.
  ctx.strokeStyle=rgba(P.undercoat,.42);
  ctx.lineWidth=.65;
  ctx.beginPath();ctx.moveTo(1,-20);
  ctx.quadraticCurveTo(7,-18+Math.sin(time*1.6)*.3,12,-14);ctx.stroke();
  ctx.restore();
}

function spines(ctx:CanvasRenderingContext2D,seed:number):void {
  for(let n=0;n<19;n++){
    const t=n/18, x=-16+t*31;
    const arch=Math.sin(t*Math.PI);
    const y=-21-arch*5;
    const height=2.8+arch*3.5+Math.sin(n*5.31+seed*8)*.7;
    ctx.fillStyle=n%5===0?P.highlight:n%2===0?P.fur:P.ridge;
    ctx.strokeStyle=P.shadow;ctx.lineWidth=.45;
    ctx.beginPath();ctx.moveTo(x-1,y);
    ctx.quadraticCurveTo(x-2.4,y-height*.56,x-.8,y-height);
    ctx.quadraticCurveTo(x+.6,y-height*.58,x+1.1,y);
    ctx.closePath();ctx.fill();ctx.stroke();
    ctx.strokeStyle=rgba(P.glint,.22);ctx.lineWidth=.4;
    ctx.beginPath();ctx.moveTo(x-.7,y-.7);
    ctx.lineTo(x-.8,y-height+1);ctx.stroke();
  }
}

function tail(ctx:CanvasRenderingContext2D,phase:number):void {
  // Três volumes recobrem a cauda já desenhada e acompanham a passada real.
  const twitch=Math.sin(phase*1.8)*2;
  const points:[[number,number],[number,number],[number,number],[number,number]]=[
    [12,-9],[20,-7],[29,-17],[35+twitch,-18],
  ];
  for(let i=0;i<points.length-1;i++){
    const [x,y]=points[i]!, [nextX,nextY]=points[i+1]!;
    ctx.strokeStyle=P.shadow;ctx.lineWidth=4.5-i*.4;
    ctx.lineCap="round";ctx.beginPath();ctx.moveTo(x,y);
    ctx.quadraticCurveTo((x+nextX)/2+2,(y+nextY)/2+1,nextX,nextY);ctx.stroke();
    ctx.strokeStyle=i%2?P.ear:P.inner;ctx.lineWidth=2.2-i*.2;ctx.stroke();
    ctx.strokeStyle=rgba(P.glint,.48);ctx.lineWidth=.6;ctx.stroke();
  }
  for(let i=0;i<8;i++){
    const t=i/7,x=17+t*17,y=-9-9*Math.sin(t*Math.PI);
    ctx.strokeStyle=rgba(P.inner,.75);ctx.lineWidth=.8;
    ctx.beginPath();ctx.moveTo(x-1,y-1);ctx.lineTo(x+1.4,y+2);ctx.stroke();
  }
}

function whiskers(ctx:CanvasRenderingContext2D,time:number):void {
  for(const side of [-1,1]){
    for(let i=0;i<5;i++){
      const originX=-22+side*1.3,originY=-16+i*.57;
      const sway=Math.sin(time*2.8+i*.8)*.65;
      ctx.strokeStyle=i%2?rgba(P.glint,.81):rgba(P.undercoat,.96);
      ctx.lineWidth=.44+i%2*.15;ctx.beginPath();
      ctx.moveTo(originX,originY);
      ctx.bezierCurveTo(-27,-17+side*i,-34,-20+side*(i*2+sway),
        -40-i*.7,-19+side*(i*2+sway));ctx.stroke();
      ellipse(ctx,-23+i*.2,-16+i*.6,.36,.4,P.shadow);
    }
  }
}
function paws(ctx:CanvasRenderingContext2D,phase:number):void{
  for(const [index,x,y] of [[0,-14,-2],[1,-7,0],[2,9,-2],[3,13,-1]] as const){
    const step=Math.sin(phase+index*Math.PI)*1.5;
    ellipse(ctx,x+step,y,4.8,2.5,P.shadow);
    ellipse(ctx,x+step-.7,y-.8,3.5,1.6,P.fur);
    for(let claw=-1;claw<=1;claw++){
      ctx.strokeStyle=P.claw;ctx.lineWidth=.65;
      ctx.beginPath();ctx.moveTo(x+step+claw*2.5,y);
      ctx.lineTo(x+step+claw*2.5-1,y+2.8);ctx.stroke();
    }
  }
}
function face(ctx:CanvasRenderingContext2D,time:number,seed:number,hp:number,maxHp:number):void {
  const blink=Math.sin(time*.94+seed*11)>.992;
  for(const x of [-20,-8]){
    const pink=ctx.createRadialGradient(x-1,-28,0,x,-26,5.5);
    pink.addColorStop(0,P.ear);pink.addColorStop(1,P.inner);
    ellipse(ctx,x,-26,3.1,4.1,pink);
    ctx.strokeStyle=rgba(P.glint,.3);ctx.lineWidth=.6;ctx.beginPath();
    ctx.ellipse(x-.8,-27,1.2,2,0,-Math.PI*.6,Math.PI*.2);ctx.stroke();
  }
  ellipse(ctx,-17,-20,2.8,blink?.5:2.5,P.shadow);
  if(!blink){
    ellipse(ctx,-17.6,-20.5,1.55,1.6,"#e6b75e");
    ellipse(ctx,-18,-21,.55,.65,P.glint);
  }
  ellipse(ctx,-23.5,-15.7,2.5,1.8,P.inner);
  ellipse(ctx,-24,-16.2,.6,.5,P.glint);
  ctx.strokeStyle=P.shadow;ctx.lineWidth=.85;
  ctx.beginPath();ctx.moveTo(-23,-14);ctx.quadraticCurveTo(-19,-11,-16,-14);ctx.stroke();
  for(let i=0;i<2;i++){
    ctx.fillStyle=P.claw;ctx.beginPath();
    ctx.moveTo(-20+i*3,-13);ctx.lineTo(-19+i*3,-9.5);ctx.lineTo(-18+i*3,-13);
    ctx.closePath();ctx.fill();
  }
  const wound=1-clamp01(hp/maxHp);
  if(wound>.4){
    ctx.strokeStyle=rgba("#8c494c",.3+wound*.6);ctx.lineWidth=.9;
    ctx.beginPath();ctx.moveTo(-11,-23);ctx.lineTo(-8,-18);ctx.lineTo(-10,-14);ctx.stroke();
  }
}
function dust(ctx:CanvasRenderingContext2D,moving:number,phase:number,seed:number):void {
  if(moving<.08)return;
  for(let i=0;i<12;i++){
    const f=i/12,x=9+f*24+Math.sin(seed*12+i*3.8)*2;
    const y=1+Math.sin(phase+i*1.2)*2.2;
    ellipse(ctx,x,y,1.1+f*1.2,.55+f*.5,rgba(i%2?P.dirt:P.highlight,(1-f)*moving*.36));
  }
}
function infection(ctx:CanvasRenderingContext2D,casting:number,time:number):void{
  if(casting<=.02){
    ellipse(ctx,-24,-10,1.1,2.1,rgba(P.infected,.64));
    ellipse(ctx,-26,-8,.7,1.2,rgba(P.infected,.36));
    return;
  }
  const a=clamp01(casting);
  const g=ctx.createRadialGradient(-21,-12,0,-21,-12,15);
  g.addColorStop(0,rgba(P.infected,.55*a));g.addColorStop(1,rgba(P.infected,0));
  ellipse(ctx,-21,-12,15,13,g);
  for(let i=0;i<6;i++){
    const y=-11+i*1.7+Math.sin(time*2+i)*1.1;
    ellipse(ctx,-28-i*.65,y,1.1,.7,rgba(P.infected,a*(1-i/7)));
  }
}
/** Material/partes anatômicas que reagem a passos, ferimentos e mordida real. */
export function renderDuneRatDetail(ctx:CanvasRenderingContext2D,actor:DesertCommonVisual,time:number):void{
  const seed=hashString(actor.id??"dune-rat");
  const phase=actor.motionPhase??0, moving=clamp01(actor.moving??0);
  const maxHp=35;
  coat(ctx,seed,time);
  spines(ctx,seed);
  tail(ctx,phase);
  paws(ctx,phase);
  face(ctx,time,seed,actor.hp,maxHp);
  whiskers(ctx,time);
  dust(ctx,moving,phase,seed);
  infection(ctx,actor.casting??0,time);
}
export const rat = (ctx:CanvasRenderingContext2D,c:Palette,t:number):void => {
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
};
