import type { SwordArtwork } from "./shared.ts";
import { point } from "./shared.ts";
import { rgba } from "../draw.ts";

/** Arte específica; dados de combate continuam na ficha da espada. */
export const OBSIDIAN_ARTWORK: SwordArtwork = {
  bladePath(ctx,s) {
    const w=s.width,len=s.length;
    ctx.beginPath();ctx.moveTo(15,-w);
    ctx.lineTo(22,-w*1.12);ctx.lineTo(26,-w*.76);
    ctx.lineTo(30,-w*1.21);ctx.lineTo(len-6,-w*.97);
    ctx.lineTo(len+1,-w*.15);ctx.lineTo(len-6,w*.57);
    ctx.lineTo(30,w*1.25);ctx.lineTo(24,w*.92);ctx.lineTo(19,w*1.16);
    ctx.lineTo(15,w);
    ctx.closePath();
  },
  bladeMaterial(ctx,s,tone) {
    const w=s.width,len=s.length;
    for(let i=0;i<3;i++){
      ctx.strokeStyle=tone(s.trim);ctx.lineWidth=2.5;
      ctx.beginPath();ctx.moveTo(19+i*7,-w*.9);
      ctx.lineTo(22+i*7,0);ctx.lineTo(25+i*7,w*.86);ctx.stroke();
    }
    ctx.strokeStyle=tone(s.accent);ctx.lineWidth=1.15;
    ctx.beginPath();ctx.moveTo(18,-.5);ctx.lineTo(24,-2.4);
    ctx.lineTo(29,1.8);ctx.lineTo(35,-1.4);
    ctx.lineTo(len-3,.5);ctx.stroke();
  },
  finish(ctx,s,tone) {
    const len=s.length;
    ctx.strokeStyle=tone(s.accent);ctx.lineWidth=1.3;
    ctx.beginPath();ctx.moveTo(20,0);ctx.lineTo(25,-2);
    ctx.lineTo(30,1.6);ctx.lineTo(len-5,-1);ctx.stroke();
  },
  slashAccent(ctx,args) {
    const { x, y, angle, alpha, first, second, glow } = args;
    const tx=Math.cos(angle),ty=Math.sin(angle),nx=-ty,ny=tx;
    const light=rgba(second,alpha);
    const base=rgba(first,alpha);
    ctx.fillStyle=base;ctx.beginPath();
    ctx.moveTo(x+nx*2.8,y+ny*2.8);
    ctx.lineTo(x+tx*1.25,y+ty*1.25);
    ctx.lineTo(x-nx*1.1-tx*1.4,y-ny*1.1-ty*1.4);
    ctx.closePath();ctx.fill();
    point(ctx,x+nx*4.6,y+ny*4.6,.53,light);
    ctx.strokeStyle=rgba(glow,alpha*.85);ctx.lineWidth=.68;
    ctx.beginPath();ctx.moveTo(x-tx*2,y-ty*2);
    ctx.lineTo(x-tx*3.6+nx,y-ty*3.6+ny);ctx.stroke();
  },
};
