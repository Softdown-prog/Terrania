import type { SouthCityProp } from "../world/southCity.ts";
import { SOUTH_CITY_PALETTE as C } from "../world/southCity.ts";
/** Cenografia desenhada em Canvas, sem sprites externos: luz de cima/esquerda. */
function rect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,color:string):void{
  ctx.fillStyle=color;ctx.fillRect(x,y,w,h);
}
function ellipse(ctx:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,color:string):void{
  ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();
}
function poly(ctx:CanvasRenderingContext2D,pts:readonly (readonly [number,number])[],color:string):void{
  ctx.fillStyle=color;ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
  ctx.closePath();ctx.fill();
}
function skull(ctx:CanvasRenderingContext2D,x:number,y:number,scale=1):void{
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
  ellipse(ctx,0,-6,11,9,C.bone[1]);
  poly(ctx,[[-8,-5],[-5,6],[5,6],[8,-5]],C.bone[0]);
  ellipse(ctx,-4,-6,2.8,3.2,C.stone[2]);ellipse(ctx,4,-6,2.8,3.2,C.stone[2]);
  poly(ctx,[[0,-2],[-2,2],[2,2]],C.stone[2]);
  for(let i=-2;i<=2;i++)rect(ctx,i*2,-0.5+6,1,2,C.bone[2]);
  ctx.restore();
}
function flame(ctx:CanvasRenderingContext2D,poison:boolean,t:number):void{
  const b=poison?C.poison:C.wine,wiggle=Math.sin(t*10)*2;
  poly(ctx,[[-5,-23],[wiggle,-43],[5,-23]],b[1]);
  poly(ctx,[[-2,-25],[wiggle*.5,-37],[3,-24]],b[0]);
  ellipse(ctx,0,-26,2.3,3,C.bone[0]);
  const g=ctx.createRadialGradient(0,-30,0,0,-30,31);
  g.addColorStop(0,poison?"#8bd45050":"#bb60e050");g.addColorStop(1,"#5e244000");
  rect(ctx,-31,-61,62,62,"#00000000");
  ctx.fillStyle=g;ctx.fillRect(-31,-61,62,62);
}
function tent(ctx:CanvasRenderingContext2D,variant:number):void{
  const colors=[C.wine[0],C.wine[1],C.poison[1],C.bronze[1]][Math.abs(variant)%4]!;
  rect(ctx,-36,-18,72,20,C.clay[2]);
  poly(ctx,[[-42,-18],[-24,-49],[8,-55],[42,-23],[36,-17]],C.wine[2]);
  poly(ctx,[[-40,-20],[-24,-47],[8,-53],[0,-18]],colors);
  poly(ctx,[[0,-18],[8,-53],[40,-22],[36,-17]],C.clay[0]);
  rect(ctx,-42,-18,3,24,C.bone[2]);rect(ctx,39,-18,3,24,C.bone[2]);
}
function arena(ctx:CanvasRenderingContext2D):void{
  ellipse(ctx,0,0,94,59,C.clay[2]);ellipse(ctx,0,-8,85,50,C.clay[0]);
  ellipse(ctx,0,-6,71,38,C.sand[1]);ellipse(ctx,0,-4,61,31,C.sand[2]);
  ctx.strokeStyle=C.bone[1];ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(0,-5,80,45,0,0,Math.PI*2);ctx.stroke();
  for(let i=0;i<12;i++){const t=i*Math.PI*2/12;
    rect(ctx,Math.cos(t)*83-5,Math.sin(t)*48-14,10,7,C.clay[1]);}
}
function corral(ctx:CanvasRenderingContext2D):void{
  for(const y of [-15,21]){
    rect(ctx,-66,y,132,3,C.bone[2]);
    for(let x=-60;x<=60;x+=15)rect(ctx,x,y-9,4,15,C.clay[1]);
  }
  for(const x of [-63,63]){rect(ctx,x,-15,3,35,C.bone[2]);}
}
export function paintSouthCity(ctx:CanvasRenderingContext2D,prop:SouthCityProp,time:number):void{
  switch(prop.kind){
    case "tent":tent(ctx,prop.variant);break;
    case "arena":arena(ctx);break;
    case "corral":corral(ctx);break;
    case "torch":rect(ctx,-3,-25,6,26,C.bronze[2]);rect(ctx,-9,-27,18,4,C.stone[0]);
      flame(ctx,prop.variant%2===1,time);break;
    case "bones":skull(ctx,0,-5,.75);
      for(let i=0;i<7;i++)rect(ctx,-23+i*7,-1-(i%3)*3,17,3,C.bone[1]);break;
    case "palm":
      rect(ctx,-4,-54,8,55,C.clay[2]);
      for(let i=0;i<6;i++){
        const a=i*Math.PI/3;
        ctx.strokeStyle=i%2?C.poison[2]:C.poison[1];ctx.lineWidth=5;
        ctx.beginPath();ctx.moveTo(0,-53);ctx.quadraticCurveTo(Math.sin(a)*24,-89,Math.sin(a)*42,-48+Math.cos(a)*18);ctx.stroke();
      }break;
    case "stall":
      rect(ctx,-27,-15,54,16,C.clay[2]);rect(ctx,-27,-17,54,5,C.bronze[1]);
      for(let i=0;i<5;i++)ellipse(ctx,-20+i*10,-23,4,3,i%2?C.poison[1]:C.bone[0]);break;
    case "barrel":
      rect(ctx,-9,-20,18,20,C.clay[2]);rect(ctx,-9,-19,18,3,C.bronze[2]);
      rect(ctx,-9,-5,18,3,C.bronze[2]);ellipse(ctx,0,-20,9,3,C.clay[0]);break;
    case "sign":
      rect(ctx,-2,-26,4,27,C.bronze[2]);rect(ctx,-16,-30,32,12,C.clay[1]);
      rect(ctx,-14,-28,28,2,C.bone[1]);break;
  }
}

/** Tons da areia e da rua de pedra; piso usa a mesma paleta da arte vertical. */
export function southCityGroundColors(ground:string):{lo:string;hi:string}{
  return ground==="path"
    ? {lo:C.stone[1],hi:C.stone[0]}
    : {lo:C.sand[2],hi:C.sand[0]};
}
