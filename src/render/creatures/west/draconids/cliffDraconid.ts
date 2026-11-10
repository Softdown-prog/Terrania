/** Silhueta e materiais exclusivos, mantendo as mesmas regras de combate. */
import type { ColorRamp } from "../../shared/regionalGeometry.ts";
import { organic, shard, headEyes, curvedLeg, carapaceDetail, OUTLINE } from "../../shared/regionalGeometry.ts";

export const drawDraconid = (ctx: CanvasRenderingContext2D, c: ColorRamp, time: number): void => {
  ctx.fillStyle = c.dark; ctx.strokeStyle = c.light; ctx.lineWidth = 1.3;
  for (const s of [-1,1]) {
    ctx.beginPath(); ctx.moveTo(s*6,-30);ctx.quadraticCurveTo(s*25,-67+Math.sin(time*2)*2,s*34,-50);
    ctx.lineTo(s*24,-43);ctx.lineTo(s*30,-34);ctx.lineTo(s*13,-28);ctx.closePath();ctx.fill();ctx.stroke();
    curvedLeg(ctx,s*8,-13,s*13,-6,s*16,1,c,5);
  }
  ctx.strokeStyle = OUTLINE;ctx.lineWidth = 9;
  ctx.beginPath();ctx.moveTo(12,-13);ctx.quadraticCurveTo(33,-11,29,-28);ctx.stroke();
  ctx.strokeStyle = c.base;ctx.lineWidth = 6;ctx.stroke();
  organic(ctx,0,-26,15,19,c,.09);
  organic(ctx,0,-47,12,11,c,-.15);
  for(const s of [-1,1]){
    shard(ctx,s*9,-56,5,12,c.light);
    curvedLeg(ctx,s*12,-34,s*17,-22,s*19,-15,c,4);
  }
  carapaceDetail(ctx,0,-26,11,14,c,11);
  headEyes(ctx,[[-4,-49],[5,-49]],c,2.1);
  shard(ctx,0,-38,4,5,c.accent);
};

/** Paleta e renderizador próprios desta espécie. */
import { renderRegionalFrame } from "../../shared/regionalFrame.ts";
import type { RegionalCreatureVisual } from "../../../regionalCreatures.ts";
const CREATURE_PALETTE: ColorRamp = {"base":"#66646a","light":"#b0a499","dark":"#292d3b","accent":"#e38b4f","eye":"#f7bb4d"};
export function renderCliffDraconidCreature(ctx:CanvasRenderingContext2D,actor:RegionalCreatureVisual,
  sx:number,sy:number,time=0):void {
  renderRegionalFrame(ctx,actor,sx,sy,time,CREATURE_PALETTE,drawDraconid);
}
