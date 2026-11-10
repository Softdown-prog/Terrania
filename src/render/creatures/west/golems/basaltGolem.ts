/** Golem de Basalto: lajes encaixadas, punhos pesados e runas nas fissuras.
 * O render reage à simulação; impacto, dano e loot continuam no motor. */
import type { ColorRamp } from "../../shared/regionalGeometry.ts";
import { organic, shard, headEyes, curvedLeg, OUTLINE } from "../../shared/regionalGeometry.ts";
import { ellipse, rgba } from "../../../draw.ts";
import { renderRegionalFrame } from "../../shared/regionalFrame.ts";
import type { RegionalCreatureVisual } from "../../../regionalCreatures.ts";

type Point = readonly [number, number];

/** Pedra facetada por espécie: cada bloco tem nervuras e uma aresta iluminada. */
function basaltPlate(ctx:CanvasRenderingContext2D,points:readonly Point[],
  c:ColorRamp,glow=0):void {
  const first=points[0]!,last=points[points.length-1]!;
  const gradient=ctx.createLinearGradient(first[0]-12,first[1]-12,last[0]+12,last[1]+12);
  gradient.addColorStop(0,c.light);gradient.addColorStop(.36,c.base);gradient.addColorStop(1,c.dark);
  ctx.beginPath();ctx.moveTo(first[0],first[1]);
  for(const [x,y] of points.slice(1))ctx.lineTo(x,y);
  ctx.closePath();ctx.fillStyle=gradient;ctx.strokeStyle=OUTLINE;ctx.lineWidth=1.9;
  ctx.fill();ctx.stroke();
  ctx.strokeStyle=rgba(c.light,.48);ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(first[0]+1,first[1]+1);
  const middle=points[1]!;
  ctx.lineTo(middle[0],middle[1]+1);ctx.stroke();
  if(glow>0){
    ctx.strokeStyle=rgba(c.accent,.3+.6*glow);ctx.lineWidth=1.6;
    ctx.beginPath();ctx.moveTo(middle[0],middle[1]+2);
    ctx.lineTo(last[0],last[1]-1);ctx.stroke();
  }
}

/** Anatomia individual: pernas não dão passos quando moving=0. */
export const drawBasaltGolem=(ctx:CanvasRenderingContext2D,c:ColorRamp,
  time=0,phase=0,moving=0,casting=0):void=>{
  const walk=Math.max(0,Math.min(1,moving));
  const charge=Math.max(0,Math.min(1,casting));
  const pulse=.5+.5*Math.sin(time*2.1);
  // Pés largos e joelhos de pedra são separados da massa central.
  for(const side of [-1,1]){
    const stride=Math.sin(phase+(side<0?0:Math.PI))*walk;
    const footX=side*13+stride*5, footY=1-Math.max(0,stride)*3;
    curvedLeg(ctx,side*9,-19,side*12+stride*2,-9,footX,footY,c,10);
    basaltPlate(ctx,[[footX-9,footY],[footX-7,footY-7],
      [footX+6,footY-8],[footX+10,footY+3],[footX-8,footY+3]],c);
    for(let nail=0;nail<3;nail++){
      ctx.strokeStyle=c.dark;ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(footX-5+nail*5,footY);
      ctx.lineTo(footX-6+nail*5,footY+3);ctx.stroke();
    }
  }
  // Ombros e braços segmentados: um punho se ergue ao preparar o golpe.
  for(const side of [-1,1]){
    const windup=side>0?charge:charge*.3;
    const armStep=Math.sin(phase+(side>0?Math.PI:0))*walk;
    const elbowX=side*(25+armStep*2);
    const elbowY=-16-windup*8;
    curvedLeg(ctx,side*17,-35,side*24,-27-windup*4,
      elbowX,elbowY,c,10);
    basaltPlate(ctx,[[side*6,-43],[side*20,-43],
      [side*30,-32],[side*21,-22],[side*12,-29]],c,charge*.45);
    const fistX=side*(27+armStep*2),fistY=-7-windup*15;
    basaltPlate(ctx,[[fistX-8,fistY-5],[fistX+4,fistY-9],
      [fistX+11,fistY-2],[fistX+7,fistY+7],[fistX-7,fistY+5]],c,charge);
    for(let knuckle=0;knuckle<3;knuckle++){
      ellipse(ctx,fistX-4+knuckle*5,fistY+2,2,2.5,c.dark);
      ellipse(ctx,fistX-4+knuckle*5,fistY+1.1,.85,.7,c.light);
    }
  }
  organic(ctx,0,-28,19,21,c);
  basaltPlate(ctx,[[-18,-42],[-6,-49],[9,-44],[17,-30],
    [11,-13],[-11,-12],[-21,-27]],c,charge*.45);
  // Placas do tórax não repetem apenas a elipse da forma base.
  for(let plate=0;plate<4;plate++){
    const y=-39+plate*7;
    basaltPlate(ctx,[[-13+plate%2,y],[-3,y-3],
      [12-plate%3,y-1],[8,y+5],[-9,y+5]],c,plate===2?charge:0);
  }
  organic(ctx,0,-50,12,11,c);
  basaltPlate(ctx,[[-13,-56],[-3,-63],[11,-58],[14,-48],
    [8,-43],[-10,-44]],c,charge);
  shard(ctx,-10,-58,4,8,c.light);shard(ctx,8,-58,4,9,c.light);
  headEyes(ctx,[[-5,-52],[5,-52]],c,2.3);
  ctx.strokeStyle=OUTLINE;ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(-6,-46);ctx.lineTo(6,-46);ctx.stroke();
  // Fissuras dourado-esverdeadas irradiam do núcleo sem alterar dano.
  for(let i=0;i<9;i++){
    const x=-13+(i%4)*8,y=-41+Math.floor(i/4)*8;
    ctx.strokeStyle=rgba(c.dark,.87);ctx.lineWidth=2.7;
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+2,y+3);
    ctx.lineTo(x-1,y+6);ctx.stroke();
    ctx.strokeStyle=rgba(c.accent,.5+charge*.4);ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+2,y+3);
    ctx.lineTo(x-1,y+6);ctx.stroke();
    if(charge>.01)
      ellipse(ctx,x+1,y+2,.9+charge*.6,1.2,
        rgba(c.accent,charge*(.45+pulse*.35)));
  }
  for(const side of [-1,1]){
    shard(ctx,side*19,-44,4,8,c.accent,c.light);
    ellipse(ctx,side*15,-31,1.5,1.1,rgba(c.light,.7));
  }
  if(charge>.02){
    // Pó e pequenos detritos seguem o punho ativo, não um círculo global.
    for(let i=0;i<9;i++){
      const x=26+Math.sin(i*2.4+time*.8)*8;
      const y=-29-i*3+Math.cos(i*3+time)*2;
      ellipse(ctx,x,y,1+i%3*.4,.7+i%2*.4,
        rgba(i%2?c.accent:c.light,charge*(1-i/10)*.8));
    }
  }
};
const CREATURE_PALETTE: ColorRamp = {"base":"#716f6b","light":"#b4a79a","dark":"#343944","accent":"#729267","eye":"#ffbf59"};
export function renderBasaltGolemCreature(ctx:CanvasRenderingContext2D,actor:RegionalCreatureVisual,
  sx:number,sy:number,time=0):void {
  renderRegionalFrame(ctx,actor,sx,sy,time,CREATURE_PALETTE,
    (surface,colors,t)=>drawBasaltGolem(surface,colors,t,actor.motionPhase??0,actor.moving??0,actor.casting??0));
}
