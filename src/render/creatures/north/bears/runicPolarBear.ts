/** Urso Polar Rúnico: peso de cada pata, garras de gelo e runas que despertam. */
import type { Ramp } from "../../shared/wave2Geometry.ts";
import { mass, eye, joint, crystal, etched } from "../../shared/wave2Geometry.ts";
import { ellipse, rgba } from "../../../draw.ts";
import { renderWave2Frame } from "../../shared/wave2Frame.ts";
import type { RegionalCreatureVisual } from "../../../regionalCreatures.ts";

export const bear = (ctx:CanvasRenderingContext2D,c:Ramp,t:number,
  phase=0,moving=0,casting=0):void => {
  const lumber=Math.max(0,Math.min(1,moving));
  const awaken=Math.max(0,Math.min(1,casting));
  for(const s of [-1,1]){
    const stride=Math.sin(phase+(s<0?0:Math.PI))*lumber;
    joint(ctx,[[s*14,-22],[s*20+stride*3,-8],[s*22+stride*6,-Math.max(0,stride)*3]],c,13);
    mass(ctx,s*21+stride*6,-1-Math.max(0,stride)*3,10,7,c);
    for(let claw=0;claw<4;claw++){
      const x=s*(15+claw*4)+stride*6,y=1-Math.max(0,stride)*3;
      crystal(ctx,x,y,2.1,5.5,c.light);
      ctx.strokeStyle=rgba(c.dark,.75);ctx.lineWidth=.7;
      ctx.beginPath();ctx.moveTo(x,y+2);ctx.lineTo(x+1,y+4);ctx.stroke();
    }
  }
  mass(ctx,0,-30+Math.sin(t*2)*.38,27,21,c);
  // Cristais do ombro recortam a silhueta em vez de cobrir a cabeça.
  for(const s of [-1,1]){
    crystal(ctx,s*17,-48,5,12,c.dark,c.accent);
    crystal(ctx,s*24,-41,3.3,8,c.light,c.accent);
  }
  mass(ctx,21,-38,17,16,c);
  for(const s of [-1,1]){
    mass(ctx,20+s*10,-51,6,7,c);
    ellipse(ctx,20+s*10,-51,3.2,4.2,rgba(c.dark,.78));
  }
  mass(ctx,31,-32,11,7,c);
  eye(ctx,16,-41,c,2.6);eye(ctx,29,-42,c,2.6);
  ellipse(ctx,40,-31,3.5,2.7,c.dark);
  ctx.strokeStyle=c.dark;ctx.lineWidth=1.4;ctx.beginPath();
  ctx.moveTo(29,-27);ctx.quadraticCurveTo(33,-24-awaken*3,39,-27);ctx.stroke();
  // Runas do flanco: desenho fixo, intensidade derivada da conjuração atual.
  for(let i=0;i<5;i++){
    const x=-18+i*8,y=-31+i%2*5;
    ctx.strokeStyle=rgba(c.accent,.54+awaken*.46);
    ctx.lineWidth=1.5+awaken*.7;
    ctx.beginPath();ctx.moveTo(x-3,y-5);
    ctx.lineTo(x,y+1);ctx.lineTo(x+3,y-6);ctx.stroke();
    crystal(ctx,x,y-5,2.7,5,c.accent);
    if(awaken>.01){
      ellipse(ctx,x,y-2,3.8+Math.sin(t*2+i)*.5,5,
        rgba(c.light,awaken*(i%2?.32:.52)));
    }
  }
  for(let i=0;i<9;i++){
    const x=-22+i*5.2;
    ctx.strokeStyle=rgba(c.light,.31);ctx.lineWidth=.65;
    ctx.beginPath();ctx.moveTo(x,-40);
    ctx.quadraticCurveTo(x+4,-31,x+1,-26);ctx.stroke();
  }
  etched(ctx,c,12,0,-26,19,15);
  if(awaken>.01){
    for(let i=0;i<6;i++){
      const x=22+i*4,y=-37+Math.sin(t*2+i*1.1)*4;
      ellipse(ctx,x,y,1.1+i%2*.35,.7,rgba(c.accent,awaken*(1-i/7)));
    }
  }
};
const CREATURE_PALETTE: Ramp = {"base":"#b3d4d9","dark":"#5b90a4","light":"#eefcff","accent":"#53baf0","eyes":"#365670"};
export function renderRunicPolarBearCreature(ctx:CanvasRenderingContext2D,actor:RegionalCreatureVisual,
  sx:number,sy:number,time=0):void {
  renderWave2Frame(ctx,actor,sx,sy,time,CREATURE_PALETTE,
    (surface,colors,t)=>bear(surface,colors,t,actor.motionPhase??0,actor.moving??0,actor.casting??0));
}
