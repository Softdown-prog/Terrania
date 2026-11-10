/**
 * Tritão Caçador das Marés — armadura de escamas, cauda barbada e tridente.
 * Nada da geometria decide alcance, dano ou tempo de ataque.
 */
import type { Ramp } from "../../shared/wave2Geometry.ts";
import { mass, eye, joint, crystal, etched, EDGE } from "../../shared/wave2Geometry.ts";
import { ellipse, rgba } from "../../../draw.ts";
import { renderWave2Frame } from "../../shared/wave2Frame.ts";
import type { RegionalCreatureVisual } from "../../../regionalCreatures.ts";

export const triton=(ctx:CanvasRenderingContext2D,c:Ramp,time:number,
  phase=0,moving=0,casting=0):void=>{
  const swim=Math.max(0,Math.min(1,moving));
  const strike=Math.max(0,Math.min(1,casting));
  const kick=Math.sin(phase)*swim*6;
  // Cauda muscular ligada ao quadril e barbatana de perfil largo.
  const tail=():void=>{
    ctx.beginPath();ctx.moveTo(0,-17);
    ctx.bezierCurveTo(16,-7,39+kick,-3,27+kick,-19);
  };
  ctx.lineCap="round";ctx.lineJoin="round";
  ctx.strokeStyle=EDGE;ctx.lineWidth=17;tail();ctx.stroke();
  ctx.strokeStyle=c.base;ctx.lineWidth=13;tail();ctx.stroke();
  ctx.strokeStyle=rgba(c.light,.6);ctx.lineWidth=2.6;tail();ctx.stroke();
  // Raios da barbatana são exclusivos, mudam só quando há nadadeira em ação.
  const finX=29+kick,finY=-16;
  ctx.fillStyle=rgba(c.accent,.82);ctx.strokeStyle=EDGE;ctx.lineWidth=1.7;
  ctx.beginPath();ctx.moveTo(finX-6,finY+3);
  ctx.quadraticCurveTo(finX-1,finY-10,finX+2,finY-23);
  ctx.lineTo(finX+9,finY-14);ctx.lineTo(finX+16,finY-20);
  ctx.quadraticCurveTo(finX+14,finY-3,finX+3,finY+5);
  ctx.closePath();ctx.fill();ctx.stroke();
  for(let i=0;i<5;i++){
    ctx.strokeStyle=rgba(c.light,.7);ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(finX,finY);
    ctx.lineTo(finX+i*3,finY-18+i%2*6);ctx.stroke();
  }
  // Braços e mãos em contrafase; o braço do tridente acompanha a preparação.
  for(const side of [-1,1]){
    const lift=(side<0?strike*9:strike*2);
    const fin=Math.sin(phase+(side<0?0:Math.PI))*swim*3;
    joint(ctx,[[side*10,-41],[side*19+fin,-29-lift*.6],
      [side*22+fin,-14-lift]],c,6);
    mass(ctx,side*22+fin,-14-lift,5,3.3,c);
    for(let finger=0;finger<3;finger++){
      ctx.strokeStyle=c.dark;ctx.lineWidth=1.3;ctx.beginPath();
      ctx.moveTo(side*22+fin+(finger-1)*2,-13-lift);
      ctx.lineTo(side*24+fin+(finger-1)*2,-9-lift);ctx.stroke();
    }
    crystal(ctx,side*15,-41,3.6,8,c.accent,c.light);
  }
  mass(ctx,0,-36,15,20,c);
  // Escamas sobre o peitoral e cinto de coral calcificado.
  for(let row=0;row<4;row++)for(let col=0;col<5;col++){
    const x=-10+col*4.8+(row%2)*1.4;
    const y=-44+row*7;
    ellipse(ctx,x,y,2.1,3.2,rgba(row%2?c.accent:c.light,.55));
    ctx.strokeStyle=rgba(c.dark,.46);ctx.lineWidth=.6;
    ctx.beginPath();ctx.moveTo(x-1.5,y);
    ctx.lineTo(x,y+2);ctx.lineTo(x+1.5,y);ctx.stroke();
  }
  ctx.strokeStyle=c.dark;ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(-14,-23);ctx.lineTo(13,-23);ctx.stroke();
  for(let i=0;i<5;i++)
    crystal(ctx,-10+i*5,-20,2.1,4,c.light);
  mass(ctx,0,-57,12,13,c);
  // Frisos de guelras laterais e coroa de espinhos marinhos.
  for(const side of [-1,1]){
    for(let i=0;i<4;i++)
      crystal(ctx,side*(11+i*2),-56+i*3,3,7+i%2*2,c.accent);
    ellipse(ctx,side*9,-53,3,4,rgba(c.dark,.56));
    for(let r=0;r<3;r++){
      ctx.strokeStyle=rgba(c.accent,.84);ctx.lineWidth=.9;
      ctx.beginPath();ctx.moveTo(side*(11+r*2),-53+r*2);
      ctx.lineTo(side*(16+r*2),-55+r*2);ctx.stroke();
    }
  }
  for(let i=0;i<7;i++)
    crystal(ctx,-9+i*3,-67+i%3*3,3,9,c.light);
  eye(ctx,-5,-56,c,2.3);eye(ctx,5,-56,c,2.3);
  // Tridente sem sprite externo: haste, dentes e arcos luminosos ligados à mão.
  const raise=strike*9;
  const tilt=strike*4;
  ctx.strokeStyle=EDGE;ctx.lineWidth=4.2;
  ctx.beginPath();ctx.moveTo(-24,-12-raise);
  ctx.lineTo(-25-tilt,-68-raise);ctx.stroke();
  ctx.strokeStyle=c.accent;ctx.lineWidth=2.4;ctx.stroke();
  for(const dx of [-7,0,7]){
    const hx=-25-tilt+dx;
    ctx.strokeStyle=rgba(c.accent,.8);ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(hx,-55-raise);
    ctx.lineTo(hx,-73-raise);
    ctx.lineTo(hx+Math.sin(time*2+dx)*1.3,-78-raise);ctx.stroke();
    crystal(ctx,hx,-71-raise,3,10,c.light,c.accent);
  }
  etched(ctx,c,12,0,-35,10,14);
  if(strike>.02){
    // Corrente eléctrica concentrada no tridente, não em qualquer objeto.
    for(let k=0;k<9;k++){
      const x=-29-tilt+Math.sin(time*2+k*1.6)*9;
      const y=-81-raise-k*2;
      ellipse(ctx,x,y,1+k%3*.35,.75,rgba(k%2?c.accent:c.light,
        strike*(1-k/10)*.85));
    }
  }
};
const CREATURE_PALETTE:Ramp={
  base:"#349b93",dark:"#27516f",light:"#8be6c7",accent:"#82bdef",eyes:"#ffe17c",
};
export function renderTideHunterTritonCreature(ctx:CanvasRenderingContext2D,actor:RegionalCreatureVisual,
  sx:number,sy:number,time=0):void {
  renderWave2Frame(ctx,actor,sx,sy,time,CREATURE_PALETTE,
    (surface,colors,t)=>triton(surface,colors,t,actor.motionPhase??0,actor.moving??0,actor.casting??0));
}
