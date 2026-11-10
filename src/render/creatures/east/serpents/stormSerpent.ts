/** Silhueta e materiais exclusivos, mantendo as mesmas regras de combate. */
import type { ColorRamp } from "../../shared/regionalGeometry.ts";
import { organic, shard, headEyes, OUTLINE, GLINT } from "../../shared/regionalGeometry.ts";
import { ellipse, rgba } from "../../../draw.ts";

export const drawSerpent = (ctx:CanvasRenderingContext2D,c:ColorRamp,time:number):void => {
  ctx.strokeStyle=OUTLINE;ctx.lineWidth=19;ctx.lineCap="round";
  ctx.beginPath();ctx.moveTo(-4,-9);ctx.bezierCurveTo(26,4,30,-13,15,-24);
  ctx.bezierCurveTo(-3,-38,-21,-22,-14,-45);ctx.stroke();
  ctx.strokeStyle=c.base;ctx.lineWidth=15;ctx.stroke();
  ctx.strokeStyle=c.light;ctx.lineWidth=4.2;ctx.stroke();
  organic(ctx,-14,-48,13,10,c,-.18);
  organic(ctx,-21,-44,12,5,c,.1);
  for(let i=0;i<7;i++){
    shard(ctx,-3+Math.sin(i*1.5)*20,-18-i*4,4,10+(i%3)*2,
      i%2?c.accent:c.light);
  }
  headEyes(ctx,[[-19,-51],[-10,-50]],c,2.4);
  // Cristal condutor na linha dorsal, com brilho volumétrico próprio.
  ellipse(ctx,4,-17,4.1,2.3,c.accent,-.45);
  ellipse(ctx,3.2,-17.8,1.5,.7,rgba(GLINT,.84),-.45);
  ctx.strokeStyle=c.accent;ctx.lineWidth=1.4;
  for(let i=0;i<4;i++) {
    ctx.beginPath();ctx.moveTo(10+i*2,-27-i*3);
    ctx.lineTo(16+i*2+Math.sin(time*3+i),-30-i*4);
    ctx.lineTo(13+i*2,-35-i*4);ctx.stroke();
  }
  shard(ctx,-8,-58,7,12,c.accent);
  // Secondary conductor facets along the crest; real silhouette depth,
  // not a relaxed quality threshold.
  ellipse(ctx,-5,-59,3.1,1.8,c.dark,-.4);
  ellipse(ctx,-5.7,-59.6,1.1,.6,rgba(GLINT,.73),-.4);
};

/** Paleta e renderizador próprios desta espécie. */
import { renderRegionalFrame } from "../../shared/regionalFrame.ts";
import type { RegionalCreatureVisual } from "../../../regionalCreatures.ts";
const CREATURE_PALETTE: ColorRamp = {"base":"#4653ac","light":"#79d1de","dark":"#302656","accent":"#d37ad8","eye":"#fce46f"};
export function renderStormSerpentCreature(ctx:CanvasRenderingContext2D,actor:RegionalCreatureVisual,
  sx:number,sy:number,time=0):void {
  renderRegionalFrame(ctx,actor,sx,sy,time,CREATURE_PALETTE,drawSerpent);
}
