/** Escorpião das Dunas: pinças independentes, oito patas alternadas e ferrão vivo. */
import type { ColorRamp } from "../../shared/regionalGeometry.ts";
import { organic, shard, headEyes, curvedLeg, carapaceDetail } from "../../shared/regionalGeometry.ts";
import { ellipse, rgba } from "../../../draw.ts";
import { renderRegionalFrame } from "../../shared/regionalFrame.ts";
import type { RegionalCreatureVisual } from "../../../regionalCreatures.ts";

export const drawScorpion = (ctx:CanvasRenderingContext2D,c:ColorRamp,time=0,
  phase=0,moving=0,casting=0):void => {
  const stride=Math.max(0,Math.min(1,moving));
  const threat=Math.max(0,Math.min(1,casting));
  // Cada lado apoia quatro patas em fases defasadas; o corpo não desliza.
  for(const s of [-1,1]){
    for(let i=0;i<4;i++){
      const step=Math.sin(phase+i*1.35+(s<0?Math.PI:0))*stride*3;
      curvedLeg(ctx,s*(9+i*2),-12+i*2,s*(20+i*2)+step,-9+i*3-step*.4,
        s*(25+i*3)+step*1.4,-2+i-Math.max(0,step)*.55,c,3.3);
      ellipse(ctx,s*(25+i*3)+step*1.4,-1+i-Math.max(0,step)*.55,2.5,1.3,c.dark);
    }
    const pincerAngle=(s<0?-1:1)*(threat*4+Math.sin(time*1.7+s)*.6);
    curvedLeg(ctx,s*11,-22,s*24,-24,s*30,-13+pincerAngle,c,7);
    organic(ctx,s*30,-13+pincerAngle,9,7,c,s*.3);
    // As duas metades da pinça fecham ao conjurar.
    const open=7-threat*4;
    shard(ctx,s*38,-15+pincerAngle,5,open+4,c.light);
    shard(ctx,s*35,-8+pincerAngle,3,open,c.dark);
    ctx.strokeStyle=rgba(c.light,.66);ctx.lineWidth=1.3;
    ctx.beginPath();ctx.moveTo(s*30,-16+pincerAngle);
    ctx.lineTo(s*34,-13+pincerAngle);ctx.stroke();
  }
  organic(ctx,0,-20,17,14,c);
  // Placas segmentadas e reflexos da cutícula âmbar.
  for(let i=0;i<6;i++){
    const x=-13+i*5.2,y=-22+Math.sin(i*.9)*1.5;
    ellipse(ctx,x,y,3.8,7,i%2?rgba(c.accent,.52):rgba(c.light,.43),-.15);
    ctx.strokeStyle=rgba(c.dark,.85);ctx.lineWidth=.9;ctx.beginPath();
    ctx.moveTo(x-1.5,y-4);ctx.quadraticCurveTo(x+2,y,x-1.2,y+4);ctx.stroke();
  }
  carapaceDetail(ctx,0,-20,14,11,c,12);
  // Cauda articulada do abdômen à ponta: ondulação só acompanha a passada.
  const curl=Math.sin(phase*.85)*stride*4;
  const tail:[[number,number],[number,number],[number,number],[number,number]]=[
    [10,-28],[16+curl*.3,-39],[11+curl,-53],[1+curl*1.1,-59+Math.sin(time*1.2)*.6]];
  for(let i=0;i<tail.length;i++){
    const [x,y]=tail[i]!;
    organic(ctx,x,y,7-i*.6,6-i*.4,c,-.2+i*.08);
    ellipse(ctx,x-1.4,y-2,2.7,2.2,rgba(c.light,.64));
    if(i>0){
      ctx.strokeStyle=c.dark;ctx.lineWidth=1.6;ctx.beginPath();
      ctx.moveTo(tail[i-1]![0]+3,tail[i-1]![1]-4);
      ctx.lineTo(x,y-4);ctx.stroke();
    }
  }
  const [tipX,tipY]=tail[3]!;
  shard(ctx,tipX-5,tipY-2,6,17,c.accent);
  if(threat>.01){
    ellipse(ctx,tipX-5,tipY-18,3+threat*2,4+threat*2,rgba(c.accent,threat*.67));
    for(let i=0;i<4;i++)
      ellipse(ctx,tipX-7-i*2,tipY-18-i*2+Math.sin(time*2+i),
        1.1,.8,rgba(c.light,threat*(1-i/5)));
  }
  headEyes(ctx,[[-4,-25],[4,-25]],c,1.7);
};
const CREATURE_PALETTE: ColorRamp = {"base":"#b88842","light":"#f2d184","dark":"#504636","accent":"#f4a345","eye":"#ffd46c"};
export function renderDuneScorpionCreature(ctx:CanvasRenderingContext2D,actor:RegionalCreatureVisual,
  sx:number,sy:number,time=0):void {
  renderRegionalFrame(ctx,actor,sx,sy,time,CREATURE_PALETTE,
    (surface,colors,t)=>drawScorpion(surface,colors,t,actor.motionPhase??0,actor.moving??0,actor.casting??0));
}
