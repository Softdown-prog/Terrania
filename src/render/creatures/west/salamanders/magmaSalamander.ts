/** Salamandra de Magma: cauda flexível, crosta rachada e calor de conjuração. */
import type { Ramp } from "../../shared/wave2Geometry.ts";
import { mass, eye, joint, crystal, etched, EDGE } from "../../shared/wave2Geometry.ts";
import { ellipse, rgba } from "../../../draw.ts";
import { renderWave2Frame } from "../../shared/wave2Frame.ts";
import type { RegionalCreatureVisual } from "../../../regionalCreatures.ts";

export const salamander = (ctx:CanvasRenderingContext2D,c:Ramp,t:number,
  phase=0,moving=0,casting=0):void => {
  const crawl=Math.max(0,Math.min(1,moving));
  const furnace=Math.max(0,Math.min(1,casting));
  const curl=Math.sin(phase)*crawl*7+Math.sin(t*1.1)*.7;
  // Cauda segmentada segue o esforço das patas, sem rotação aleatória.
  const tail=():void=>{
    ctx.beginPath();ctx.moveTo(15,-17);
    ctx.bezierCurveTo(39+curl,-8,37+curl*.55,-50,12,-51);
  };
  ctx.lineCap="round";ctx.strokeStyle=EDGE;ctx.lineWidth=15;tail();ctx.stroke();
  ctx.strokeStyle=c.base;ctx.lineWidth=11;tail();ctx.stroke();
  ctx.strokeStyle=rgba(c.accent,.58+furnace*.28);ctx.lineWidth=2.2;tail();ctx.stroke();
  for(const s of [-1,1])for(const x of [-13,12]){
    const step=Math.sin(phase+(x<0?0:Math.PI)+s*1.2)*crawl*4;
    joint(ctx,[[x,-17],[x+s*7+step,-6],[x+s*10+step*1.4,-Math.max(0,step)*.55]],c,6);
    for(let claw=0;claw<3;claw++){
      crystal(ctx,x+s*10+step*1.4+(claw-1)*2.4,1-Math.max(0,step)*.55,
        1.3,3.1,c.dark,c.accent);
    }
  }
  mass(ctx,0,-23,28,14,c,-.18);
  mass(ctx,-24,-28,14,9,c);
  // Fendas da crosta: brilho por dentro e bordas de rocha fria.
  for(let i=0;i<9;i++){
    const x=-24+i*5;
    crystal(ctx,x,-32-Math.sin(i*1.3)*2,3.4,9+i%3*3,c.dark,c.accent);
    ctx.strokeStyle=c.dark;ctx.lineWidth=3.2;
    ctx.beginPath();ctx.moveTo(x,-17);ctx.lineTo(x+2,-25);
    ctx.lineTo(x-1,-28);ctx.stroke();
    ctx.strokeStyle=rgba(c.accent,.65+furnace*.35);ctx.lineWidth=1.7;
    ctx.beginPath();ctx.moveTo(x,-17);ctx.lineTo(x+2+Math.sin(i+t)*.5,-25);
    ctx.lineTo(x-1,-27);ctx.stroke();
  }
  for(let i=0;i<13;i++){
    const x=-24+i*3.8,y=-24+Math.sin(i*1.7)*5;
    ellipse(ctx,x,y,1.1+i%3*.28,.65,rgba(i%2?c.light:c.accent,.62));
  }
  eye(ctx,-30,-31,c);eye(ctx,-22,-32,c);
  etched(ctx,c,13,2,-22,19,9);
  // Boca de calor: brasas só aparecem durante a conjuração do monstro.
  if(furnace>.01){
    const g=ctx.createRadialGradient(-32,-26,0,-32,-26,18);
    g.addColorStop(0,rgba(c.accent,.5*furnace));g.addColorStop(1,rgba(c.accent,0));
    ellipse(ctx,-32,-26,18,13,g);
    for(let i=0;i<9;i++){
      const x=-37-i*3.2,y=-27+Math.sin(t*3+i*2)*5-i*.6;
      ellipse(ctx,x,y,1.1+i%3*.5,.65+i%2*.5,
        rgba(i%3?c.accent:c.eyes,furnace*(1-i/10)*.85));
    }
  }
};
const CREATURE_PALETTE: Ramp = {"base":"#5b413a","dark":"#292f38","light":"#a47558","accent":"#ff6a26","eyes":"#ffbd65"};
export function renderMagmaSalamanderCreature(ctx:CanvasRenderingContext2D,actor:RegionalCreatureVisual,
  sx:number,sy:number,time=0):void {
  renderWave2Frame(ctx,actor,sx,sy,time,CREATURE_PALETTE,
    (surface,colors,t)=>salamander(surface,colors,t,actor.motionPhase??0,actor.moving??0,actor.casting??0));
}
