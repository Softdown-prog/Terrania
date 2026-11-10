/** Hidra do Pântano: três pescoços independentes, mandíbulas e veneno.
 * A conjuração anima a cabeça e o brilho; nenhuma regra de combate é duplicada. */
import type { ColorRamp } from "../../shared/regionalGeometry.ts";
import { organic, headEyes, carapaceDetail, shard, curvedLeg, OUTLINE } from "../../shared/regionalGeometry.ts";
import { ellipse, rgba } from "../../../draw.ts";
import { renderRegionalFrame } from "../../shared/regionalFrame.ts";
import type { RegionalCreatureVisual } from "../../../regionalCreatures.ts";

function neckAndHead(ctx:CanvasRenderingContext2D,c:ColorRamp,h:number,
  time:number,phase:number,moving:number,casting:number):void {
  const side=h-1;
  const sway=Math.sin(time*1.5+h*1.2)*1.1+
    Math.sin(phase+h*1.3)*moving*3;
  const x=side*19+sway;
  const y=-52+(h%2)*7+Math.sin(time*1.6+h)*.7;
  const attack=Math.max(0,Math.min(1,casting));
  const open=attack*(h===1?5:2.6);
  // Coluna com duas bordas e um ventre iluminado, ligada ao corpo.
  const spine=():void=>{
    ctx.beginPath();ctx.moveTo(side*11,-18);
    ctx.bezierCurveTo(side*27,-25,side*11+sway,-40,x,y+3);
  };
  ctx.lineCap="round";ctx.lineJoin="round";
  ctx.strokeStyle=OUTLINE;ctx.lineWidth=14;spine();ctx.stroke();
  ctx.strokeStyle=c.base;ctx.lineWidth=10;spine();ctx.stroke();
  ctx.strokeStyle=rgba(c.light,.6);ctx.lineWidth=2.1;spine();ctx.stroke();
  // Espinhos nas laterais mostram três perfis de cabeça diferentes.
  for(let n=0;n<4;n++){
    const hx=side*(14+n*2)+sway*n/4;
    const hy=-23-n*7+(h%2)*1.5;
    shard(ctx,hx-3,hy,2.5,5+n%2*3,n%2?c.light:c.accent);
  }
  organic(ctx,x,y,9.7,8.3,c,side*.12);
  organic(ctx,x+5,y+5,7,3.5,c,side*.08);
  // Cristas e chifres são individualizados por posição da cabeça.
  for(let n=0;n<3+h;n++)
    shard(ctx,x-7+n*3.1,y-6,2.3,5+n%3*2,n%2?c.accent:c.light);
  headEyes(ctx,[[x-2,y-2],[x+5,y-1.2]],c,h===1?1.9:1.65);
  // Boca com mandíbula móvel e presas desenhadas dentro do maxilar.
  ctx.fillStyle=OUTLINE;ctx.beginPath();ctx.moveTo(x+2,y+4);
  ctx.quadraticCurveTo(x+8,y+5+open*.5,x+13,y+3+open);
  ctx.quadraticCurveTo(x+9,y+9+open,x+2,y+5);
  ctx.closePath();ctx.fill();
  ctx.strokeStyle=rgba(c.accent,.9);ctx.lineWidth=.8;
  ctx.beginPath();ctx.moveTo(x+5,y+5);ctx.lineTo(x+12,y+4+open);ctx.stroke();
  for(let fang=0;fang<3;fang++){
    ctx.fillStyle=c.light;ctx.beginPath();
    const fx=x+5+fang*3;
    ctx.moveTo(fx,y+4+open*.2);
    ctx.lineTo(fx+1,y+8+open*.45);
    ctx.lineTo(fx+2,y+4+open*.2);ctx.closePath();ctx.fill();
  }
  ellipse(ctx,x+10,y-1.7,1.1,.85,c.dark);
  ellipse(ctx,x+10.2,y-2,.35,.32,c.light);
  // Apenas a cabeça que prepara a mordida expele veneno visível.
  if(attack>.01){
    for(let drop=0;drop<5;drop++){
      const px=x+15+drop*3.3;
      const py=y+5+Math.sin(time*2+drop+h)*3+drop*.7;
      ellipse(ctx,px,py,1.2+drop%2*.4,.9,
        rgba(drop%2?c.accent:c.light,attack*(1-drop/6)*.82));
    }
  }
}

export const drawHydra=(ctx:CanvasRenderingContext2D,c:ColorRamp,
  time=0,phase=0,moving=0,casting=0):void=>{
  const crawl=Math.max(0,Math.min(1,moving));
  const cast=Math.max(0,Math.min(1,casting));
  // Cauda longa sobre as patas; o deslocamento depende da passada real.
  const tailCurl=Math.sin(phase)*crawl*5;
  ctx.lineCap="round";ctx.strokeStyle=OUTLINE;ctx.lineWidth=11;
  ctx.beginPath();ctx.moveTo(-20,-11);
  ctx.bezierCurveTo(-39,-8,-38-tailCurl,-24,-46-tailCurl,-22);ctx.stroke();
  ctx.strokeStyle=c.base;ctx.lineWidth=7;ctx.stroke();
  for(const side of [-1,1]){
    const step=Math.sin(phase+(side<0?0:Math.PI))*crawl;
    curvedLeg(ctx,side*16,-9,side*21+step*3,-4,side*25+step*6,
      1-Math.max(0,step)*2.5,c,5);
    for(let claw=0;claw<3;claw++)
      shard(ctx,side*25+step*6+(claw-1)*3,2-Math.max(0,step)*2.5,
        1.4,3.5,c.light);
  }
  organic(ctx,0,-12,26,13,c);
  // Escamas e espinhos do dorso são fixos em relação ao torso.
  for(let i=0;i<13;i++){
    const x=-21+i*3.7;
    const y=-18-Math.sin(i/12*Math.PI)*6;
    shard(ctx,x,y,2.9,5+i%3*2,i%3?c.light:c.accent);
  }
  for(let i=0;i<16;i++){
    const x=Math.sin(i*8.19)*20,y=-9+Math.cos(i*9.1)*5;
    ellipse(ctx,x,y,2.8,.95+i%3*.5,
      rgba(i%2?c.accent:c.light,.55+cast*.16));
  }
  carapaceDetail(ctx,0,-12,21,6,c,14);
  // As cabeças laterais se projetam primeiro; a central fica à frente.
  neckAndHead(ctx,c,0,time,phase,crawl,cast*.6);
  neckAndHead(ctx,c,2,time,phase,crawl,cast*.6);
  neckAndHead(ctx,c,1,time,phase,crawl,cast);
  if(cast>.02){
    // Bolhas do pântano surgem perto do peito durante a preparação.
    for(let i=0;i<7;i++){
      const x=-10+i*3.5,y=-19-Math.sin(time*2+i)*2;
      ellipse(ctx,x,y,1+i%3*.4,1+i%2*.4,
        rgba(i%2?c.accent:c.eye,cast*(1-i/8)*.62));
    }
  }
};
const CREATURE_PALETTE: ColorRamp = {"base":"#4bba66","light":"#a0e375","dark":"#376a56","accent":"#ad54b1","eye":"#b6f6ef"};
export function renderMireHydraCreature(ctx:CanvasRenderingContext2D,actor:RegionalCreatureVisual,
  sx:number,sy:number,time=0):void {
  renderRegionalFrame(ctx,actor,sx,sy,time,CREATURE_PALETTE,
    (surface,colors,t)=>drawHydra(surface,colors,t,actor.motionPhase??0,actor.moving??0,actor.casting??0));
}
