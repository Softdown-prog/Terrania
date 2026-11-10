import type { SwordArtwork } from "./shared.ts";
import { point } from "./shared.ts";
import { rgba } from "../draw.ts";

/** Arte específica; dados de combate continuam na ficha da espada. */
export const BOREAL_ARTWORK: SwordArtwork = {
  bladePath(ctx,s) {
    const w=s.width,len=s.length;
    ctx.beginPath();ctx.moveTo(15,-w);
    ctx.lineTo(23,-w*1.16);ctx.lineTo(28,-w*.97);
    ctx.lineTo(len-7,-w*1.20);ctx.lineTo(len+2,-w*.21);
    ctx.lineTo(len-3,w*.52);ctx.lineTo(len-10,w*1.15);
    ctx.lineTo(26,w*.94);ctx.lineTo(21,w*1.27);ctx.lineTo(15,w);
    ctx.closePath();
  },
  bladeMaterial(ctx,s,tone) {
    const w=s.width;
    for(let i=0;i<4;i++){
      ctx.fillStyle=tone(i%2?s.accent:s.glint);
      const x=18+i*6;
      ctx.beginPath();ctx.moveTo(x,-w*1.1);
      ctx.lineTo(x+4,-w*.16);ctx.lineTo(x+.4,w*.75);
      ctx.lineTo(x-1,w*.23);ctx.closePath();ctx.fill();
      ctx.strokeStyle=tone(s.trim);ctx.lineWidth=.55;ctx.stroke();
    }
  },
  slashAccent(ctx,args) {
    const { x, y, angle, alpha, second, glow } = args;
    const tx=Math.cos(angle),ty=Math.sin(angle),nx=-ty,ny=tx;
    const light=rgba(second,alpha);
    ctx.fillStyle=rgba(glow,alpha*.68);ctx.beginPath();
    ctx.moveTo(x+nx*3,y+ny*3);ctx.lineTo(x+tx*1.8,y+ty*1.8);
    ctx.lineTo(x-nx*2.6,y-ny*2.6);ctx.lineTo(x-tx*1.5,y-ty*1.5);
    ctx.closePath();ctx.fill();
    ctx.strokeStyle=light;ctx.lineWidth=.72;ctx.stroke();
    point(ctx,x+nx*3.4,y+ny*3.4,.4,light);
  },
};
