import type { SwordArtwork } from "./shared.ts";

/** Arte específica; dados de combate continuam na ficha da espada. */
export const FORGE_ARTWORK: SwordArtwork = {
  bladePath(ctx,s) {
    const w=s.width,len=s.length;
    ctx.beginPath();ctx.moveTo(15,-w);
    ctx.lineTo(22,-w*.94);ctx.lineTo(len-7,-w*.65);
    ctx.lineTo(len,0);ctx.lineTo(len-7,w*.76);ctx.lineTo(22,w*.92);
    ctx.lineTo(15,w);
    ctx.closePath();
  },
  bladeMaterial(ctx,s,tone) {
    const w=s.width,len=s.length;
    for(let i=0;i<6;i++){
      ctx.strokeStyle=tone(i%2?s.shade:s.glint);ctx.lineWidth=.48;
      ctx.beginPath();ctx.moveTo(19,-w*.63+i*.85);
      ctx.lineTo(len-5,-w*.4+i*.52);ctx.stroke();
    }
  },
};
