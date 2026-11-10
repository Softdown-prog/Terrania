/** Silhueta procedural da espécie, separada das fichas de domínio. */
import type { Palette } from "./geometry.ts";
import { body, line, tip, eye, freckles, OUTLINE } from "./geometry.ts";
import { ellipse } from "../../draw.ts";

export const vulture = (ctx:CanvasRenderingContext2D,c:Palette,t:number):void => {
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
};
