import type { SwordArtwork } from "./shared.ts";
import { point, star } from "./shared.ts";
import { rgba, TAU } from "../draw.ts";

/** Arte específica; dados de combate continuam na ficha da espada. */
export const ASTRAL_ARTWORK: SwordArtwork = {
  bladePath(ctx,s) {
    const w=s.width,len=s.length;
    ctx.beginPath();ctx.moveTo(15,-w);
    ctx.lineTo(21,-w*.88);ctx.lineTo(25,-w*1.2);
    ctx.lineTo(len-11,-w*1.16);ctx.lineTo(len-3,-w*.62);
    ctx.lineTo(len+2,0);ctx.lineTo(len-3,w*.62);
    ctx.lineTo(len-11,w*1.16);ctx.lineTo(25,w*1.2);
    ctx.lineTo(21,w*.88);ctx.lineTo(15,w);
    ctx.closePath();
  },
  bladeMaterial(ctx,s,tone) {
    const w=s.width,len=s.length;
    // Filete dourado e glifos alinhados à espinha da lâmina.
    ctx.strokeStyle=tone(s.accent);ctx.lineWidth=1.2;
    ctx.beginPath();ctx.moveTo(18,-w*.57);ctx.lineTo(26,-w*.45);
    ctx.lineTo(len-5,-w*.35);ctx.stroke();
    for(let i=0;i<5;i++){
      const x=20+i*4;
      ctx.strokeStyle=tone(s.accent);ctx.lineWidth=.75;
      ctx.beginPath();ctx.moveTo(x,-1.8);ctx.lineTo(x+1.2,-.1);
      ctx.lineTo(x,1.5);ctx.stroke();
    }
  },
  finish(ctx,s,tone) {
    for(let i=0;i<4;i++)star(ctx,23+i*5,i%2?2:-1,1.5,tone(s.accent));
    point(ctx,15,0,1.3,tone(s.glint));
  },
  slashAccent(ctx,args) {
    const { x, y, alpha, second, glow } = args;
    const light=rgba(second,alpha);
    star(ctx,x,y,2.2,light);
    ctx.strokeStyle=rgba(glow,alpha*.5);ctx.lineWidth=.65;
    ctx.beginPath();ctx.arc(x,y,3.2,0,TAU);ctx.stroke();
  },
};
