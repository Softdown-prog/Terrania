import type { SwordArtwork } from "./shared.ts";

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
  },
};
