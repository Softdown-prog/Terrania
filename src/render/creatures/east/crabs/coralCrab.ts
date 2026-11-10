/** Silhueta e materiais exclusivos, mantendo as mesmas regras de combate. */
import type { ColorRamp } from "../../shared/regionalGeometry.ts";
import { organic, shard, headEyes, curvedLeg, carapaceDetail } from "../../shared/regionalGeometry.ts";

export const drawCrab = (ctx:CanvasRenderingContext2D,c:ColorRamp,time:number):void => {
  for(const s of [-1,1]){
    for(let i=0;i<3;i++)curvedLeg(ctx,s*14,-11,s*(20+i*4),-4+i*3,s*(21+i*5),3+i,c,4);
    curvedLeg(ctx,s*16,-21,s*27,-20,s*32,-9,c,8);
    organic(ctx,s*33,-9,12,10,c);
    shard(ctx,s*39,-11,5,10,c.light);
  }
  organic(ctx,0,-20,22,16,c);
  for(let i=0;i<9;i++){
    const x=Math.sin(i*5.1)*15, y=-32+Math.cos(i*3.7)*5;
    ctx.strokeStyle=i%2?c.accent:c.light;ctx.lineWidth=2.5;
    ctx.beginPath();ctx.moveTo(x,y+8);ctx.quadraticCurveTo(x+Math.sin(i)*4,y-4,
      x+Math.sin(time*.5+i)*3,y-11);ctx.stroke();
    shard(ctx,x,y-6,3,6,i%2?c.accent:c.light);
  }
  carapaceDetail(ctx,0,-23,18,12,c,12);
  headEyes(ctx,[[-7,-22],[7,-22]],c,2);
};

/** Paleta e renderizador próprios desta espécie. */
import { renderRegionalFrame } from "../../shared/regionalFrame.ts";
import type { RegionalCreatureVisual } from "../../../regionalCreatures.ts";
const CREATURE_PALETTE: ColorRamp = {"base":"#af6745","light":"#f3a36d","dark":"#5a3d43","accent":"#7ab79a","eye":"#fff1b6"};
export function renderCoralCrabCreature(ctx:CanvasRenderingContext2D,actor:RegionalCreatureVisual,
  sx:number,sy:number,time=0):void {
  renderRegionalFrame(ctx,actor,sx,sy,time,CREATURE_PALETTE,drawCrab);
}
