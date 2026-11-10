import type { SwordArtwork } from "./shared.ts";
import { point } from "./shared.ts";
import { rgba, TAU } from "../draw.ts";

/** Arte específica; dados de combate continuam na ficha da espada. */
export const MARSH_ARTWORK: SwordArtwork = {
  bladePath(ctx,s) {
    const w=s.width,len=s.length;
    ctx.beginPath();ctx.moveTo(15,-w);
    ctx.quadraticCurveTo(23,-w*1.24,len-5,-w*1.66);
    ctx.quadraticCurveTo(len+5,-w*1.15,len+1,-w*.36);
    ctx.quadraticCurveTo(len-5,w*.63,len-11,w*.72);
    for(let i=3;i>=0;i--)ctx.lineTo(19+i*4,w*(i%2?1.06:1.43));
    ctx.lineTo(15,w);
    ctx.closePath();
  },
  bladeMaterial(ctx,s,tone) {
    for(let i=0;i<6;i++){
      ctx.fillStyle=tone(i%2?s.trim:s.accent);
      ctx.beginPath();ctx.ellipse(20+i*3.5,(i%2?1.8:-.9),1.7,.75,-.4,0,TAU);ctx.fill();
      point(ctx,21+i*3,2,.42,tone(s.glint));
    }
  },
  finish(ctx,s,tone) {
    const w=s.width;
    for(let i=0;i<4;i++){
      const x=23+i*4.1,y=w+(i%2?1:0);
      ctx.fillStyle=tone(s.accent);
      ctx.beginPath();ctx.ellipse(x,y+1,.65,1.5,0,0,TAU);ctx.fill();
    }
  },
  slashAccent(ctx,args) {
    const { x, y, angle, alpha, first, second, glow } = args;
    const tx=Math.cos(angle),ty=Math.sin(angle),nx=-ty,ny=tx;
    const light=rgba(second,alpha);
    const base=rgba(first,alpha);
    ctx.fillStyle=base;ctx.beginPath();
    ctx.ellipse(x+nx*2.1,y+ny*2.1,.8,1.6,angle,0,TAU);ctx.fill();
    ctx.strokeStyle=light;ctx.lineWidth=.8;ctx.beginPath();
    ctx.moveTo(x+nx*2.1,y+ny*2.1);
    ctx.quadraticCurveTo(x-tx*1.7,y-ty*1.7,x-tx*3-nx*.5,y-ty*3-ny*.5);
    ctx.stroke();
    point(ctx,x-nx*1.9,y-ny*1.9,.42,rgba(glow,alpha*.8));
  },
};
