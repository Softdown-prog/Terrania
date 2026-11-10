import { WEAPONS, type WeaponId, type SwordVisualProfile } from "../engine/character/Weapons.ts";
import { KNIGHT_SWORD_GRIP } from "./heroPose.ts";
import { clamp01, rgba, shade, TAU } from "./draw.ts";

/** Ten sword silhouettes reconstructed as code from the author's 5×2 sheet.
 * Origin is the hilt's near end and the blade points right (+x). No texture assets.
 */
// Cada espada define suas propriedades físicas em character/weapons/swords/.
// O renderizador apenas aplica rotinas comuns de pintura procedural.
/** O arco usa a empunhadura como pivô, e não o centro do corpo. */
function point(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,color:string):void {
  ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
}
function star(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,color:string):void {
  ctx.strokeStyle=color;ctx.lineWidth=.8;
  ctx.beginPath();ctx.moveTo(x-r,y);ctx.lineTo(x+r,y);
  ctx.moveTo(x,y-r);ctx.lineTo(x,y+r);ctx.stroke();
}

type Tone = (color: string) => string;

/** Silhueta específica da ficha: o Canvas não seleciona a arma por ID.
 * O eixo longitudinal começa na guarda (x=15), com ponta em +x.
 */
function bladePath(ctx: CanvasRenderingContext2D, s: SwordVisualProfile): void {
  const w=s.width,len=s.length;
  ctx.beginPath();
  ctx.moveTo(15,-w);
  switch(s.motif){
    case "oak":
      ctx.quadraticCurveTo(21,-w*1.05,26,-w*.72);
      ctx.lineTo(len-4,-w*.49);ctx.lineTo(len,0);
      ctx.lineTo(len-4,w*.4);ctx.quadraticCurveTo(21,w*.95,15,w);
      break;
    case "iron":
      ctx.lineTo(22,-w*.94);ctx.lineTo(len-7,-w*.65);
      ctx.lineTo(len,0);ctx.lineTo(len-7,w*.76);ctx.lineTo(22,w*.92);
      ctx.lineTo(15,w);
      break;
    case "bronze":
      ctx.lineTo(20,-w*.83);ctx.lineTo(len-5,-w*.65);ctx.lineTo(len+1,0);
      ctx.lineTo(len-5,w*.65);ctx.lineTo(20,w*.83);ctx.lineTo(15,w);
      break;
    case "copper":
      ctx.lineTo(22,-w*1.23);ctx.lineTo(len-7,-w*1.10);
      ctx.lineTo(len-2,-w*.48);ctx.lineTo(len+1,0);
      ctx.lineTo(len-3,w*.59);ctx.lineTo(len-7,w*1.04);
      ctx.lineTo(22,w*1.17);ctx.lineTo(15,w);
      break;
    case "dunes":
      for(let i=0;i<5;i++){
        const x=19+i*(len-23)/5;
        ctx.lineTo(x,-w*(i%2===0?1.48:1.04));
        ctx.lineTo(x+2.8,-w*(i%2===0?1.08:1.48));
      }
      ctx.lineTo(len+1,-w*.35);ctx.lineTo(len+2,0);
      ctx.lineTo(len-5,w*.64);
      for(let i=4;i>=0;i--)ctx.lineTo(18+i*(len-23)/5,w*(i%2===0?1.42:1.05));
      ctx.lineTo(15,w);
      break;
    case "frost":
      ctx.lineTo(23,-w*1.16);ctx.lineTo(28,-w*.97);
      ctx.lineTo(len-7,-w*1.20);ctx.lineTo(len+2,-w*.21);
      ctx.lineTo(len-3,w*.52);ctx.lineTo(len-10,w*1.15);
      ctx.lineTo(26,w*.94);ctx.lineTo(21,w*1.27);ctx.lineTo(15,w);
      break;
    case "magma":
      ctx.lineTo(22,-w*1.12);ctx.lineTo(26,-w*.76);
      ctx.lineTo(30,-w*1.21);ctx.lineTo(len-6,-w*.97);
      ctx.lineTo(len+1,-w*.15);ctx.lineTo(len-6,w*.57);
      ctx.lineTo(30,w*1.25);ctx.lineTo(24,w*.92);ctx.lineTo(19,w*1.16);
      ctx.lineTo(15,w);
      break;
    case "venom":
      ctx.quadraticCurveTo(23,-w*1.24,len-5,-w*1.66);
      ctx.quadraticCurveTo(len+5,-w*1.15,len+1,-w*.36);
      ctx.quadraticCurveTo(len-5,w*.63,len-11,w*.72);
      for(let i=3;i>=0;i--)ctx.lineTo(19+i*4,w*(i%2?1.06:1.43));
      ctx.lineTo(15,w);
      break;
    case "storm":
      ctx.quadraticCurveTo(len-13,-w*1.38,len,-w*1.75);
      ctx.quadraticCurveTo(len+4,-w*.97,len+1,-w*.20);
      ctx.quadraticCurveTo(len-10,w*1.43,15,w);
      break;
    case "astral":
      ctx.lineTo(21,-w*.88);ctx.lineTo(25,-w*1.2);
      ctx.lineTo(len-11,-w*1.16);ctx.lineTo(len-3,-w*.62);
      ctx.lineTo(len+2,0);ctx.lineTo(len-3,w*.62);
      ctx.lineTo(len-11,w*1.16);ctx.lineTo(25,w*1.2);
      ctx.lineTo(21,w*.88);ctx.lineTo(15,w);
      break;
  }
  ctx.closePath();
}

/** Arestas, facetas e materiais são pintados dentro da lâmina, nunca vazando
 * para a cena. Não há textura externa, aleatoriedade nem imagem de sprite.
 */
function bladeMaterials(ctx:CanvasRenderingContext2D,s:SwordVisualProfile,tone:Tone):void {
  const w=s.width,len=s.length;
  ctx.save();bladePath(ctx,s);ctx.clip();
  const bevel=ctx.createLinearGradient(16,-w*1.6,17,w*1.6);
  bevel.addColorStop(0,tone(s.glint));bevel.addColorStop(.32,tone(s.blade));
  bevel.addColorStop(.64,tone(s.shade));bevel.addColorStop(1,tone(s.trim));
  ctx.fillStyle=bevel;ctx.beginPath();
  ctx.moveTo(17,-w*.84);ctx.lineTo(len-4,0);
  ctx.lineTo(17,w*.56);ctx.closePath();ctx.fill();
  ctx.strokeStyle=tone(s.shade);ctx.lineWidth=.72;
  ctx.beginPath();ctx.moveTo(17,0);ctx.lineTo(len-4,0);ctx.stroke();

  switch(s.motif){
    case "oak":
      // Veios com curvatura irregular: madeira, não metal pintado de marrom.
      for(let i=0;i<5;i++){
        const y=-w*.7+i*w*.34;
        ctx.strokeStyle=tone(i%2?s.shade:s.trim);ctx.lineWidth=i%2?.65:.95;
        ctx.beginPath();ctx.moveTo(17,y);
        ctx.quadraticCurveTo(23,y-1.5,27,y-.35);
        ctx.quadraticCurveTo(len-5,y+1,len-2,y*.4);ctx.stroke();
      }
      break;
    case "iron":
      for(let i=0;i<6;i++){
        ctx.strokeStyle=tone(i%2?s.shade:s.glint);ctx.lineWidth=.48;
        ctx.beginPath();ctx.moveTo(19,-w*.63+i*.85);
        ctx.lineTo(len-5,-w*.4+i*.52);ctx.stroke();
      }
      break;
    case "bronze":
      ctx.strokeStyle=tone(s.accent);ctx.lineWidth=1.1;
      ctx.beginPath();ctx.moveTo(19,-w*.45);ctx.quadraticCurveTo(27,-1,len-6,-w*.20);ctx.stroke();
      for(let i=0;i<3;i++)point(ctx,20+i*4,1,.43,tone(s.trim));
      break;
    case "copper":
      for(let i=0;i<4;i++){
        ctx.fillStyle=tone(i%2?s.trim:s.accent);
        ctx.beginPath();const x=20+i*5;
        ctx.moveTo(x,-w*.89);ctx.lineTo(x+4,-w*.77);
        ctx.lineTo(x+2,w*.64);ctx.lineTo(x-.7,w*.86);ctx.closePath();ctx.fill();
      }
      break;
    case "dunes":
      for(let i=0;i<5;i++){
        const x=20+i*3.6;
        ctx.strokeStyle=tone(i%2?s.shade:s.accent);ctx.lineWidth=.95;
        ctx.beginPath();ctx.moveTo(x,-w*.73);ctx.lineTo(x+1.3,w*.24);
        ctx.lineTo(x+2,w*.53);ctx.stroke();
        point(ctx,x+1,-w*.3,.55,tone(s.trim));
      }
      break;
    case "frost":
      for(let i=0;i<4;i++){
        ctx.fillStyle=tone(i%2?s.accent:s.glint);
        const x=18+i*6;
        ctx.beginPath();ctx.moveTo(x,-w*1.1);
        ctx.lineTo(x+4,-w*.16);ctx.lineTo(x+.4,w*.75);
        ctx.lineTo(x-1,w*.23);ctx.closePath();ctx.fill();
        ctx.strokeStyle=tone(s.trim);ctx.lineWidth=.55;ctx.stroke();
      }
      break;
    case "magma":
      for(let i=0;i<3;i++){
        ctx.strokeStyle=tone(s.trim);ctx.lineWidth=2.5;
        ctx.beginPath();ctx.moveTo(19+i*7,-w*.9);
        ctx.lineTo(22+i*7,0);ctx.lineTo(25+i*7,w*.86);ctx.stroke();
      }
      ctx.strokeStyle=tone(s.accent);ctx.lineWidth=1.15;
      ctx.beginPath();ctx.moveTo(18,-.5);ctx.lineTo(24,-2.4);
      ctx.lineTo(29,1.8);ctx.lineTo(35,-1.4);
      ctx.lineTo(len-3,.5);ctx.stroke();
      break;
    case "venom":
      for(let i=0;i<6;i++){
        ctx.fillStyle=tone(i%2?s.trim:s.accent);
        ctx.beginPath();ctx.ellipse(20+i*3.5,(i%2?1.8:-.9),1.7,.75,-.4,0,TAU);ctx.fill();
        point(ctx,21+i*3,2,.42,tone(s.glint));
      }
      break;
    case "storm":
      ctx.strokeStyle=tone(s.accent);ctx.lineWidth=1.3;
      ctx.beginPath();ctx.moveTo(19,-1.3);ctx.lineTo(25,1.7);
      ctx.lineTo(30,-2);ctx.lineTo(35,1.2);ctx.lineTo(len-4,-2.4);ctx.stroke();
      for(let i=0;i<3;i++)point(ctx,24+i*5,-1.5,.5,tone(s.glint));
      break;
    case "astral":
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
      break;
  }
  // Arestas com rampas derivadas do material: fibra, têmpera, cristal e esmalte
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

function swordFinish(ctx:CanvasRenderingContext2D,s:SwordVisualProfile,tone:Tone):void {
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
  if(s.ornament==="magma"){
    ctx.strokeStyle=tone(s.accent);ctx.lineWidth=1.3;
    ctx.beginPath();ctx.moveTo(20,0);ctx.lineTo(25,-2);
    ctx.lineTo(30,1.6);ctx.lineTo(len-5,-1);ctx.stroke();
  }else if(s.ornament==="venom"){
    for(let i=0;i<4;i++){
      const x=23+i*4.1,y=w+(i%2?1:0);
      ctx.fillStyle=tone(s.accent);
      ctx.beginPath();ctx.ellipse(x,y+1,.65,1.5,0,0,TAU);ctx.fill();
    }
  }else if(s.ornament==="storm"){
    ctx.strokeStyle=tone(s.accent);ctx.lineWidth=1.05;
    ctx.beginPath();ctx.moveTo(20,w+1);ctx.lineTo(26,w+4);
    ctx.lineTo(31,w+.2);ctx.lineTo(36,w+3);ctx.stroke();
  }else if(s.ornament==="stars"){
    for(let i=0;i<4;i++)star(ctx,23+i*5,i%2?2:-1,1.5,tone(s.accent));
    point(ctx,15,0,1.3,tone(s.glint));
  }
  // Pequenos highlights de luz superior visíveis até com escala do cavaleiro.
  ctx.strokeStyle=tone("#fff6dc");ctx.lineWidth=.65;
  ctx.beginPath();ctx.moveTo(17.4,-w*.80);ctx.lineTo(20,-w*.77);ctx.stroke();
  point(ctx,len-5,-.6,.5,tone(s.glint));
  point(ctx,14.2,-.65,.42,tone("#fff6dc"));
}

export function drawKnightSword(ctx:CanvasRenderingContext2D,weapon:WeaponId,
  impact=0,tone:Tone=(c)=>c):void {
  const s=WEAPONS[weapon].visual,w=s.width,len=s.length;
  ctx.save();ctx.lineJoin="round";ctx.lineCap="round";
  // 1. Sombra de espessura (arma suspensa, não uma sombra no chão).
  ctx.save();ctx.translate(.4,1.1);
  bladePath(ctx,s);ctx.fillStyle=rgba("#142a2a",.24);ctx.fill();
  ctx.restore();
  // 2-3. Silhueta orgânica + rampa de volume metal/madeira/pedra.
  const volume=ctx.createLinearGradient(16,-w*1.5,len,w*1.2);
  volume.addColorStop(0,tone(s.glint));volume.addColorStop(.38,tone(s.blade));
  volume.addColorStop(1,tone(s.shade));
  bladePath(ctx,s);ctx.fillStyle=volume;ctx.fill();
  // 4. Materiais recortados no formato real da espada.
  bladeMaterials(ctx,s,tone);
  // 5. Cabo e guarda em três passadas; 6. oclusão na junção.
  swordHandle(ctx,s,tone);
  // 7. Contorno consistente, independente do fundo do cenário.
  bladePath(ctx,s);ctx.strokeStyle="#142a2a";ctx.lineWidth=1.1;ctx.stroke();
  // 8-9. Ornamentações, marcas de material e brilhos especulares.
  swordFinish(ctx,s,tone);
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


/** Materiais diferentes produzem rastros realmente diferentes, sem duplicar
 * algoritmos por ID de espada. Tudo segue a ponta e depende apenas da pose.
 */
function swordSlashAccent(ctx:CanvasRenderingContext2D,
  accent:NonNullable<SwordVisualProfile["trailAccent"]>,
  x:number,y:number,angle:number,alpha:number,
  first:string,second:string,glow:string,index:number):void {
  const tx=Math.cos(angle),ty=Math.sin(angle),nx=-ty,ny=tx;
  const light=rgba(second,alpha),base=rgba(first,alpha);
  switch(accent){
    case "sand":
      point(ctx,x,y,.75+(index%3)*.42,light);
      point(ctx,x-nx*2.4,y-ny*2.4,.43,base);
      ctx.strokeStyle=base;ctx.lineWidth=.75;ctx.beginPath();
      ctx.moveTo(x-tx*3,y-ty*3);ctx.lineTo(x+tx,y+ty);ctx.stroke();
      break;
    case "ice-shards":
      ctx.fillStyle=rgba(glow,alpha*.68);ctx.beginPath();
      ctx.moveTo(x+nx*3,y+ny*3);ctx.lineTo(x+tx*1.8,y+ty*1.8);
      ctx.lineTo(x-nx*2.6,y-ny*2.6);ctx.lineTo(x-tx*1.5,y-ty*1.5);
      ctx.closePath();ctx.fill();
      ctx.strokeStyle=light;ctx.lineWidth=.72;ctx.stroke();
      point(ctx,x+nx*3.4,y+ny*3.4,.4,light);
      break;
    case "embers":
      ctx.fillStyle=base;ctx.beginPath();
      ctx.moveTo(x+nx*2.8,y+ny*2.8);
      ctx.lineTo(x+tx*1.25,y+ty*1.25);
      ctx.lineTo(x-nx*1.1-tx*1.4,y-ny*1.1-ty*1.4);
      ctx.closePath();ctx.fill();
      point(ctx,x+nx*4.6,y+ny*4.6,.53,light);
      ctx.strokeStyle=rgba(glow,alpha*.85);ctx.lineWidth=.68;
      ctx.beginPath();ctx.moveTo(x-tx*2,y-ty*2);
      ctx.lineTo(x-tx*3.6+nx,y-ty*3.6+ny);ctx.stroke();
      break;
    case "venom-drops":
      ctx.fillStyle=base;ctx.beginPath();
      ctx.ellipse(x+nx*2.1,y+ny*2.1,.8,1.6,angle,0,TAU);ctx.fill();
      ctx.strokeStyle=light;ctx.lineWidth=.8;ctx.beginPath();
      ctx.moveTo(x+nx*2.1,y+ny*2.1);
      ctx.quadraticCurveTo(x-tx*1.7,y-ty*1.7,x-tx*3-nx*.5,y-ty*3-ny*.5);
      ctx.stroke();
      point(ctx,x-nx*1.9,y-ny*1.9,.42,rgba(glow,alpha*.8));
      break;
    case "bolts":
      // Raios acompanham a tangente da ponta, mesmo olhando para esquerda/cima.
      // Nunca usar desvios em X/Y do mundo para um efeito preso à espada.
      ctx.strokeStyle=light;ctx.lineWidth=1.3;ctx.beginPath();
      ctx.moveTo(x-tx*4-nx,y-ty*4-ny);
      ctx.lineTo(x-tx+nx*3,y-ty+ny*3);
      ctx.lineTo(x+tx-nx*2.5,y+ty-ny*2.5);
      ctx.lineTo(x+tx*4+nx*.5,y+ty*4+ny*.5);ctx.stroke();
      point(ctx,x-tx+nx*3,y-ty+ny*3,.45,rgba(glow,alpha));
      break;
    case "stars":
      star(ctx,x,y,2.2,light);
      ctx.strokeStyle=rgba(glow,alpha*.5);ctx.lineWidth=.65;
      ctx.beginPath();ctx.arc(x,y,3.2,0,TAU);ctx.stroke();
      break;
  }
}

/** A distinct color and texture for each illustrated attack trail. */
export function drawKnightTrail(ctx:CanvasRenderingContext2D,weapon:WeaponId,
  facing:number,angles:readonly number[],alpha:number):void {
  if(angles.length<2 || alpha<=.02)return;
  const w=WEAPONS[weapon],s=w.visual,opacity=alpha*w.trail.opacity;
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
  if(s.trailAccent){
    for(let i=1;i<angles.length;i++){
      const a=facing+angles[i]!,x=Math.cos(a)*(range+3),y=Math.sin(a)*(range+3);
      // O começo do golpe se dissipa primeiro; a ponta recente fica legível.
      const fade=opacity*(.35+.65*i/(angles.length-1));
      swordSlashAccent(ctx,s.trailAccent,x,y,a,fade,
        w.trail.first,w.trail.second,s.accent,i);
    }
  }
  ctx.restore();
}
