import type { SwordVisualProfile, WeaponDefinition } from "../../engine/character/Weapons.ts";
import { KNIGHT_SWORD_GRIP } from "../heroPose.ts";
import { clamp01, rgba, shade, TAU } from "../draw.ts";

export function point(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,color:string):void {
  ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
}
export function star(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,color:string):void {
  ctx.strokeStyle=color;ctx.lineWidth=.8;
  ctx.beginPath();ctx.moveTo(x-r,y);ctx.lineTo(x+r,y);
  ctx.moveTo(x,y-r);ctx.lineTo(x,y+r);ctx.stroke();
}

export type Tone = (color: string) => string;

export interface SwordTrailAccent {
  readonly x:number; readonly y:number; readonly angle:number; readonly alpha:number;
  readonly first:string; readonly second:string; readonly glow:string; readonly index:number;
}
export interface SwordArtwork {
  readonly bladePath:(ctx:CanvasRenderingContext2D,s:SwordVisualProfile)=>void;
  readonly bladeMaterial:(ctx:CanvasRenderingContext2D,s:SwordVisualProfile,tone:Tone)=>void;
  readonly finish?:(ctx:CanvasRenderingContext2D,s:SwordVisualProfile,tone:Tone)=>void;
  readonly slashAccent?:(ctx:CanvasRenderingContext2D,args:SwordTrailAccent)=>void;
}

/** Arestas, facetas e materiais são pintados dentro da lâmina, nunca vazando
 * para a cena. Não há textura externa, aleatoriedade nem imagem de sprite.
 */
function bladeMaterials(ctx:CanvasRenderingContext2D,s:SwordVisualProfile,art:SwordArtwork,tone:Tone):void {
  const w=s.width,len=s.length;
  ctx.save();art.bladePath(ctx,s);ctx.clip();
  const bevel=ctx.createLinearGradient(16,-w*1.6,17,w*1.6);
  bevel.addColorStop(0,tone(s.glint));bevel.addColorStop(.32,tone(s.blade));
  bevel.addColorStop(.64,tone(s.shade));bevel.addColorStop(1,tone(s.trim));
  ctx.fillStyle=bevel;ctx.beginPath();
  ctx.moveTo(17,-w*.84);ctx.lineTo(len-4,0);
  ctx.lineTo(17,w*.56);ctx.closePath();ctx.fill();
  ctx.strokeStyle=tone(s.shade);ctx.lineWidth=.72;
  ctx.beginPath();ctx.moveTo(17,0);ctx.lineTo(len-4,0);ctx.stroke();

  art.bladeMaterial(ctx,s,tone);  // Arestas com rampas derivadas do material: fibra, têmpera, cristal e esmalte
  // recebem três planos de contraste reais, não uma tinta única artificial.
  ctx.strokeStyle=tone(shade(s.blade,-.19));ctx.lineWidth=.85;
  ctx.beginPath();ctx.moveTo(18,w*.69);
  ctx.quadraticCurveTo(len-11,w*.7,len-5,w*.15);ctx.stroke();
  ctx.strokeStyle=tone(shade(s.blade,.24));ctx.lineWidth=.7;
  ctx.beginPath();ctx.moveTo(18,-w*.42);
  ctx.quadraticCurveTo(len-13,-w*.56,len-5,-w*.18);ctx.stroke();
  ctx.strokeStyle=tone(shade(s.trim,.3));ctx.lineWidth=.6;
  ctx.beginPath();ctx.moveTo(19,w*.83);ctx.lineTo(24,w*.62);ctx.stroke();
  ctx.strokeStyle=tone(shade(s.accent,.46));ctx.lineWidth=.75;
  ctx.beginPath();ctx.moveTo(len-9,-w*.22);ctx.lineTo(len-5,-w*.1);ctx.stroke();
  // Filete de luz especular curto: evita a peça toda parecer de plástico.
  ctx.strokeStyle=tone(s.glint);ctx.lineWidth=.8;
  ctx.beginPath();ctx.moveTo(17,-w*.63);
  ctx.quadraticCurveTo(len-12,-w*.68,len-3,-.5);ctx.stroke();
  ctx.restore();
}

function swordHandle(ctx:CanvasRenderingContext2D,s:SwordVisualProfile,tone:Tone):void {
  const w=s.width;
  // Cabo: sombra de volume, fibra/tiras, pomo com núcleo e reflexo.
  const handle=ctx.createLinearGradient(4,-2.5,11,2.5);
  handle.addColorStop(0,tone(s.accent));handle.addColorStop(.35,tone(s.grip));
  handle.addColorStop(1,tone(s.shade));
  ctx.fillStyle=handle;ctx.strokeStyle="#142a2a";ctx.lineWidth=1.25;
  ctx.beginPath();ctx.roundRect(4,-2.5,9.5,5,.9);ctx.fill();ctx.stroke();
  for(let i=0;i<4;i++){
    ctx.strokeStyle=tone(s.wrapColor??s.trim);ctx.lineWidth=.85;
    ctx.beginPath();ctx.moveTo(5.2+i*2,-2.3);ctx.lineTo(6.5+i*2,2.25);ctx.stroke();
  }
  // Pomo em 3 passadas para preservar a leitura quando a arma é reduzida.
  point(ctx,3.1,.1,s.pommelRadius??2.2,"#142a2a");
  point(ctx,3.1,-.2,(s.pommelRadius??2.2)*.76,tone(s.guard));
  point(ctx,2.6,-.8,.55,tone(s.glint));
  if(s.pommelRing){
    ctx.strokeStyle=tone(s.accent);ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(3.1,0,1.5,0,TAU);ctx.stroke();
  }
  // Guarda: silhueta, chanfro, contorno e reflexo, com aletas opcionais.
  ctx.fillStyle=tone(s.guard);ctx.strokeStyle="#142a2a";ctx.lineWidth=1.15;
  ctx.beginPath();ctx.moveTo(12,-w-.7);
  ctx.lineTo(13.7,-w-(s.guardReach??3));ctx.lineTo(15.3,-w-.55);
  ctx.lineTo(15.3,w+.55);ctx.lineTo(13.7,w+(s.guardReach??3));
  ctx.lineTo(12,w+.7);ctx.closePath();ctx.fill();ctx.stroke();
  if(s.wingedGuard){
    for(const sign of [-1,1]){
      ctx.fillStyle=tone(s.wingColor??s.guard);
      ctx.beginPath();ctx.moveTo(13.4,sign*2.8);
      ctx.quadraticCurveTo(15.8,sign*(w+5),18,sign*(w+7));
      ctx.lineTo(18.5,sign*(w+2));ctx.lineTo(16.1,sign*3.8);
      ctx.closePath();ctx.fill();ctx.stroke();
    }
  }
  ctx.strokeStyle=tone(s.glint);ctx.lineWidth=.7;
  ctx.beginPath();ctx.moveTo(12.4,-w);ctx.lineTo(13.7,-w-(s.guardReach??3)+.65);
  ctx.lineTo(15.2,-w+.5);ctx.stroke();
  point(ctx,14.7,0,1.1,tone(s.accent));
  point(ctx,14.3,-.4,.4,tone(s.glint));
}

function swordFinish(ctx:CanvasRenderingContext2D,s:SwordVisualProfile,art:SwordArtwork,tone:Tone):void {
  const w=s.width,len=s.length;
  // Entalhe na junção da guarda; oclusão não deve borrar todo o metal.
  ctx.fillStyle=rgba("#142a2a",.33);ctx.fillRect(15,-w*.8,1.3,w*1.6);
  if(s.rune){
    ctx.strokeStyle=tone(s.runeColor??s.accent);ctx.lineWidth=.8;
    for(let i=0;i<4;i++){
      const x=21+i*(len-28)/4;
      ctx.beginPath();ctx.moveTo(x,-1.5);
      ctx.lineTo(x+1.5,-.1);ctx.lineTo(x+.7,1.5);ctx.stroke();
    }
  }
  art.finish?.(ctx,s,tone);
  // Pequenos highlights de luz superior visíveis até com escala do cavaleiro.
  ctx.strokeStyle=tone("#fff6dc");ctx.lineWidth=.65;
  ctx.beginPath();ctx.moveTo(17.4,-w*.80);ctx.lineTo(20,-w*.77);ctx.stroke();
  point(ctx,len-5,-.6,.5,tone(s.glint));
  point(ctx,14.2,-.65,.42,tone("#fff6dc"));
}

export function paintSword(ctx:CanvasRenderingContext2D,s:SwordVisualProfile,
  art:SwordArtwork,impact=0,tone:Tone=(c)=>c):void {
  const w=s.width,len=s.length;
  ctx.save();ctx.lineJoin="round";ctx.lineCap="round";
  // 1. Sombra de espessura (arma suspensa, não uma sombra no chão).
  ctx.save();ctx.translate(.4,1.1);
  art.bladePath(ctx,s);ctx.fillStyle=rgba("#142a2a",.24);ctx.fill();
  ctx.restore();
  // 2-3. Silhueta orgânica + rampa de volume metal/madeira/pedra.
  const volume=ctx.createLinearGradient(16,-w*1.5,len,w*1.2);
  volume.addColorStop(0,tone(s.glint));volume.addColorStop(.38,tone(s.blade));
  volume.addColorStop(1,tone(s.shade));
  art.bladePath(ctx,s);ctx.fillStyle=volume;ctx.fill();
  // 4. Materiais recortados no formato real da espada.
  bladeMaterials(ctx,s,art,tone);
  // 5. Cabo e guarda em três passadas; 6. oclusão na junção.
  swordHandle(ctx,s,tone);
  // 7. Contorno consistente, independente do fundo do cenário.
  art.bladePath(ctx,s);ctx.strokeStyle="#142a2a";ctx.lineWidth=1.1;ctx.stroke();
  // 8-9. Ornamentações, marcas de material e brilhos especulares.
  swordFinish(ctx,s,art,tone);
  if(impact>0){
    ctx.save();ctx.globalAlpha=clamp01(impact)*.72;
    const glow=ctx.createRadialGradient(len-5,0,.6,len-5,0,13);
    glow.addColorStop(0,rgba(s.accent,.68));glow.addColorStop(1,rgba(s.accent,0));
    ctx.fillStyle=glow;ctx.fillRect(len-17,-15,29,30);
    star(ctx,len-5,0,2.7,tone(s.glint));
    ctx.restore();
  }
  ctx.restore();
}



export function paintSwordTrail(ctx:CanvasRenderingContext2D,w:WeaponDefinition,
  art:SwordArtwork,facing:number,angles:readonly number[],alpha:number):void {
  if(angles.length<2 || alpha<=.02)return;
  const s=w.visual,opacity=alpha*w.trail.opacity;
  // Raio acompanha a lâmina real; o herói fornece escala e posição da mão.
  const range=s.length-KNIGHT_SWORD_GRIP;
  ctx.save();
  // Fita fina junto à ponta, não um setor preenchido desde o punho.
  // A largura é do próprio equipamento; ambas as extremidades se afilam.
  for(let layer=0;layer<2;layer++){
    const outer=range-(layer?0.65:0);
    const thickness=s.trailThickness*(layer?.38:1);
    ctx.beginPath();
    for(let i=0;i<angles.length;i++){
      const a=facing+angles[i]!;
      const x=Math.cos(a)*outer,y=Math.sin(a)*outer;
      if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    for(let i=angles.length-1;i>=0;i--){
      const a=facing+angles[i]!;
      const t=i/(angles.length-1);
      const taper=.16+.84*Math.sin(Math.PI*t);
      const inner=outer-thickness*taper;
      ctx.lineTo(Math.cos(a)*inner,Math.sin(a)*inner);
    }
    ctx.closePath();
    const first=facing+angles[0]!,last=facing+angles[angles.length-1]!;
    const gradient=ctx.createLinearGradient(
      Math.cos(first)*range,Math.sin(first)*range,
      Math.cos(last)*range,Math.sin(last)*range);
    const color=layer?w.trail.second:w.trail.first;
    gradient.addColorStop(0,rgba(color,opacity*.08));
    gradient.addColorStop(.5,rgba(color,opacity*(layer?.62:.34)));
    gradient.addColorStop(1,rgba(color,opacity*(layer?.32:.2)));
    ctx.fillStyle=gradient;ctx.fill();
  }
  ctx.beginPath();
  angles.forEach((offset,i)=>{
    const a=facing+offset,x=Math.cos(a)*range,y=Math.sin(a)*range;
    if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  });
  ctx.strokeStyle=rgba(w.trail.second,opacity);ctx.lineWidth=s.trailLineWidth??2;ctx.stroke();
  if(s.trailAccent && art.slashAccent){
    for(let i=1;i<angles.length;i++){
      const a=facing+angles[i]!,x=Math.cos(a)*(range+3),y=Math.sin(a)*(range+3);
      // O começo do golpe se dissipa primeiro; a ponta recente fica legível.
      const fade=opacity*(.35+.65*i/(angles.length-1));
      art.slashAccent(ctx,{x,y,angle:a,alpha:fade,
        first:w.trail.first,second:w.trail.second,glow:s.accent,index:i});
    }
  }
  ctx.restore();
}
