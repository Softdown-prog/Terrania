/** Silhueta procedural da espécie, separada das fichas de domínio. */
import type { Palette } from "../../shared/southGeometry.ts";
import { body, line, eye, freckles } from "../../shared/southGeometry.ts";
import { ellipse, rgba } from "../../../draw.ts";

const flameLick = (ctx:CanvasRenderingContext2D,x:number,y:number,size:number,
  direction:number,phase:number,outer:string,inner:string):void => {
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
};

export const imp = (ctx:CanvasRenderingContext2D,c:Palette,t:number):void => {
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
};

/** Paleta e renderizador próprios desta espécie. */
import { renderWave3Frame } from "../../shared/wave3Frame.ts";
import type { RegionalCreatureVisual } from "../../../regionalCreatures.ts";
const CREATURE_PALETTE: Palette = {"base":"#f4ae51","light":"#fff0a5","dark":"#a85027","accent":"#ffd770","eye":"#fff5b9","extra":"#ee762b"};
export function renderMirageImpCreature(ctx:CanvasRenderingContext2D,actor:RegionalCreatureVisual,
  sx:number,sy:number,time=0):void {
  renderWave3Frame(ctx,actor,sx,sy,time,CREATURE_PALETTE,imp);
}
