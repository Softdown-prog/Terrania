/** Silhueta procedural da espécie, separada das fichas de domínio. */
import type { Palette } from "../../shared/southGeometry.ts";
import { body, tip, eye, freckles, OUTLINE } from "../../shared/southGeometry.ts";
import { ellipse } from "../../../draw.ts";

export const viper = (ctx:CanvasRenderingContext2D,c:Palette,t:number):void => {
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
};

/** Paleta e renderizador próprios desta espécie. */
import { renderWave3Frame } from "../../shared/wave3Frame.ts";
import type { RegionalCreatureVisual } from "../../../regionalCreatures.ts";
const CREATURE_PALETTE: Palette = {"base":"#ac915c","light":"#d8c498","dark":"#635d4b","accent":"#c68e54","eye":"#efcc6c","extra":"#8a8f4a"};
export function renderHornedViperCreature(ctx:CanvasRenderingContext2D,actor:RegionalCreatureVisual,
  sx:number,sy:number,time=0):void {
  renderWave3Frame(ctx,actor,sx,sy,time,CREATURE_PALETTE,viper);
}
