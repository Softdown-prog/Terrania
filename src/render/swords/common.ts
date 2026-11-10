import type { SwordArtwork } from "./shared.ts";
import { point } from "./shared.ts";
import { rgba } from "../draw.ts";

/** Espada comum: perfil reto, canal central e guarda curta; apenas corte físico. */
export const COMMON_ARTWORK: SwordArtwork = {
  bladePath(ctx,s) {
    const w=s.width,len=s.length;
    // Ombros retos e ponta triangular: silhueta diferente da espada de Toren.
    ctx.beginPath();ctx.moveTo(15,-w*.88);
    ctx.lineTo(19,-w);ctx.quadraticCurveTo(22,-w*.95,25,-w*.85);
    ctx.lineTo(len-6,-w*.68);ctx.lineTo(len,0);
    ctx.lineTo(len-6,w*.67);ctx.lineTo(25,w*.87);
    ctx.quadraticCurveTo(22,w*.95,19,w);ctx.lineTo(15,w*.88);
    ctx.closePath();
  },
  bladeMaterial(ctx,s,tone) {
    const w=s.width,len=s.length;
    // Canal de alívio: volume próprio, recortado na silhueta.
    const fuller=ctx.createLinearGradient(18,-1.25,18,1.25);
    fuller.addColorStop(0,tone(s.glint));
    fuller.addColorStop(.38,tone(s.trim));
    fuller.addColorStop(1,tone(s.shade));
    ctx.fillStyle=fuller;
    ctx.beginPath();ctx.moveTo(19,-.85);
    ctx.quadraticCurveTo(25,-1,len-9,-.46);
    ctx.lineTo(len-9,.47);ctx.quadraticCurveTo(25,1,19,.85);
    ctx.closePath();ctx.fill();
    ctx.strokeStyle=tone(s.shade);ctx.lineWidth=.52;
    ctx.beginPath();ctx.moveTo(22,w*.56);
    ctx.lineTo(len-8,w*.39);ctx.stroke();
    ctx.strokeStyle=tone(s.glint);ctx.lineWidth=.6;
    ctx.beginPath();ctx.moveTo(19,-w*.56);
    ctx.quadraticCurveTo(25,-w*.6,len-8,-w*.42);ctx.stroke();
  },
  finish(ctx,s,tone) {
    // Pino da guarda e riscos do polimento da lâmina.
    point(ctx,16.8,0,.9,tone(s.shade));
    point(ctx,16.6,-.3,.4,tone(s.glint));
    ctx.strokeStyle=tone(s.trim);ctx.lineWidth=.52;
    for(let i=0;i<2;i++){
      const x=24+i*4;
      ctx.beginPath();ctx.moveTo(x,1.2);ctx.lineTo(x+1.6,1.6);ctx.stroke();
    }
  },
  slashAccent(ctx,args) {
    const {x,y,angle,alpha,first,second}=args;
    const tx=Math.cos(angle),ty=Math.sin(angle),nx=-ty,ny=tx;
    // Dois riscos de luz metálica presos à direção do golpe.
    ctx.strokeStyle=rgba(first,alpha*.65);ctx.lineWidth=.86;
    ctx.beginPath();
    ctx.moveTo(x-tx*3+nx*1.1,y-ty*3+ny*1.1);
    ctx.quadraticCurveTo(x-tx*.5+nx*1.8,y-ty*.5+ny*1.8,
      x+tx*1.3+nx*.65,y+ty*1.3+ny*.65);
    ctx.stroke();
    ctx.strokeStyle=rgba(second,alpha*.45);ctx.lineWidth=.5;
    ctx.beginPath();ctx.moveTo(x-tx*2-nx*1.3,y-ty*2-ny*1.3);
    ctx.lineTo(x+tx*.8-nx,y+ty*.8-ny);ctx.stroke();
  },
};
