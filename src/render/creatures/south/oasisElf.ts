/** Silhueta procedural da espécie, separada das fichas de domínio. */
import type { Palette } from "./geometry.ts";
import { body, line, tip, eye, freckles, OUTLINE, GLOW } from "./geometry.ts";
import { ellipse, rgba } from "../../draw.ts";

export const elf = (ctx:CanvasRenderingContext2D,c:Palette,t:number):void => {
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
};
