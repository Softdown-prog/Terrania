/**
 * Polvo Abissal — oito braços com ventosas, cromatóforos e sifão de tinta.
 * O movimento ondulatório é procedural e sempre reprodutível pelo estado.
 */
import type { Ramp } from "../../shared/wave2Geometry.ts";
import { mass, eye, crystal, etched, EDGE } from "../../shared/wave2Geometry.ts";
import { ellipse, rgba, TAU } from "../../../draw.ts";
import { renderWave2Frame } from "../../shared/wave2Frame.ts";
import type { RegionalCreatureVisual } from "../../../regionalCreatures.ts";

export const octopus=(ctx:CanvasRenderingContext2D,c:Ramp,time:number,
  phase=0,moving=0,casting=0):void=>{
  const swim=Math.max(0,Math.min(1,moving));
  const ink=Math.max(0,Math.min(1,casting));
  // Cada braço tem sua fase; fase de locomoção não deve animar quando parado.
  for(let i=0;i<8;i++){
    const a=i*TAU/8;
    const flow=Math.sin(time*1.5+i*.82)*1.5+Math.sin(phase+i*.9)*swim*5;
    const rootX=Math.cos(a)*10,rootY=-16+Math.sin(a)*4;
    const elbowX=Math.cos(a)*24+flow*.32,elbowY=-8+Math.sin(a)*10;
    const tipX=Math.cos(a)*37+flow,tipY=elbowY+5+Math.cos(i*1.4)*7;
    const arm=():void=>{
      ctx.beginPath();ctx.moveTo(rootX,rootY);
      ctx.bezierCurveTo(elbowX,elbowY-9,tipX-11,tipY-7,tipX,tipY);
    };
    ctx.lineCap="round";ctx.lineJoin="round";
    ctx.strokeStyle=EDGE;ctx.lineWidth=10.5;arm();ctx.stroke();
    ctx.strokeStyle=i%2?c.base:c.dark;ctx.lineWidth=7.6;arm();ctx.stroke();
    ctx.strokeStyle=rgba(c.light,.58);ctx.lineWidth=1.2;arm();ctx.stroke();
    // Ventosas seguem o braço, incluindo a curvatura em movimento.
    for(let cup=1;cup<=6;cup++){
      const u=cup/7,v=1-u;
      const x=v*v*v*rootX+3*v*v*u*elbowX+
        3*v*u*u*(tipX-11)+u*u*u*tipX;
      const y=v*v*v*rootY+3*v*v*u*(elbowY-9)+
        3*v*u*u*(tipY-7)+u*u*u*tipY;
      const offset=(i%2?-1:1)*3.4;
      ellipse(ctx,x,y+offset,1.7+(cup%3)*.15,1.4,c.accent);
      ellipse(ctx,x,y+offset,0.8,.6,c.dark);
      ellipse(ctx,x-.25,y+offset-.3,.32,.23,c.light);
    }
    ellipse(ctx,tipX,tipY,2.6,2.1,c.light);
  }
  // Manto amplo separado da cabeça, com dobraduras e bordas luminosas.
  mass(ctx,0,-36,20,19,c);
  const mantle=ctx.createRadialGradient(-6,-46,1,0,-36,23);
  mantle.addColorStop(0,rgba(c.light,.72));
  mantle.addColorStop(.55,rgba(c.base,.43));
  mantle.addColorStop(1,rgba(c.dark,.09));
  ellipse(ctx,0,-37,18,17,mantle);
  for(let i=0;i<15;i++){
    const a=i*2.4;
    const x=Math.cos(a)*15,y=-38+Math.sin(a)*12;
    const pulse=.5+.5*Math.sin(time*1.7+i*.72);
    ellipse(ctx,x,y,1.5+(i%3)*.4,1.1+(i%2)*.4,
      rgba(i%3?c.accent:c.light,.35+pulse*.35));
    ellipse(ctx,x-.4,y-.4,.42,.32,rgba(c.light,.62));
  }
  mass(ctx,0,-22,16,11,c);
  // Anel dos olhos e pálpebras: leitura clara a 1× de zoom.
  for(const side of [-1,1]){
    const x=side*8,y=-26;
    ellipse(ctx,x,y,6.1,5.4,EDGE);
    ellipse(ctx,x,y,4.8,4.4,c.light);
    eye(ctx,x,y,c,3.6);
    ellipse(ctx,x+.4,y,1.3,2.1,c.dark);
    ctx.strokeStyle=rgba(c.accent,.7);ctx.lineWidth=1.4;
    ctx.beginPath();ctx.moveTo(x-5,y-4.5);
    ctx.quadraticCurveTo(x,y-8,x+5,y-4.4);ctx.stroke();
  }
  for(let i=0;i<7;i++)
    crystal(ctx,-15+i*5,-49+i%2*3,2.7,7,i%2?c.accent:c.light);
  etched(ctx,c,13,0,-37,12,10);
  // Sifão lateral e tinta, visíveis só quando a habilidade se prepara.
  ellipse(ctx,14,-14,4.2,3.6,c.dark,-.35);
  ellipse(ctx,14.6,-14.3,2.3,1.8,c.accent,-.35);
  if(ink>.01){
    const cloud=ctx.createRadialGradient(21,-15,0,21,-15,19);
    cloud.addColorStop(0,rgba(c.dark,.57*ink));
    cloud.addColorStop(1,rgba(c.dark,0));
    ellipse(ctx,21,-15,19,14,cloud);
    for(let i=0;i<13;i++){
      const x=19+i*2.5+Math.sin(time*1.8+i)*2.2;
      const y=-16+Math.sin(i*2.3+time)*7;
      ellipse(ctx,x,y,1+i%4*.6,1+i%2*.4,
        rgba(i%3?c.dark:c.accent,ink*(1-i/15)*.83));
    }
  }
};
const CREATURE_PALETTE:Ramp={
  base:"#7a58ae",dark:"#354668",light:"#bb78c9",accent:"#4adbc8",eyes:"#ffe987",
};
export function renderAbyssalOctopusCreature(ctx:CanvasRenderingContext2D,actor:RegionalCreatureVisual,
  sx:number,sy:number,time=0):void {
  renderWave2Frame(ctx,actor,sx,sy,time,CREATURE_PALETTE,
    (surface,colors,t)=>octopus(surface,colors,t,actor.motionPhase??0,actor.moving??0,actor.casting??0));
}
