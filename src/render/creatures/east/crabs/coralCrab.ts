/** Caranguejo Coralino: carapaça viva, dez articulações e pinças expressivas. */
import type { ColorRamp } from "../../shared/regionalGeometry.ts";
import { organic, shard, headEyes, curvedLeg, carapaceDetail } from "../../shared/regionalGeometry.ts";
import { ellipse, rgba } from "../../../draw.ts";
import { renderRegionalFrame } from "../../shared/regionalFrame.ts";
import type { RegionalCreatureVisual } from "../../../regionalCreatures.ts";

export const drawCrab = (ctx:CanvasRenderingContext2D,c:ColorRamp,time:number,
  phase=0,moving=0,casting=0):void => {
  const speed=Math.max(0,Math.min(1,moving));
  const pinch=Math.max(0,Math.min(1,casting));
  for(const s of [-1,1]){
    // Passada lateral alternada; pinças grandes trabalham em oposição.
    for(let i=0;i<4;i++){
      const offset=Math.sin(phase+i*1.1+s*1.7)*speed*3.4;
      curvedLeg(ctx,s*(13+i*1.5),-11+i*1.8,
        s*(19+i*4)+offset,-4+i*3,
        s*(21+i*5)+offset*1.2,3+i-Math.max(0,offset)*.4,c,3.7);
      shard(ctx,s*(21+i*5)+offset*1.2,4+i,2.2,3.6,c.light);
    }
    const raise=Math.sin(phase*.9+s)*speed*3.2;
    curvedLeg(ctx,s*16,-21,s*27,-20-raise,s*32,-9-raise,c,8);
    organic(ctx,s*33,-9-raise,12,10,c);
    // Dedos móveis fecham em torno de sua própria articulação.
    const span=8-pinch*5;
    shard(ctx,s*39,-12-raise,5,span+3,c.light);
    shard(ctx,s*38,-3-raise,4,span,c.accent);
    ctx.strokeStyle=rgba(c.dark,.74);ctx.lineWidth=1.4;
    ctx.beginPath();ctx.moveTo(s*33,-9-raise);
    ctx.lineTo(s*38,-9-raise);ctx.stroke();
  }
  organic(ctx,0,-20,22,16,c);
  // Corte concêntrico de placas calcárias e colônias incrustadas.
  for(let ring=0;ring<3;ring++){
    ctx.strokeStyle=rgba(ring%2?c.light:c.dark,.42);
    ctx.lineWidth=1.1;ctx.beginPath();
    ctx.ellipse(0,-22,12+ring*3,7+ring*2,0,Math.PI*.12,Math.PI*.87);ctx.stroke();
  }
  for(let i=0;i<12;i++){
    const angle=i*2.39;
    const x=Math.sin(angle)*15,y=-23+Math.cos(angle)*8;
    ellipse(ctx,x,y,1.2+i%3*.35,.9+i%2*.3,i%3?c.accent:c.light);
    ellipse(ctx,x-.35,y-.3,.42,.3,rgba(c.light,.85));
  }
  for(let i=0;i<9;i++){
    const x=Math.sin(i*5.1)*15,y=-32+Math.cos(i*3.7)*5;
    const sway=Math.sin(time*1.2+i+phase*.3)*1.1;
    ctx.strokeStyle=i%2?c.accent:c.light;ctx.lineWidth=2.5;
    ctx.beginPath();ctx.moveTo(x,y+8);ctx.quadraticCurveTo(x+sway*2,y-4,
      x+sway*2,y-11-sway);ctx.stroke();
    shard(ctx,x+sway*2,y-6-sway,3,6,i%2?c.accent:c.light);
  }
  carapaceDetail(ctx,0,-23,18,12,c,12);
  headEyes(ctx,[[-7,-22],[7,-22]],c,2);
  if(pinch>.01){
    for(let i=0;i<5;i++){
      const x=36+i*3,y=-8+Math.sin(time*2+i)*4;
      ellipse(ctx,x,y,1.4,.8,rgba(c.accent,pinch*(1-i/6)*.65));
    }
  }
};
const CREATURE_PALETTE: ColorRamp = {"base":"#af6745","light":"#f3a36d","dark":"#5a3d43","accent":"#7ab79a","eye":"#fff1b6"};
export function renderCoralCrabCreature(ctx:CanvasRenderingContext2D,actor:RegionalCreatureVisual,
  sx:number,sy:number,time=0):void {
  renderRegionalFrame(ctx,actor,sx,sy,time,CREATURE_PALETTE,
    (surface,colors,t)=>drawCrab(surface,colors,t,actor.motionPhase??0,actor.moving??0,actor.casting??0));
}
