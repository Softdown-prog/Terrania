/** Silhueta procedural da espécie, separada das fichas de domínio. */
import type { Palette } from "../../shared/southGeometry.ts";
import { body, line, eye, freckles, OUTLINE } from "../../shared/southGeometry.ts";
import { ellipse } from "../../../draw.ts";

export const scout = (ctx:CanvasRenderingContext2D,c:Palette,t:number):void => {
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
};

/** Paleta, anatomia e detalhes visuais desta espécie. */
import { renderWave3Frame } from "../../shared/wave3Frame.ts";
import type { RegionalCreatureVisual } from "../../../regionalCreatures.ts";
const CREATURE_PALETTE: Palette = {"base":"#aa8e66","light":"#eed9ab","dark":"#605044","accent":"#d9bb80","eye":"#e5cc91","extra":"#87765d"};
export function renderDuneScoutCreature(ctx:CanvasRenderingContext2D,actor:RegionalCreatureVisual,
  sx:number,sy:number,time=0):void {
  renderWave3Frame(ctx,actor,sx,sy,time,CREATURE_PALETTE,scout);
}
