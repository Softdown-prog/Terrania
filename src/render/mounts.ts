/** Entrada canônica das dez montarias: cada espécie desenha a própria anatomia. */
import type { MountId } from "../actors/MountCatalog.ts";
import { ellipse, mix, rgba, shade, softShadow } from "./draw.ts";
import { PALETTES, EDGE, GLINT } from "./creatures/mounts/geometry.ts";
import { drawQuadruped } from "./creatures/mounts/quadruped.ts";
import { drawSaddle } from "./creatures/mounts/saddle.ts";
import { QUADRUPED_MOUNTS, isQuadrupedMount, mountRiderLift, mountRiderShiftX } from "./creatures/mounts/quadrupeds.ts";
import { drawTidalHippocampus } from "./creatures/mounts/tidalHippocampus.ts";
import { renderSandBasiliskDetail } from "./creatures/mounts/sandBasilisk.ts";
import { renderCargoBeetleDetail } from "./creatures/mounts/cargoBeetle.ts";
import { drawLit } from "./lighting/litSprite.ts";
import { MOUNT_BOX } from "./lighting/lightRig.ts";
import { FRAMES_PER_SECOND, stepTime } from "./lighting/visualKey.ts";
import { RIDE_AMBIENT_FPS, RIDE_PHASE_STEPS, mountBob, stepRide, type MountRide } from "./creatures/mounts/gait.ts";

/**
 * x/y = contato real com o solo; mantém contrato usado pela cena e miniatura. Com `ride` (a montaria sob o herói, ADR 0092) ela olha para onde o herói olha, a passada
 * vem da distância andada e para quando ele para, e o lombo sobe e desce; sem `ride` anda com o relógio, como sempre (o cavalo selvagem e o que segue o herói).
 */
export function renderMount(ctx:CanvasRenderingContext2D,id:MountId,x:number,y:number,time=0,ride?:MountRide):void {
  const p=PALETTES[id];
  ctx.save();ctx.translate(x,y);
  softShadow(ctx,0,3,id==="cargo-beetle"?34:29,9,.42);
  // O corpo entra em degraus de 1/10 s e recebe a luz comum (ADR 0090): o mesmo degrau volta do cache em vez de ser redesenhado.
  const stepped=ride?stepRide(ride):undefined;
  const t=stepped?Math.floor(time*RIDE_AMBIENT_FPS)/RIDE_AMBIENT_FPS:stepTime(time);
  const key=stepped?`mount|${id}|r|${Math.round(stepped.phase/(Math.PI*2)*RIDE_PHASE_STEPS)}|${stepped.moving}|${stepped.facing}|${Math.round(t*RIDE_AMBIENT_FPS)}`:`mount|${id}|${Math.round(t*FRAMES_PER_SECOND)}`;
  drawLit({key,group:`mount|${id}`,box:MOUNT_BOX},ctx,lit=>{
    // A luz é aplicada depois, do mesmo lado; só o desenho vira para o lado em que a montaria olha.
    if(stepped&&stepped.facing<0)lit.scale(-1,1);
    const bob=stepped?mountBob(stepped):0;
    if(isQuadrupedMount(id)){
      // As sete de quatro patas: pernas articuladas, tronco com volume, pescoço e cabeça atrás do tronco, enfeites na frente e a sela por cima (ADR 0091).
      const mount=QUADRUPED_MOUNTS[id];
      drawQuadruped(lit,p,mount.body,t,()=>mount.behind(lit,p,t),stepped);
      lit.save();lit.translate(0,bob);
      mount.front(lit,p,t);
      drawSaddle(lit,p,mount.body.torso);
      lit.restore();
      return;
    }
    // Répteis e besouros possuem membros próprios em seus módulos especializados; o hipocampo é corpo de peixe, sem pernas.
    lit.save();lit.translate(0,bob);
    switch(id){
      case "sand-basilisk":renderSandBasiliskDetail(lit,t,stepped);break;
      case "cargo-beetle":renderCargoBeetleDetail(lit,t,stepped);break;
      case "tidal-hippocampus":drawTidalHippocampus(lit,p,t);break;
      default:{const neverId:never=id;return neverId;}
    }
    lit.restore();
  });
  ctx.restore();
}
export { mountRiderLift, mountRiderShiftX };

/** Pequeno cercado real na vila: não acrescenta colisões ocultas. */
export function renderStableFence(ctx:CanvasRenderingContext2D,x:number,y:number,built:boolean):void {
  ctx.save();ctx.translate(x,y);
  softShadow(ctx,0,4,53,16,.3);
  const post=(px:number):void=>{
    const wood=ctx.createLinearGradient(px-4,-22,px+7,7);
    wood.addColorStop(0,"#d5b587");wood.addColorStop(.55,"#80563e");
    wood.addColorStop(1,"#3b3839");
    ctx.fillStyle=wood;ctx.strokeStyle=EDGE;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(px-5,6);ctx.lineTo(px-5,-21);
    ctx.quadraticCurveTo(px,-26,px+5,-21);
    ctx.lineTo(px+5,6);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.strokeStyle=rgba(GLINT,.7);ctx.beginPath();
    ctx.moveTo(px-3,-20);ctx.lineTo(px-3,4);ctx.stroke();
  };
  for(const px of [-40,0,40])post(px);
  for(const y of [-14,1]){
    ctx.strokeStyle=EDGE;ctx.lineWidth=8;
    ctx.beginPath();ctx.moveTo(-40,y);ctx.quadraticCurveTo(0,y-4,40,y);ctx.stroke();
    ctx.strokeStyle=built?"#b88d5f":"#685a52";ctx.lineWidth=5;ctx.stroke();
    ctx.strokeStyle=rgba(GLINT,.54);ctx.lineWidth=1;ctx.stroke();
  }
  ctx.fillStyle=built?"#ecd29e":"#a9aaa3";ctx.strokeStyle=EDGE;ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(-18,-20);ctx.lineTo(18,-20);
  ctx.lineTo(16,-8);ctx.lineTo(-16,-8);ctx.closePath();ctx.fill();ctx.stroke();
  // Carpentry: individual wood grains, bolt heads and hay bundles make the
  // fence a constructed building instead of three flat lines.
  for(let i=0;i<14;i++){
    const sx=-36+(i%7)*12;
    const sy=i<7?-16:1;
    ctx.strokeStyle=mix("#4c392e","#e7ca8e",i/13);
    ctx.lineWidth=.65+i%3*.22;
    ctx.beginPath();
    ctx.moveTo(sx,sy);
    ctx.quadraticCurveTo(sx+2,sy-2-(i%2),sx+7,sy-1);
    ctx.stroke();
    if(i%2===0){
      ellipse(ctx,sx+5,sy,1,.9,"#b9bbb0");
      ellipse(ctx,sx+4.7,sy-.3,.38,.35,"#fff6dc");
    }
  }
  for(let k=0;k<5;k++){
    const xx=-24+k*11;
    ctx.strokeStyle=shade("#b3a06c",k*.12);
    ctx.lineWidth=1.5+k%2*.5;
    ctx.beginPath();
    ctx.moveTo(xx,9);
    ctx.quadraticCurveTo(xx-3,3,xx+2,-1);
    ctx.stroke();
    ellipse(ctx,xx+1,8,2.5,1.1,rgba("#d4c687",.65));
  }
  ctx.fillStyle=EDGE;ctx.font="bold 7px system-ui";ctx.textAlign="center";
  ctx.fillText(built?"ESTÁBULO":"FUTURO ESTÁBULO",0,-12);
  ctx.restore();
}

/** Rastros no Bosque Oeste, prop físico fiscalizado pelo contrato procedural. */
export function renderMountTracks(ctx:CanvasRenderingContext2D,x:number,y:number):void {
  ctx.save();ctx.translate(x,y);
  softShadow(ctx,0,3,31,10,.28);
  for(let i=0;i<5;i++){
    const px=-28+i*14,py=i%2===0?-6:5;
    const mud=ctx.createLinearGradient(px-7,py-7,px+9,py+9);
    mud.addColorStop(0,mix("#5e4638","#dac39b",i/9+.12));
    mud.addColorStop(.45,shade("#987052",i*.04));
    mud.addColorStop(1,shade("#2b3030",i*.025));
    ctx.fillStyle=mud;
    ctx.strokeStyle="#142a2a";ctx.lineWidth=1;
    ctx.beginPath();
    ctx.moveTo(px-6,py-6);
    ctx.quadraticCurveTo(px,py-10,px+6,py-6);
    ctx.quadraticCurveTo(px+9,py+1,px+5,py+6);
    ctx.quadraticCurveTo(px,py+2,px-5,py+6);
    ctx.quadraticCurveTo(px-8,py+1,px-6,py-6);
    ctx.closePath();ctx.fill();ctx.stroke();
    ctx.strokeStyle=mix("#e6d0a7","#8b5940",i/6);ctx.lineWidth=1.2;
    ctx.beginPath();ctx.moveTo(px-4,py-4);
    ctx.quadraticCurveTo(px,py-7,px+4,py-4);ctx.stroke();
    for(let k=0;k<2;k++){
      ellipse(ctx,px+(k===0?-4:4),py+3,2,1.2,
        rgba(k===0?"#f6e6bb":"#c79a6b",.72));
    }
  }
  ctx.restore();
}
