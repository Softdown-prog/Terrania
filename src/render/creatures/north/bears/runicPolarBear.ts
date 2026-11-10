/** Anatomia e movimentos próprios da espécie: não é uma ficha de atributos. */
import type { Ramp } from "../../shared/wave2Geometry.ts";
import { mass, eye, joint, crystal, etched } from "../../shared/wave2Geometry.ts";
import { ellipse } from "../../../draw.ts";

export const bear = (ctx:CanvasRenderingContext2D,c:Ramp,t:number):void => {
  for(const s of [-1,1]){
    joint(ctx,[[s*14,-22],[s*20,-8],[s*22,0]],c,13);
    mass(ctx,s*21,-1,10,7,c);
    for(let i=0;i<3;i++)crystal(ctx,s*(17+i*4),1,2,4,c.dark);
  }
  mass(ctx,0,-30+Math.sin(t*2)*.38,27,21,c);
  mass(ctx,21,-38,17,16,c);
  for(const s of [-1,1])mass(ctx,20+s*10,-51,6,7,c);
  mass(ctx,31,-32,11,7,c);
  eye(ctx,16,-41,c,2.6);eye(ctx,29,-42,c,2.6);
  ellipse(ctx,40,-31,3.5,2.7,c.dark);
  ctx.strokeStyle=c.accent;ctx.lineWidth=2;
  for(let i=0;i<5;i++){
    const x=-18+i*8,y=-31+(i%2)*5;
    ctx.beginPath();ctx.moveTo(x-3,y-5);
    ctx.lineTo(x,y+1);ctx.lineTo(x+3,y-6);ctx.stroke();
    crystal(ctx,x,y-5,2.7,5,c.accent);
  }
  etched(ctx,c,12,0,-26,19,15);
};

/** Paleta e renderizador próprios desta espécie. */
import { renderWave2Frame } from "../../shared/wave2Frame.ts";
import type { RegionalCreatureVisual } from "../../../regionalCreatures.ts";
const CREATURE_PALETTE: Ramp = {"base":"#b3d4d9","dark":"#5b90a4","light":"#eefcff","accent":"#53baf0","eyes":"#365670"};
export function renderRunicPolarBearCreature(ctx:CanvasRenderingContext2D,actor:RegionalCreatureVisual,
  sx:number,sy:number,time=0):void {
  renderWave2Frame(ctx,actor,sx,sy,time,CREATURE_PALETTE,bear);
}
