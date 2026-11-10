/** Lobo Glacial: galope de quatro patas, pelagem de gelo e sopro de geada próprios. */
import type { ColorRamp } from "../../shared/regionalGeometry.ts";
import { organic, shard, headEyes, curvedLeg, OUTLINE } from "../../shared/regionalGeometry.ts";
import { ellipse, rgba } from "../../../draw.ts";
import { renderRegionalFrame } from "../../shared/regionalFrame.ts";
import type { RegionalCreatureVisual } from "../../../regionalCreatures.ts";

/** O movimento real governa patas e cauda; casting governa o rosnado gelado. */
export const drawWolf = (ctx:CanvasRenderingContext2D,c:ColorRamp,time:number,
  phase=0,moving=0,casting=0):void => {
  const gait=Math.max(0,Math.min(1,moving));
  const charge=Math.max(0,Math.min(1,casting));
  const breath=Math.sin(time*1.7)*.7;
  // Cauda em foice, presa à traseira: amplitude aumenta durante a corrida.
  const tailY=-42+Math.sin(time*1.4)*.7+Math.sin(phase)*gait*5;
  ctx.strokeStyle=OUTLINE;ctx.lineWidth=10;ctx.lineCap="round";
  ctx.beginPath();ctx.moveTo(-18,-21);ctx.quadraticCurveTo(-31,-27,-32,tailY);ctx.stroke();
  ctx.strokeStyle=c.light;ctx.lineWidth=6;ctx.stroke();
  for(let i=0;i<4;i++){
    const back=i<2, x=back?-12:12, side=i%2===0?-1:1;
    const step=Math.sin(phase+(back?0:Math.PI)+side*.85)*gait;
    curvedLeg(ctx,x+side*2,-16,x+side*3+step*4,-8-step*2,
      x+side*4+step*6,-step*3,c,4.7);
    // Dedos articulados só levantam quando há passada.
    ellipse(ctx,x+side*4+step*6,-1-step*3,5.1,2.5,c.dark);
    for(let nail=0;nail<3;nail++){
      ctx.strokeStyle=c.light;ctx.lineWidth=.9;
      ctx.beginPath();ctx.moveTo(x+side*4+step*6+nail*2-2,-.5-step*3);
      ctx.lineTo(x+side*4+step*6+nail*2-3,1.7-step*3);ctx.stroke();
    }
  }
  organic(ctx,0,-25+breath,23,12,c);
  organic(ctx,17,-35+breath*.35,13,11,c,.19);
  organic(ctx,28,-29,10,5,c,.09);
  // Cristais dorsais alternados: gelo translúcido e sombra legível em zoom pequeno.
  for(let i=0;i<9;i++){
    const x=-18+i*5.2,y=-33-Math.sin(i/8*Math.PI)*4;
    shard(ctx,x,y,3.1+(i%3),9+i%3*3,i%2?c.accent:c.light);
    ctx.strokeStyle=rgba(c.dark,.62);ctx.lineWidth=.7;
    ctx.beginPath();ctx.moveTo(x-1,y);ctx.lineTo(x,y-6-i%3*2);ctx.stroke();
  }
  for(const s of [-1,1]){
    shard(ctx,15+s*7,-43+breath*.25,5,14,c.light);
    ctx.strokeStyle=c.dark;ctx.lineWidth=1.3;ctx.beginPath();
    ctx.moveTo(16+s*7,-38);ctx.lineTo(18+s*7,-45);ctx.stroke();
  }
  headEyes(ctx,[[21,-39],[30,-37]],c,1.9);
  ellipse(ctx,36,-29,2.2,1.6,OUTLINE);
  // Mandíbula separada: ameaça/ataque abre a boca, sem mudar a hitbox do motor.
  ctx.fillStyle=c.dark;ctx.beginPath();ctx.moveTo(24,-27);
  ctx.quadraticCurveTo(31,-23+charge*5,37,-27+charge*4);
  ctx.quadraticCurveTo(31,-22,24,-25);ctx.closePath();ctx.fill();
  for(let tooth=0;tooth<3;tooth++){
    ctx.fillStyle=c.light;ctx.beginPath();
    ctx.moveTo(27+tooth*3,-26);ctx.lineTo(28+tooth*3,-23+charge*2.8);
    ctx.lineTo(29+tooth*3,-26);ctx.closePath();ctx.fill();
  }
  // Geada concentra-se à frente do focinho ao preparar a habilidade.
  if(charge>.01)for(let i=0;i<7;i++){
    const x=39+i*3.2,y=-27+Math.sin(time*2+i*1.6)*3.5;
    ellipse(ctx,x,y,1.1+i%3*.45,.75,rgba(i%2?c.light:c.accent,charge*(1-i/8)*.76));
  }
};
const CREATURE_PALETTE: ColorRamp = {"base":"#368cc4","light":"#a0f0fd","dark":"#24436e","accent":"#5bccf9","eye":"#e9fcfc"};
export function renderGlacialWolfCreature(ctx:CanvasRenderingContext2D,actor:RegionalCreatureVisual,
  sx:number,sy:number,time=0):void {
  renderRegionalFrame(ctx,actor,sx,sy,time,CREATURE_PALETTE,
    (surface,colors,t)=>drawWolf(surface,colors,t,actor.motionPhase??0,actor.moving??0,actor.casting??0));
}
