/**
 * Lagarto das Areias — montaria reptiliana, NÃO um cavalo re-colorido.
 * Carapaça áspera, membranas, escamas com direção, crista e sela rígida.
 */
import { ellipse, rgba, TAU, clamp01 } from "../../draw.ts";
const C={
  deep:"#2c4238",base:"#83995f",lit:"#c3d7a1",gold:"#d6aa6d",
  copper:"#b87942",leather:"#774c36",bone:"#efe0b5",black:"#202c2b",
  lime:"#b6d15b",mud:"#776b50",glint:"#fff3d6",
} as const;
function ridge(ctx:CanvasRenderingContext2D,time:number):void{
  const ridge=ctx.createLinearGradient(-22,-51,34,-19);
  ridge.addColorStop(0,C.lit);ridge.addColorStop(.45,C.base);ridge.addColorStop(1,C.deep);
  ctx.fillStyle=ridge;ctx.strokeStyle=C.black;ctx.lineWidth=1.4;
  ctx.beginPath();ctx.moveTo(-28,-31);
  ctx.bezierCurveTo(-19,-45,5,-51,19,-40);
  ctx.quadraticCurveTo(32,-31,28,-21);ctx.quadraticCurveTo(1,-19,-28,-25);
  ctx.closePath();ctx.fill();ctx.stroke();
  for(let i=0;i<13;i++){
    const t=i/12,x=-26+t*56,y=-35-Math.sin(t*Math.PI)*12;
    ctx.fillStyle=i%3===0?C.gold:C.lit;ctx.strokeStyle=C.deep;ctx.lineWidth=.6;
    ctx.beginPath();ctx.moveTo(x-3,y+4);
    ctx.lineTo(x,y-5-Math.sin(time*.8+i)*.3);ctx.lineTo(x+4,y+4);
    ctx.closePath();ctx.fill();ctx.stroke();
    ctx.strokeStyle=rgba(C.glint,.6);ctx.lineWidth=.55;
    ctx.beginPath();ctx.moveTo(x-.5,y-4);ctx.lineTo(x+2,y+2);ctx.stroke();
  }
}
function armoredScales(ctx:CanvasRenderingContext2D):void{
  ctx.save();ctx.beginPath();ctx.ellipse(-1,-27,24,13,-.09,0,TAU);ctx.clip();
  const grad=ctx.createLinearGradient(-22,-43,21,-12);
  grad.addColorStop(0,rgba(C.lit,.48));grad.addColorStop(1,rgba(C.deep,.33));
  ctx.fillStyle=grad;ctx.fillRect(-27,-44,54,35);
  for(let row=0;row<6;row++)for(let col=0;col<12;col++){
    const x=-26+col*4.8+row%2*2.2,y=-40+row*5;
    ctx.fillStyle=(row+col)%4===0?C.lit:(row+col)%3===0?C.gold:C.base;
    ctx.strokeStyle=rgba(C.deep,.63);ctx.lineWidth=.65;
    ctx.beginPath();ctx.moveTo(x-2,y-2);ctx.lineTo(x+1,y-4);
    ctx.lineTo(x+3.4,y-1);ctx.lineTo(x,y+2);ctx.closePath();
    ctx.fill();ctx.stroke();
    ctx.strokeStyle=rgba(C.glint,.43);ctx.lineWidth=.4;
    ctx.beginPath();ctx.moveTo(x-1.3,y-1.5);ctx.lineTo(x+.6,y-2.5);ctx.stroke();
  }
  ctx.restore();
}
function limbs(ctx:CanvasRenderingContext2D,time:number):void{
  for(const side of [-1,1])for(const x of [-17,13]){
    const moving=Math.sin(time*3.3+side+(x>0?Math.PI:0))*1.4;
    ctx.strokeStyle=C.black;ctx.lineWidth=8;ctx.lineCap="round";
    ctx.beginPath();ctx.moveTo(x,-19);
    ctx.quadraticCurveTo(x+side*12,-9+moving,x+side*15,-3);ctx.stroke();
    ctx.strokeStyle=C.base;ctx.lineWidth=5;ctx.stroke();
    ellipse(ctx,x+side*15,-1,8,3.4,C.deep);
    ellipse(ctx,x+side*15-1,-2,6,2,C.lit);
    for(let k=-1;k<=1;k++){
      const xx=x+side*15+k*4;
      ctx.fillStyle=C.bone;ctx.strokeStyle=C.deep;ctx.lineWidth=.55;
      ctx.beginPath();ctx.moveTo(xx-2,0);
      ctx.lineTo(xx-1,5);ctx.lineTo(xx+2,1);ctx.closePath();ctx.fill();ctx.stroke();
    }
  }
}
function head(ctx:CanvasRenderingContext2D,time:number):void{
  const g=ctx.createLinearGradient(14,-64,39,-33);
  g.addColorStop(0,C.lit);g.addColorStop(.6,C.base);g.addColorStop(1,C.deep);
  ctx.fillStyle=g;ctx.strokeStyle=C.black;ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(14,-39);
  ctx.quadraticCurveTo(10,-55,21,-60);
  ctx.quadraticCurveTo(34,-62,33,-52);
  ctx.lineTo(43,-45);ctx.lineTo(38,-38);
  ctx.quadraticCurveTo(22,-34,14,-39);ctx.closePath();
  ctx.fill();ctx.stroke();
  // Mandíbula móvel, sem alterar dano nem estado de combate.
  const jaw=Math.sin(time*1.2)*.4;
  ctx.fillStyle=C.deep;ctx.beginPath();ctx.moveTo(27,-42);
  ctx.lineTo(39,-42+jaw);ctx.lineTo(36,-38);ctx.lineTo(27,-39);ctx.closePath();ctx.fill();
  for(let i=0;i<4;i++){
    ctx.fillStyle=C.bone;ctx.beginPath();
    ctx.moveTo(27+i*3,-41);ctx.lineTo(28+i*3,-37);ctx.lineTo(30+i*3,-41);
    ctx.closePath();ctx.fill();
  }
  ellipse(ctx,28,-52,4.1,3.1,C.black);
  ellipse(ctx,28.4,-52.4,2.2,1.9,C.gold);
  ellipse(ctx,29,-52.6,.5,1.65,C.black);
  ellipse(ctx,27.7,-53.4,.8,.7,C.glint);
  ctx.strokeStyle=C.deep;ctx.lineWidth=1.1;
  ctx.beginPath();ctx.moveTo(23,-57);ctx.quadraticCurveTo(29,-60,33,-56);ctx.stroke();
  ellipse(ctx,40,-47,1.4,.8,C.black);
  ellipse(ctx,39.6,-47.3,.4,.3,C.glint);
}
function frills(ctx:CanvasRenderingContext2D,time:number):void{
  for(const side of [-1,1]){
    const flutter=Math.sin(time*2.2+side*.7)*.6;
    for(let i=0;i<6;i++){
      const t=i/5,x=14+t*12,y=-40-t*13+flutter;
      ctx.fillStyle=i%2?C.lime:C.gold;ctx.strokeStyle=C.deep;ctx.lineWidth=.7;
      ctx.beginPath();ctx.moveTo(x-3,y+5);
      ctx.lineTo(x+side*4,y-8);ctx.lineTo(x+4,y+4);
      ctx.closePath();ctx.fill();ctx.stroke();
      ctx.strokeStyle=rgba(C.glint,.52);ctx.lineWidth=.5;
      ctx.beginPath();ctx.moveTo(x-1,y+2);ctx.lineTo(x+side*2,y-5);ctx.stroke();
    }
  }
}
function saddle(ctx:CanvasRenderingContext2D):void{
  ctx.fillStyle=C.leather;ctx.strokeStyle=C.black;ctx.lineWidth=1.3;
  ctx.beginPath();ctx.moveTo(-18,-43);ctx.lineTo(11,-44);
  ctx.lineTo(17,-31);ctx.lineTo(-20,-31);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle=C.gold;ctx.fillRect(-14,-41,25,4);
  for(let i=0;i<7;i++){
    ctx.strokeStyle=i%2?C.copper:C.bone;ctx.lineWidth=1.3;
    const x=-12+i*4;
    ctx.beginPath();ctx.moveTo(x,-39);ctx.lineTo(x+1,-32);ctx.stroke();
  }
  ctx.strokeStyle=C.black;ctx.lineWidth=3.6;
  ctx.beginPath();ctx.moveTo(-12,-36);ctx.lineTo(-11,-14);ctx.stroke();
  ctx.strokeStyle=C.copper;ctx.lineWidth=2;ctx.stroke();
  ellipse(ctx,-11,-19,2.3,2.3,C.gold);
}
function sandTrail(ctx:CanvasRenderingContext2D,time:number):void{
  for(let i=0;i<16;i++){
    const x=-36+i*3.8,y=Math.sin(time*1.2+i)*2+2;
    ellipse(ctx,x,y,1.7+i%3*.4,.7,rgba(i%2?C.mud:C.gold,(1-i/16)*.25));
  }
}
export function renderSandBasiliskDetail(ctx:CanvasRenderingContext2D,time:number):void{
  armoredScales(ctx);ridge(ctx,time);limbs(ctx,time);
  frills(ctx,time);head(ctx,time);saddle(ctx);sandTrail(ctx,time);
}
