/** Silhueta procedural da espécie, separada das fichas de domínio. */
import type { Palette } from "../../shared/southGeometry.ts";
import { body, line, tip, eye, freckles } from "../../shared/southGeometry.ts";
import { ellipse } from "../../../draw.ts";

export const troll = (ctx:CanvasRenderingContext2D,c:Palette,t:number):void => {
  for(const s of [-1,1]){
    line(ctx,s*12,-15,s*15,0,c,11);
    line(ctx,s*18,-38,s*29,-15,c,9);
    body(ctx,s*29,-15,8,8,c);
  }
  body(ctx,0,-29,22,25,c);
  // Dust-baked plates and scars make this a clay troll, not a generic giant.
  for(let i=0;i<9;i++){
    const x=Math.sin(i*2.1)*16,y=-39+(i%5)*8;
    body(ctx,x,y,3+i%3,1.7,{...c,base:c.extra,light:c.light,dark:c.dark},i*.1);
  }
  body(ctx,0,-54,18,15,c);
  body(ctx,0,-45,12,8,{...c,base:c.dark});
  eye(ctx,-7,-56,c,2.4);eye(ctx,7,-56,c,2.4);
  for(const s of [-1,1])tip(ctx,s*14,-59,6,8,c.extra);
  for(let i=0;i<7;i++)tip(ctx,-18+i*6,-33+i%3*3,3,7,c.dark);
  line(ctx,30,-15,34,-49,{...c,base:c.extra,light:c.accent},5);
  body(ctx,34,-51,11,7,{...c,base:c.extra});
  freckles(ctx,c,19,0,-32,17,18);
  ellipse(ctx,0,-42,3+Math.sin(t)*.3,1.5,c.accent);
};

/** Paleta, anatomia e detalhes visuais desta espécie. */
import { renderWave3Frame } from "../../shared/wave3Frame.ts";
import type { RegionalCreatureVisual } from "../../../regionalCreatures.ts";
const CREATURE_PALETTE: Palette = {"base":"#ac8864","light":"#d7b88e","dark":"#6e5643","accent":"#c79972","eye":"#eac778","extra":"#857c64"};
export function renderClayTrollCreature(ctx:CanvasRenderingContext2D,actor:RegionalCreatureVisual,
  sx:number,sy:number,time=0):void {
  renderWave3Frame(ctx,actor,sx,sy,time,CREATURE_PALETTE,troll,24);
}
