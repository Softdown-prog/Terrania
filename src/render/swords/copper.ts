import type { SwordArtwork } from "./shared.ts";
import { rgba } from "../draw.ts";

/** Arte específica; dados de combate continuam na ficha da espada. */
export const COPPER_ARTWORK: SwordArtwork = {
  bladePath(ctx,s) {
    const w=s.width,len=s.length;
    ctx.beginPath();ctx.moveTo(15,-w);
    ctx.lineTo(22,-w*1.23);ctx.lineTo(len-7,-w*1.10);
    ctx.lineTo(len-2,-w*.48);ctx.lineTo(len+1,0);
    ctx.lineTo(len-3,w*.59);ctx.lineTo(len-7,w*1.04);
    ctx.lineTo(22,w*1.17);ctx.lineTo(15,w);
    ctx.closePath();
  },
  bladeMaterial(ctx,s,tone) {
    const w=s.width;
    for(let i=0;i<4;i++){
      ctx.fillStyle=tone(i%2?s.trim:s.accent);
      ctx.beginPath();const x=20+i*5;
      ctx.moveTo(x,-w*.89);ctx.lineTo(x+4,-w*.77);
      ctx.lineTo(x+2,w*.64);ctx.lineTo(x-.7,w*.86);ctx.closePath();ctx.fill();
    }
    // Canal interno escurecido, como lâmina martelada e não vidro translúcido.
    ctx.strokeStyle=tone(s.shade);ctx.lineWidth=.85;
    ctx.beginPath();ctx.moveTo(19,0);ctx.lineTo(s.length-7,.3);ctx.stroke();
  },
  finish(ctx,s,tone) {
    const w=s.width;
    // Marcas de forja alternadas e reflexo no gume superior.
    for(let i=0;i<3;i++){
      const x=21+i*5.4;
      ctx.strokeStyle=tone(i%2?s.glint:s.trim);ctx.lineWidth=.68;
      ctx.beginPath();ctx.moveTo(x,-w*.7);ctx.lineTo(x+1.4,-w*.36);ctx.stroke();
    }
    ctx.strokeStyle=tone(s.glint);ctx.lineWidth=.65;
    ctx.beginPath();ctx.moveTo(18,-w*.86);ctx.lineTo(24,-w);ctx.stroke();
  },
  slashAccent(ctx,args) {
    const {x,y,angle,alpha,first,second}=args;
    const tx=Math.cos(angle),ty=Math.sin(angle),nx=-ty,ny=tx;
    // Peso do montante: duas faixas paralelas, assimétricas e curtas.
    ctx.strokeStyle=rgba(first,alpha*.69);ctx.lineWidth=1.25;
    ctx.beginPath();ctx.moveTo(x-tx*3.9+nx*2.25,y-ty*3.9+ny*2.25);
    ctx.quadraticCurveTo(x-tx*.6+nx*2.9,y-ty*.6+ny*2.9,x+tx*1.75+nx*.8,y+ty*1.75+ny*.8);
    ctx.stroke();
    ctx.strokeStyle=rgba(second,alpha*.55);ctx.lineWidth=.78;
    ctx.beginPath();ctx.moveTo(x-tx*2.7-nx*2,y-ty*2.7-ny*2);
    ctx.lineTo(x+tx*.65-nx*1.4,y+ty*.65-ny*1.4);ctx.stroke();
  },
};
