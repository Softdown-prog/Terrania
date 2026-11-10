/** Silhueta e materiais exclusivos, mantendo as mesmas regras de combate. */
import type { ColorRamp } from "../../shared/regionalGeometry.ts";
import { organic, shard, headEyes, GLINT } from "../../shared/regionalGeometry.ts";
import { ellipse, rgba } from "../../../draw.ts";

export const drawSpirit = (ctx:CanvasRenderingContext2D,c:ColorRamp,time:number):void => {
  for(let i=0;i<7;i++){
    const y=-7-i*6,rx=3+i*2.8;
    organic(ctx,Math.sin(time*1.8+i*.7)*2,y,rx,4,c,Math.sin(i)*.1);
  }
  for(let i=0;i<11;i++){
    const a=i*2.4+time*.7,r=13+(i%3)*5;
    shard(ctx,Math.cos(a)*r,-29+Math.sin(a)*16,3,7,c.light);
  }
  organic(ctx,0,-41,20,11,c);
  ellipse(ctx,0,-42,17,7,rgba(c.accent,.38));
  headEyes(ctx,[[-9,-43],[9,-43]],c,3.2);
  ctx.strokeStyle=GLINT;ctx.lineWidth=1.7;
  for(let k=0;k<3;k++){
    ctx.beginPath();ctx.arc(0,-40,14+k*3,Math.PI*.14,Math.PI*.83);ctx.stroke();
  }
};

/** Paleta e renderizador próprios desta espécie. */
import { renderRegionalFrame } from "../../shared/regionalFrame.ts";
import type { RegionalCreatureVisual } from "../../../regionalCreatures.ts";
const CREATURE_PALETTE: ColorRamp = {"base":"#519bcc","light":"#dcf7ff","dark":"#205c8e","accent":"#83e4ff","eye":"#cffaff"};
export function renderFrostSpiritCreature(ctx:CanvasRenderingContext2D,actor:RegionalCreatureVisual,
  sx:number,sy:number,time=0):void {
  renderRegionalFrame(ctx,actor,sx,sy,time,CREATURE_PALETTE,drawSpirit);
}
