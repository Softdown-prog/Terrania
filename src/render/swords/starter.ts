import type { SwordArtwork } from "./shared.ts";

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
  },
};
