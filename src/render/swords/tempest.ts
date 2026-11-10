import type { SwordArtwork } from "./shared.ts";
import { point } from "./shared.ts";
import { rgba } from "../draw.ts";

/** Arte específica; dados de combate continuam na ficha da espada. */
export const TEMPEST_ARTWORK: SwordArtwork = {
  bladePath(ctx,s) {
    const w=s.width,len=s.length;
    ctx.beginPath();ctx.moveTo(15,-w);
    ctx.quadraticCurveTo(len-13,-w*1.38,len,-w*1.75);
    ctx.quadraticCurveTo(len+4,-w*.97,len+1,-w*.20);
    ctx.quadraticCurveTo(len-10,w*1.43,15,w);
    ctx.closePath();
  },
  bladeMaterial(ctx,s,tone) {
    const len=s.length;
    ctx.strokeStyle=tone(s.accent);ctx.lineWidth=1.3;
    ctx.beginPath();ctx.moveTo(19,-1.3);ctx.lineTo(25,1.7);
    ctx.lineTo(30,-2);ctx.lineTo(35,1.2);ctx.lineTo(len-4,-2.4);ctx.stroke();
    for(let i=0;i<3;i++)point(ctx,24+i*5,-1.5,.5,tone(s.glint));
  },
  finish(ctx,s,tone) {
    const w=s.width;
    ctx.strokeStyle=tone(s.accent);ctx.lineWidth=1.05;
    ctx.beginPath();ctx.moveTo(20,w+1);ctx.lineTo(26,w+4);
    ctx.lineTo(31,w+.2);ctx.lineTo(36,w+3);ctx.stroke();
  },
  slashAccent(ctx,args) {
    const { x, y, angle, alpha, second, glow } = args;
    const tx=Math.cos(angle),ty=Math.sin(angle),nx=-ty,ny=tx;
    const light=rgba(second,alpha);
    // Raios acompanham a tangente da ponta, mesmo olhando para esquerda/cima.
    // Nunca usar desvios em X/Y do mundo para um efeito preso à espada.
    ctx.strokeStyle=light;ctx.lineWidth=1.3;ctx.beginPath();
    ctx.moveTo(x-tx*4-nx,y-ty*4-ny);
    ctx.lineTo(x-tx+nx*3,y-ty+ny*3);
    ctx.lineTo(x+tx-nx*2.5,y+ty-ny*2.5);
    ctx.lineTo(x+tx*4+nx*.5,y+ty*4+ny*.5);ctx.stroke();
    point(ctx,x-tx+nx*3,y-ty+ny*3,.45,rgba(glow,alpha));
  },
};
