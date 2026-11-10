/** Anatomia e movimentos próprios da espécie: não é uma ficha de atributos. */
import type { Ramp } from "../../shared/wave2Geometry.ts";
import { mass, eye, joint, crystal, etched, EDGE } from "../../shared/wave2Geometry.ts";

export const griffin = (ctx:CanvasRenderingContext2D,c:Ramp,t:number):void => {
  for(const s of [-1,1]){
    ctx.fillStyle=c.dark;ctx.strokeStyle=EDGE;ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(s*7,-34);
    ctx.bezierCurveTo(s*32,-68+Math.sin(t*2)*3,s*45,-51,s*42,-38);
    ctx.quadraticCurveTo(s*32,-43,s*18,-26);ctx.closePath();ctx.fill();ctx.stroke();
    for(let k=0;k<5;k++)crystal(ctx,s*(18+k*5),-40-k%2*3,4,10-k,c.light);
    joint(ctx,[[s*12,-17],[s*16,-7],[s*20,0]],c,6);
    joint(ctx,[[s*4,-25],[s*14,-15],[s*9,-2]],c,5);
    crystal(ctx,s*20,1,3,6,c.accent);
  }
  mass(ctx,0,-29,20,15,c);
  mass(ctx,15,-42,12,12,c,-.15);
  mass(ctx,25,-37,7,5,c,.1);
  ctx.fillStyle=c.accent;ctx.beginPath();ctx.moveTo(30,-37);ctx.lineTo(40,-34);ctx.lineTo(29,-27);ctx.closePath();ctx.fill();
  for(let i=0;i<8;i++)crystal(ctx,4+i*3,-45+i%3*2,2.8,6+i%2*2,c.light);
  eye(ctx,20,-44,c);etched(ctx,c,9,-2,-30,14,11);
};

/** Paleta e renderizador próprios desta espécie. */
import { renderWave2Frame } from "../../shared/wave2Frame.ts";
import type { RegionalCreatureVisual } from "../../../regionalCreatures.ts";
const CREATURE_PALETTE: Ramp = {"base":"#88909e","dark":"#414957","light":"#d2d6d6","accent":"#d5a24c","eyes":"#ffc866"};
export function renderSummitGriffinCreature(ctx:CanvasRenderingContext2D,actor:RegionalCreatureVisual,
  sx:number,sy:number,time=0):void {
  renderWave2Frame(ctx,actor,sx,sy,time,CREATURE_PALETTE,griffin);
}
