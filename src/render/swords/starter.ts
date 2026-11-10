import type { SwordArtwork } from "./shared.ts";
import { rgba } from "../draw.ts";

/** Arte específica; dados de combate continuam na ficha da espada. */
export const STARTER_ARTWORK: SwordArtwork = {
  bladePath(ctx,s) {
    const w=s.width,len=s.length;
    ctx.beginPath();ctx.moveTo(15,-w);
    ctx.quadraticCurveTo(21,-w*1.05,26,-w*.72);
    ctx.lineTo(len-4,-w*.49);ctx.lineTo(len,0);
    ctx.lineTo(len-4,w*.4);ctx.quadraticCurveTo(21,w*.95,15,w);
    ctx.closePath();
  },
  bladeMaterial(ctx,s,tone) {
    const w=s.width,len=s.length;
    // Veios com curvatura irregular: madeira, não metal pintado de marrom.
    for(let i=0;i<5;i++){
      const y=-w*.7+i*w*.34;
      ctx.strokeStyle=tone(i%2?s.shade:s.trim);ctx.lineWidth=i%2?.65:.95;
      ctx.beginPath();ctx.moveTo(17,y);
      ctx.quadraticCurveTo(23,y-1.5,27,y-.35);
      ctx.quadraticCurveTo(len-5,y+1,len-2,y*.4);ctx.stroke();
    }
    // Faixa de luz e cicatriz em arco evidenciam o volume da madeira.
    ctx.strokeStyle=tone(s.glint);ctx.lineWidth=.52;
    ctx.beginPath();ctx.moveTo(19,-w*.51);
    ctx.quadraticCurveTo(len-12,-w*.62,len-5,-w*.27);ctx.stroke();
  },
  finish(ctx,s,tone) {
    // Nó de madeira: oval irregular com núcleo escuro, não uma jóia.
    ctx.strokeStyle=tone(s.shade);ctx.lineWidth=.82;
    ctx.beginPath();ctx.ellipse(23.5,.6,2,1,.12,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle=tone(s.trim);ctx.lineWidth=.5;
    ctx.beginPath();ctx.moveTo(21,.65);ctx.quadraticCurveTo(23,.1,26,.9);ctx.stroke();
  },
  slashAccent(ctx,args) {
    const {x,y,angle,alpha,first,second}=args;
    const tx=Math.cos(angle),ty=Math.sin(angle),nx=-ty,ny=tx;
    // Dois riscos de ar/poeira: madeira leve, sem faíscas ou aura mágica.
    ctx.strokeStyle=rgba(first,alpha*.58);ctx.lineWidth=.72;
    ctx.beginPath();ctx.moveTo(x-tx*3+nx*1.4,y-ty*3+ny*1.4);
    ctx.quadraticCurveTo(x-tx*.8+nx*1.7,y-ty*.8+ny*1.7,x+tx*.5+nx,y+ty*.5+ny);
    ctx.stroke();
    ctx.strokeStyle=rgba(second,alpha*.38);ctx.lineWidth=.5;
    ctx.beginPath();ctx.moveTo(x-tx*2-nx*1.4,y-ty*2-ny*1.4);
    ctx.lineTo(x+tx*.7-nx*.9,y+ty*.7-ny*.9);ctx.stroke();
  },
};
