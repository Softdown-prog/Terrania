import type { SwordArtwork } from "./shared.ts";
import { point } from "./shared.ts";

/** Arte específica; dados de combate continuam na ficha da espada. */
export const BRONZE_ARTWORK: SwordArtwork = {
  bladePath(ctx,s) {
    const w=s.width,len=s.length;
    ctx.beginPath();ctx.moveTo(15,-w);
    ctx.lineTo(20,-w*.83);ctx.lineTo(len-5,-w*.65);ctx.lineTo(len+1,0);
    ctx.lineTo(len-5,w*.65);ctx.lineTo(20,w*.83);ctx.lineTo(15,w);
    ctx.closePath();
  },
  bladeMaterial(ctx,s,tone) {
    const w=s.width,len=s.length;
    ctx.strokeStyle=tone(s.accent);ctx.lineWidth=1.1;
    ctx.beginPath();ctx.moveTo(19,-w*.45);ctx.quadraticCurveTo(27,-1,len-6,-w*.20);ctx.stroke();
    for(let i=0;i<3;i++)point(ctx,20+i*4,1,.43,tone(s.trim));
  },
};
