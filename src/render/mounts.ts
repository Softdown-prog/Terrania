/** Entrada canônica das dez montarias: cada espécie desenha a própria anatomia. */
import type { MountId } from "../actors/MountCatalog.ts";
import { ellipse, mix, rgba, shade, softShadow } from "./draw.ts";
import { PALETTES, body, outlineLeg, pack, decorativeFur, flankMarks, EDGE, GLINT } from "./creatures/mounts/geometry.ts";
import { drawWarhorse } from "./creatures/mounts/warhorse.ts";
import { drawMountainGoat } from "./creatures/mounts/mountainGoat.ts";
import { drawImperialElk } from "./creatures/mounts/imperialElk.ts";
import { drawFireLion } from "./creatures/mounts/fireLion.ts";
import { drawCavernBear } from "./creatures/mounts/cavernBear.ts";
import { drawSilverUnicorn } from "./creatures/mounts/silverUnicorn.ts";
import { drawDarkGriffin } from "./creatures/mounts/darkGriffin.ts";
import { drawTidalHippocampus } from "./creatures/mounts/tidalHippocampus.ts";
import { renderSandBasiliskDetail } from "./creatures/mounts/sandBasilisk.ts";
import { renderCargoBeetleDetail } from "./creatures/mounts/cargoBeetle.ts";

/** x/y = contato real com o solo; mantém contrato usado pela cena e miniatura. */
export function renderMount(ctx:CanvasRenderingContext2D,id:MountId,x:number,y:number,time=0):void {
  const p=PALETTES[id];
  ctx.save();ctx.translate(x,y);
  softShadow(ctx,0,3,id==="cargo-beetle"?34:29,9,.42);
  // Répteis e besouros possuem membros próprios em seus módulos especializados.
  if(id!=="sand-basilisk"&&id!=="cargo-beetle"){
    const heavy=id==="cavern-bear";
    const step=Math.sin(time*5)*1.7;
    if(id!=="tidal-hippocampus"){
      for(const xx of [-15,14])for(const side of [-1,1])
        outlineLeg(ctx,xx,-21,side*4,side*step,p,heavy);
    }
    body(ctx,0,-26,heavy?29:25,heavy?18:14,p);
    if(id!=="tidal-hippocampus")
      decorativeFur(ctx,p,id.length,heavy?25:21,heavy?17:13);
  }
  switch(id){
    case "warhorse":drawWarhorse(ctx,p,time);break;
    case "mountain-goat":drawMountainGoat(ctx,p,time);break;
    case "imperial-elk":drawImperialElk(ctx,p,time);break;
    case "fire-lion":drawFireLion(ctx,p,time);break;
    case "sand-basilisk":renderSandBasiliskDetail(ctx,time);break;
    case "cavern-bear":drawCavernBear(ctx,p,time);break;
    case "silver-unicorn":drawSilverUnicorn(ctx,p,time);break;
    case "dark-griffin":drawDarkGriffin(ctx,p,time);break;
    case "cargo-beetle":renderCargoBeetleDetail(ctx,time);break;
    case "tidal-hippocampus":drawTidalHippocampus(ctx,p,time);break;
    default:{const neverId:never=id;return neverId;}
  }
  if(id!=="cargo-beetle"&&id!=="sand-basilisk")pack(ctx,p);
  flankMarks(ctx,p,time,5);
  ctx.restore();
}

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
