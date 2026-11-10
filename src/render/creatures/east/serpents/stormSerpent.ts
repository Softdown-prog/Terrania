/** Serpente da Tempestade: coluna ondulante e condução elétrica na crista. */
import type { ColorRamp } from "../../shared/regionalGeometry.ts";
import { organic, shard, headEyes, OUTLINE, GLINT } from "../../shared/regionalGeometry.ts";
import { ellipse, rgba } from "../../../draw.ts";
import { renderRegionalFrame } from "../../shared/regionalFrame.ts";
import type { RegionalCreatureVisual } from "../../../regionalCreatures.ts";

export const drawSerpent = (ctx:CanvasRenderingContext2D,c:ColorRamp,time:number,
  phase=0,moving=0,casting=0):void => {
  const slither=Math.max(0,Math.min(1,moving));
  const voltage=Math.max(0,Math.min(1,casting));
  const wave=Math.sin(phase)*slither*5;
  // O caminho principal é único: contorno, escamas e ventre seguem a mesma curva.
  const spine=():void=>{
    ctx.beginPath();ctx.moveTo(-4,-9);
    ctx.bezierCurveTo(26+wave*.3,4,30+wave,-13,15+wave*.65,-24);
    ctx.bezierCurveTo(-3+wave,-38,-21-wave*.5,-22,-14,-45);
  };
  ctx.lineCap="round";ctx.lineJoin="round";
  ctx.strokeStyle=OUTLINE;ctx.lineWidth=19;spine();ctx.stroke();
  ctx.strokeStyle=c.base;ctx.lineWidth=15;spine();ctx.stroke();
  ctx.strokeStyle=c.light;ctx.lineWidth=3;spine();ctx.stroke();
  // Placas de escamas, deslocando o acento com o pulso da serpente.
  for(let i=0;i<12;i++){
    const x=-8+Math.sin(i*.8)*17+wave*(i/12);
    const y=-12-i*2.6;
    ellipse(ctx,x,y,2+i%3*.4,3.1,rgba(i%3?c.dark:c.accent,.68),-.3);
    ctx.strokeStyle=rgba(c.light,.65);ctx.lineWidth=.6;
    ctx.beginPath();ctx.moveTo(x-1.1,y-1);ctx.lineTo(x+.7,y-2.3);ctx.stroke();
  }
  organic(ctx,-14,-48,13,10,c,-.18);
  organic(ctx,-21,-44,12,5,c,.1);
  for(let i=0;i<7;i++){
    const p=i/6;
    shard(ctx,-3+Math.sin(i*1.5)*20+wave*p,-18-i*4,4,10+i%3*2,
      i%2?c.accent:c.light);
  }
  headEyes(ctx,[[-19,-51],[-10,-50]],c,2.4);
  // Boca bifurcada, mandíbula e língua revelam a orientação da cabeça.
  ctx.fillStyle=c.dark;ctx.beginPath();ctx.moveTo(-31,-42);
  ctx.quadraticCurveTo(-21,-37+voltage*3,-13,-42);
  ctx.lineTo(-17,-41);ctx.quadraticCurveTo(-24,-42,-31,-42);ctx.fill();
  ctx.strokeStyle=c.accent;ctx.lineWidth=1.2;ctx.beginPath();
  ctx.moveTo(-29,-40);ctx.lineTo(-35,-40-voltage*2);
  ctx.moveTo(-35,-40-voltage*2);ctx.lineTo(-38,-43);
  ctx.moveTo(-35,-40-voltage*2);ctx.lineTo(-39,-37);ctx.stroke();
  // Cristais condutores em vez de eletricidade genérica ao redor do corpo.
  ellipse(ctx,4+wave*.35,-17,4.1,2.3,c.accent,-.45);
  ellipse(ctx,3.2+wave*.35,-17.8,1.5,.7,rgba(GLINT,.84),-.45);
  for(let i=0;i<4;i++){
    const charge=Math.sin(time*3+i+phase*.2)*.9*voltage;
    ctx.strokeStyle=rgba(i%2?c.light:c.accent,.48+voltage*.48);
    ctx.lineWidth=1.1+voltage*.55;
    ctx.beginPath();ctx.moveTo(10+i*2,-27-i*3);
    ctx.lineTo(16+i*2+charge,-30-i*4);
    ctx.lineTo(13+i*2-charge,-35-i*4);ctx.stroke();
  }
  shard(ctx,-8,-58,7,12,c.accent);
  ellipse(ctx,-5,-59,3.1,1.8,c.dark,-.4);
  ellipse(ctx,-5.7,-59.6,1.1,.6,rgba(GLINT,.73),-.4);
  if(voltage>.01)for(let i=0;i<6;i++){
    const x=-15+Math.cos(i*1.4+time*1.2)*20;
    const y=-28-i*5+Math.sin(i+time*2)*2;
    ctx.strokeStyle=rgba(i%2?c.light:c.accent,voltage*(1-i/8));
    ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(x-3,y-2);
    ctx.lineTo(x,y+1.5);ctx.lineTo(x+3,y-3);ctx.stroke();
  }
};
const CREATURE_PALETTE: ColorRamp = {"base":"#4653ac","light":"#79d1de","dark":"#302656","accent":"#d37ad8","eye":"#fce46f"};
export function renderStormSerpentCreature(ctx:CanvasRenderingContext2D,actor:RegionalCreatureVisual,
  sx:number,sy:number,time=0):void {
  renderRegionalFrame(ctx,actor,sx,sy,time,CREATURE_PALETTE,
    (surface,colors,t)=>drawSerpent(surface,colors,t,actor.motionPhase??0,actor.moving??0,actor.casting??0));
}
