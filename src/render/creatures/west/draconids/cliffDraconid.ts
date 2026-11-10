/** Draconídeo dos Penhascos: membranas articuladas, armadura e sopro de brasa. */
import type { ColorRamp } from "../../shared/regionalGeometry.ts";
import { organic, shard, headEyes, curvedLeg, carapaceDetail, OUTLINE } from "../../shared/regionalGeometry.ts";
import { ellipse, rgba } from "../../../draw.ts";
import { renderRegionalFrame } from "../../shared/regionalFrame.ts";
import type { RegionalCreatureVisual } from "../../../regionalCreatures.ts";

function wing(ctx:CanvasRenderingContext2D,c:ColorRamp,side:number,
  time:number,moving:number,casting:number):void {
  const unfurl=Math.max(0,Math.min(1,casting));
  const flap=(Math.sin(time*2.1+side*.6)*.7+
    Math.sin(time*3.6)*moving*.6);
  const tipX=side*(28+unfurl*15),tipY=-57-unfurl*10+flap;
  const elbowX=side*(25+unfurl*7),elbowY=-40-unfurl*6;
  ctx.fillStyle=c.dark;ctx.strokeStyle=OUTLINE;ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(side*7,-38);
  ctx.quadraticCurveTo(side*19,-53,tipX,tipY);
  ctx.lineTo(side*(33+unfurl*13),-45-unfurl*4);
  ctx.lineTo(side*(27+unfurl*6),-38);
  ctx.lineTo(side*(30+unfurl*5),-30);
  ctx.lineTo(side*12,-25);ctx.closePath();ctx.fill();ctx.stroke();
  const membrane=ctx.createLinearGradient(side*8,-55,tipX,-30);
  membrane.addColorStop(0,rgba(c.base,.9));
  membrane.addColorStop(1,rgba(c.accent,.5+unfurl*.28));
  ctx.fillStyle=membrane;
  ctx.beginPath();ctx.moveTo(side*11,-37);
  ctx.quadraticCurveTo(side*19,-49,tipX,tipY);
  ctx.lineTo(side*(30+unfurl*9),-42);
  ctx.lineTo(side*12,-29);ctx.closePath();ctx.fill();
  // Varetas de osso convergem na escápula; a membrana não é um triângulo solto.
  for(let rib=0;rib<4;rib++){
    const f=rib/3;
    const tx=tipX*(1-f)+side*(29+unfurl*8)*f;
    const ty=tipY*(1-f)+(-29)*f;
    ctx.strokeStyle=rib===0?c.light:rgba(c.light,.62);
    ctx.lineWidth=rib===0?2.1:1.15;
    ctx.beginPath();ctx.moveTo(side*11,-34);
    ctx.quadraticCurveTo(elbowX,elbowY,tx,ty);ctx.stroke();
  }
  ctx.strokeStyle=rgba(c.accent,.66);ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(side*11,-35);
  ctx.lineTo(side*19,-43+flap*.4);ctx.stroke();
}

export const drawDraconid=(ctx:CanvasRenderingContext2D,c:ColorRamp,
  time=0,phase=0,moving=0,casting=0):void=>{
  const walk=Math.max(0,Math.min(1,moving));
  const charge=Math.max(0,Math.min(1,casting));
  // Cauda espessa acompanha as pernas; ponta espinhosa fica para trás do corpo.
  const tailSwing=Math.sin(phase)*walk*5;
  ctx.strokeStyle=OUTLINE;ctx.lineWidth=11;ctx.lineCap="round";
  ctx.beginPath();ctx.moveTo(9,-14);
  ctx.quadraticCurveTo(35+tailSwing,-12,31+tailSwing,-31);ctx.stroke();
  ctx.strokeStyle=c.base;ctx.lineWidth=7;ctx.stroke();
  shard(ctx,31+tailSwing,-31,5,13,c.accent,c.light);
  for(const side of [-1,1])wing(ctx,c,side,time,walk,charge);
  // Quadril, joelhos e garras em passada alternada.
  for(const side of [-1,1]){
    const step=Math.sin(phase+(side<0?0:Math.PI))*walk;
    curvedLeg(ctx,side*8,-14,side*14+step*3,-6,
      side*17+step*5,1-Math.max(0,step)*2.8,c,6);
    for(let claw=0;claw<3;claw++)
      shard(ctx,side*17+step*5+(claw-1)*3,3-Math.max(0,step)*2.8,
        1.6,4.1,c.light);
  }
  organic(ctx,0,-26,15,19,c,.09);
  organic(ctx,0,-47,12,11,c,-.15);
  // Escamas cervicais e placas centrais reforçam o volume.
  for(let row=0;row<4;row++){
    const y=-40+row*8;
    shard(ctx,-5+row%2*2,y,3.4,5.5,
      row%2?c.accent:c.light);
    shard(ctx,5-row%2*2,y,3.4,5.5,c.base);
  }
  for(const side of [-1,1]){
    const clawLift=side>0?charge*6:charge*2;
    curvedLeg(ctx,side*12,-34,side*18,-24-clawLift,
      side*20,-15-clawLift,c,4.7);
    for(let i=0;i<3;i++)
      shard(ctx,side*20+(i-1)*2.4,-13-clawLift,
        1.4,4.4,c.light);
    shard(ctx,side*9,-56,5,12,c.light);
    shard(ctx,side*15,-46,3.3,7,c.accent);
  }
  carapaceDetail(ctx,0,-26,11,14,c,13);
  headEyes(ctx,[[-4,-49],[5,-49]],c,2.1);
  // Mandíbula e presas sinalizam a conjuração sem deslocar a hitbox.
  ctx.fillStyle=OUTLINE;ctx.beginPath();ctx.moveTo(-5,-41);
  ctx.quadraticCurveTo(2,-37+charge*3,11,-42+charge*3);
  ctx.quadraticCurveTo(4,-35+charge*7,-5,-39);
  ctx.closePath();ctx.fill();
  for(let tooth=0;tooth<3;tooth++){
    ctx.fillStyle=c.light;ctx.beginPath();
    const x=-1+tooth*3.3;
    ctx.moveTo(x,-40);ctx.lineTo(x+1,-36+charge*3.2);
    ctx.lineTo(x+2,-40);ctx.closePath();ctx.fill();
  }
  shard(ctx,0,-38,4,5,c.accent);
  // Sopro acumulando partículas no focinho, só durante casting.
  if(charge>.02){
    for(let i=0;i<9;i++){
      const x=13+i*3.2,y=-39+Math.sin(time*2.7+i*1.4)*4+i*.3;
      ellipse(ctx,x,y,1.4+i%3*.4,1+i%2*.4,
        rgba(i%3?c.accent:c.light,charge*(1-i/10)*.83));
    }
  }
};
const CREATURE_PALETTE: ColorRamp = {"base":"#66646a","light":"#b0a499","dark":"#292d3b","accent":"#e38b4f","eye":"#f7bb4d"};
export function renderCliffDraconidCreature(ctx:CanvasRenderingContext2D,actor:RegionalCreatureVisual,
  sx:number,sy:number,time=0):void {
  renderRegionalFrame(ctx,actor,sx,sy,time,CREATURE_PALETTE,
    (surface,colors,t)=>drawDraconid(surface,colors,t,actor.motionPhase??0,actor.moving??0,actor.casting??0));
}
