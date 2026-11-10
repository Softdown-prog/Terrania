/**
 * Espírito de Gelo — figura translúcida com véus, coroa de geada e núcleo próprio.
 * As correntes dependem de movimento real e a descarga da preparação de ataque.
 */
import type { ColorRamp } from "../../shared/regionalGeometry.ts";
import { organic, shard, headEyes, GLINT, OUTLINE } from "../../shared/regionalGeometry.ts";
import { ellipse, rgba, TAU } from "../../../draw.ts";
import { renderRegionalFrame } from "../../shared/regionalFrame.ts";
import type { RegionalCreatureVisual } from "../../../regionalCreatures.ts";

export const drawSpirit=(ctx:CanvasRenderingContext2D,c:ColorRamp,time:number,
  phase=0,moving=0,casting=0):void=>{
  const glide=Math.max(0,Math.min(1,moving));
  const frost=Math.max(0,Math.min(1,casting));
  const pulse=.5+.5*Math.sin(time*1.8);
  const drift=Math.sin(phase)*glide*4;
  // Três caudas de névoa independentes dão leitura fantasmagórica.
  for(let strand=0;strand<3;strand++){
    const s=strand-1;
    const tipX=s*11+Math.sin(time*1.5+strand)*2+drift;
    ctx.fillStyle=rgba(c.base,.38+strand*.07);
    ctx.strokeStyle=rgba(c.light,.5);ctx.lineWidth=.9;
    ctx.beginPath();ctx.moveTo(s*8-9,-30);
    ctx.bezierCurveTo(s*18-8,-19,tipX-9,-16,tipX,-3+strand*3);
    ctx.quadraticCurveTo(tipX-8,-12,s*8+9,-31);
    ctx.closePath();ctx.fill();ctx.stroke();
    // Pequenos núcleos de névoa seguem o corpo sem congelar o idle.
    for(let k=0;k<4;k++){
      const x=s*8+Math.sin(time*1.2+k*.9+strand)*3+drift*(k/4);
      const y=-9-k*6;
      ellipse(ctx,x,y,2.2+k*.65,2.8,
        rgba(k%2?c.accent:c.light,.16+.11*(k/4)));
    }
  }
  // Manto etéreo dobrado: gradiente do gelo para a sombra azul.
  const mantle=ctx.createLinearGradient(-20,-56,19,-24);
  mantle.addColorStop(0,rgba(c.light,.92));
  mantle.addColorStop(.43,rgba(c.base,.86));
  mantle.addColorStop(1,rgba(c.dark,.8));
  ellipse(ctx,0,-39,19,20,mantle);
  ctx.strokeStyle=rgba(c.light,.77);ctx.lineWidth=1.2;
  ctx.beginPath();ctx.ellipse(0,-39,19,20,0,Math.PI*1.13,Math.PI*1.82);ctx.stroke();
  for(const side of [-1,1]){
    // Braços espectrais e pontas alongadas, sem anatomia humana copiada.
    const wave=Math.sin(time*1.4+side)*1.7+drift*.4;
    ctx.strokeStyle=OUTLINE;ctx.lineWidth=7;ctx.lineCap="round";
    ctx.beginPath();ctx.moveTo(side*14,-43);
    ctx.quadraticCurveTo(side*24,-34+wave,side*27,-18+wave);ctx.stroke();
    ctx.strokeStyle=rgba(c.base,.85);ctx.lineWidth=4.5;ctx.stroke();
    shard(ctx,side*27,-14+wave,3.4,10,c.light,c.accent);
    for(let finger=0;finger<2;finger++)
      shard(ctx,side*(25+finger*3),-12+wave,1.7,6+finger*2,c.accent);
  }
  // Máscara e crista sobre o manto: olhos bem separados com expressão.
  organic(ctx,0,-51,17,11,c);
  for(let crest=0;crest<7;crest++){
    const x=-15+crest*5;
    shard(ctx,x,-56+(crest%2)*2,3.1,10+crest%3*4,
      crest%3?c.light:c.accent,c.light);
  }
  headEyes(ctx,[[-9,-49],[9,-49]],c,3.2);
  ellipse(ctx,-9,-49,1.2,1.5,rgba(c.dark,.93));
  ellipse(ctx,9,-49,1.2,1.5,rgba(c.dark,.93));
  ctx.strokeStyle=rgba(c.dark,.76);ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(-5,-43);
  ctx.quadraticCurveTo(0,-41-frost*3,5,-43);ctx.stroke();
  // Arcos e cristais do halo pertencem a este espírito, não ao compositor global.
  for(let i=0;i<10;i++){
    const a=i*TAU/10+time*.28;
    const r=22+(i%3)*2.1+frost*3;
    const x=Math.cos(a)*r,y=-41+Math.sin(a)*r*.72;
    shard(ctx,x,y,2.2+i%2*.55,5+i%3*2,
      i%2?c.accent:c.light);
    ellipse(ctx,x,y-2,.9,.65,rgba(GLINT,.49+pulse*.23));
  }
  if(frost>.01){
    // Descarga direcionada de partículas de gelo à frente do rosto.
    for(let i=0;i<12;i++){
      const x=17+i*3.6;
      const y=-44+Math.sin(time*2.3+i*1.6)*5+i%2*2;
      ellipse(ctx,x,y,1.4+(i%3)*.55,.9+(i%2)*.4,
        rgba(i%3?c.light:c.accent,frost*(1-i/14)*.82));
      if(i%3===0)shard(ctx,x+2,y,2.1,5,c.light);
    }
  }
};
const CREATURE_PALETTE:ColorRamp={
  base:"#519bcc",light:"#dcf7ff",dark:"#205c8e",accent:"#83e4ff",eye:"#cffaff",
};
export function renderFrostSpiritCreature(ctx:CanvasRenderingContext2D,actor:RegionalCreatureVisual,
  sx:number,sy:number,time=0):void {
  renderRegionalFrame(ctx,actor,sx,sy,time,CREATURE_PALETTE,
    (surface,colors,t)=>drawSpirit(surface,colors,t,actor.motionPhase??0,actor.moving??0,actor.casting??0));
}
