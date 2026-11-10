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
};
