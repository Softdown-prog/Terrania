import type { SwordArtwork } from "./shared.ts";
import { point } from "./shared.ts";
import { rgba } from "../draw.ts";

/** Arte específica; dados de combate continuam na ficha da espada. */
export const DUNES_ARTWORK: SwordArtwork = {
  bladePath(ctx,s) {
    const w=s.width,len=s.length;
    ctx.beginPath();ctx.moveTo(15,-w);
    for(let i=0;i<5;i++){
      const x=19+i*(len-23)/5;
      ctx.lineTo(x,-w*(i%2===0?1.48:1.04));
      ctx.lineTo(x+2.8,-w*(i%2===0?1.08:1.48));
    }
    ctx.lineTo(len+1,-w*.35);ctx.lineTo(len+2,0);
    ctx.lineTo(len-5,w*.64);
    for(let i=4;i>=0;i--)ctx.lineTo(18+i*(len-23)/5,w*(i%2===0?1.42:1.05));
    ctx.lineTo(15,w);
    ctx.closePath();
  },
  bladeMaterial(ctx,s,tone) {
    const w=s.width;
    for(let i=0;i<5;i++){
      const x=20+i*3.6;
      ctx.strokeStyle=tone(i%2?s.shade:s.accent);ctx.lineWidth=.95;
      ctx.beginPath();ctx.moveTo(x,-w*.73);ctx.lineTo(x+1.3,w*.24);
      ctx.lineTo(x+2,w*.53);ctx.stroke();
      point(ctx,x+1,-w*.3,.55,tone(s.trim));
    }
  },
  slashAccent(ctx,args) {
    const { x, y, angle, alpha, first, second, index } = args;
    const tx=Math.cos(angle),ty=Math.sin(angle),nx=-ty,ny=tx;
    const light=rgba(second,alpha);
    const base=rgba(first,alpha);
    point(ctx,x,y,.75+(index%3)*.42,light);
    point(ctx,x-nx*2.4,y-ny*2.4,.43,base);
    ctx.strokeStyle=base;ctx.lineWidth=.75;ctx.beginPath();
    ctx.moveTo(x-tx*3,y-ty*3);ctx.lineTo(x+tx,y+ty);ctx.stroke();
  },
};
