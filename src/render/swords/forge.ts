import type { SwordArtwork } from "./shared.ts";
import { point } from "./shared.ts";

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
    // Canal de têmpera e marcas da forja seguem o perfil metálico, sem sprites.
    ctx.strokeStyle=tone(s.trim);ctx.lineWidth=.65;
    ctx.beginPath();ctx.moveTo(19,-.3);ctx.lineTo(len-7,-.1);ctx.stroke();
    ctx.strokeStyle=tone(s.shade);ctx.lineWidth=.55;
    for(let i=0;i<3;i++){
      const x=23+i*3.1;
      ctx.beginPath();ctx.moveTo(x,1);ctx.lineTo(x+1.5,1.7);ctx.stroke();
    }
  },
  finish(ctx,s,tone) {
    // Rebites e reflexo superior sobrevivem à redução no cavaleiro.
    point(ctx,14.2,-s.width*.55,.43,tone(s.glint));
    point(ctx,14.2,s.width*.55,.43,tone(s.trim));
  },
};
