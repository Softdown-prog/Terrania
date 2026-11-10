/** Anatomia e movimentos próprios da espécie: não é uma ficha de atributos. */
import type { Ramp } from "../../shared/wave2Geometry.ts";
import { mass, crystal, etched, EDGE } from "../../shared/wave2Geometry.ts";
import { ellipse, shade, TAU, softShadow } from "../../../draw.ts";

export const worm = (ctx:CanvasRenderingContext2D,c:Ramp,t:number):void => {
  softShadow(ctx,0,1,32,9,.45);
  for(let i=0;i<7;i++){
    const y=-7-i*6,x=Math.sin(i*.29+t*.6)*2;
    mass(ctx,x,y,23-i*1.2,7,c);
    ctx.strokeStyle=c.dark;ctx.lineWidth=1.2;
    ctx.beginPath();ctx.arc(x,y,18-i,Math.PI*.15,Math.PI*.85);ctx.stroke();
  }
  mass(ctx,-2,-54,23,18,c);
  for(let i=0;i<9;i++){
    const a=i*TAU/9;
    crystal(ctx,Math.cos(a)*20,-54+Math.sin(a)*13,4.1,9,c.light);
  }
  ellipse(ctx,-1,-54,16,12,EDGE);
  ellipse(ctx,-1,-54,13,9,"#6e333c");
  for(let i=0;i<12;i++){
    const a=i*TAU/12,x=-1+Math.cos(a)*11,y=-54+Math.sin(a)*7;
    crystal(ctx,x,y+2,2.1,6,c.light);
  }
  ellipse(ctx,-1,-54,5,4,shade(c.dark,-.4));
  etched(ctx,c,11,-1,-29,15,17);
};

/** Paleta e renderizador próprios desta espécie. */
import { renderWave2Frame } from "../../shared/wave2Frame.ts";
import type { RegionalCreatureVisual } from "../../../regionalCreatures.ts";
const CREATURE_PALETTE: Ramp = {"base":"#a57959","dark":"#594237","light":"#dbc4a0","accent":"#b39c7f","eyes":"#f9bd68"};
export function renderCarrionSandwormCreature(ctx:CanvasRenderingContext2D,actor:RegionalCreatureVisual,
  sx:number,sy:number,time=0):void {
  renderWave2Frame(ctx,actor,sx,sy,time,CREATURE_PALETTE,worm);
}
