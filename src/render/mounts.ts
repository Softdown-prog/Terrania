/** Arte das dez montarias: formas autorais Canvas, sem reutilizar sprites dos monstros. */
import type { MountId } from "../actors/MountCatalog.ts";
import { ellipse, limb, rgba, shade, softShadow, TAU } from "./draw.ts";

type Palette = Readonly<{ base:string; dark:string; light:string; accent:string; tack:string }>;
const PALETTES: Readonly<Record<MountId,Palette>> = {
  warhorse:{base:"#8d583c",dark:"#352c35",light:"#ce9b6a",accent:"#9caeb7",tack:"#a2673e"},
  "mountain-goat":{base:"#948775",dark:"#393a3d",light:"#d6c6a5",accent:"#e5d7aa",tack:"#805a43"},
  "imperial-elk":{base:"#9c7653",dark:"#44352f",light:"#cdb18e",accent:"#c7a475",tack:"#786046"},
  "fire-lion":{base:"#d78037",dark:"#7e392c",light:"#ffcf66",accent:"#ff6f19",tack:"#80543d"},
  "sand-basilisk":{base:"#82965c",dark:"#3d563f",light:"#b5c997",accent:"#d8a45a",tack:"#93583a"},
  "cavern-bear":{base:"#b7cad1",dark:"#63788a",light:"#ecf6f1",accent:"#c8e6ff",tack:"#845d42"},
  "silver-unicorn":{base:"#d0dbe7",dark:"#667b95",light:"#fff8ef",accent:"#d8e4ff",tack:"#9ca5bb"},
  "dark-griffin":{base:"#997046",dark:"#373f48",light:"#dec09a",accent:"#f0d0aa",tack:"#6c5142"},
  "cargo-beetle":{base:"#9d9777",dark:"#4c493d",light:"#d0c6a1",accent:"#c9a56e",tack:"#75543f"},
  "tidal-hippocampus":{base:"#3eaca2",dark:"#265a70",light:"#a4e3d4",accent:"#6bddce",tack:"#885d53"},
};
const EDGE="#142a2a",GLINT="#fff6dc";
function body(ctx:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,
  p:Palette,angle=0):void {
  const g=ctx.createLinearGradient(x-rx,y-ry,x+rx,y+ry);
  g.addColorStop(0,p.light);g.addColorStop(.48,p.base);g.addColorStop(1,p.dark);
  ellipse(ctx,x,y,rx,ry,g,angle);
  ctx.strokeStyle=EDGE;ctx.lineWidth=1.25;
  ctx.beginPath();ctx.ellipse(x,y,rx,ry,angle,0,TAU);ctx.stroke();
  ctx.strokeStyle=rgba(GLINT,.42);ctx.lineWidth=.9;
  ctx.beginPath();ctx.ellipse(x-1,y-1,Math.max(1,rx-2),Math.max(1,ry-2),
    angle,Math.PI,Math.PI*1.85);ctx.stroke();
}
function outlineLeg(ctx:CanvasRenderingContext2D,x:number,y:number,dx:number,phase:number,p:Palette,heavy=false):void {
  const width=heavy?9:5.5;
  limb(ctx,x,y,x+dx,y+12+phase,width+2,EDGE);
  limb(ctx,x,y,x+dx,y+12+phase,width,p.base);
  limb(ctx,x+dx,y+12+phase,x+dx+2,y+19+phase,width*.9,EDGE);
  limb(ctx,x+dx,y+12+phase,x+dx+2,y+19+phase,width*.7,p.light);
  ellipse(ctx,x+dx+2,y+20+phase,width*.9,2.5,p.dark);
  ellipse(ctx,x+dx+1,y+19+phase,width*.55,1,rgba(GLINT,.48));
}
function pack(ctx:CanvasRenderingContext2D,p:Palette):void {
  // Sela em couro recortado, fivelas, crina e as duas correias de três passadas.
  const belt=ctx.createLinearGradient(-12,-30,12,-7);
  belt.addColorStop(0,shade(p.tack,.35));belt.addColorStop(1,shade(p.tack,-.35));
  ctx.fillStyle=belt;ctx.strokeStyle=EDGE;ctx.lineWidth=1.3;
  ctx.beginPath();ctx.moveTo(-16,-26);ctx.quadraticCurveTo(-3,-34,14,-27);
  ctx.lineTo(11,-14);ctx.quadraticCurveTo(-3,-20,-15,-15);ctx.closePath();
  ctx.fill();ctx.stroke();
  for(const xx of [-11,11]){
    limb(ctx,xx,-25,xx-1,-5,3.8,EDGE);
    limb(ctx,xx,-25,xx-1,-5,2.2,p.tack);
    limb(ctx,xx,-25,xx-1,-5,.7,rgba(GLINT,.62));
    ellipse(ctx,xx-1,-5,2.3,2.1,"#dcc48e");
  }
  ellipse(ctx,-5,-25,6,2,rgba(GLINT,.34));
}
function decorativeFur(ctx:CanvasRenderingContext2D,p:Palette,seed:number,rx=19,ry=12):void {
  // Microfibras recortadas na silhueta, não pontilhado solto no fundo.
  ctx.save();ctx.beginPath();ctx.ellipse(0,-23,rx,ry,0,0,TAU);ctx.clip();
  for(let i=0;i<20;i++){
    const a=i*2.39996,r=Math.sqrt((i+.5)/20);
    const x=Math.cos(a)*rx*r,y=-23+Math.sin(a)*ry*r;
    ctx.strokeStyle=rgba(i%3?p.light:p.dark,.32);
    ctx.lineWidth=.6+i%2*.35;
    ctx.beginPath();ctx.moveTo(x-3,y-2);ctx.quadraticCurveTo(x,y-3,x+3,y-1);ctx.stroke();
    if(i%3===seed%3)ellipse(ctx,x-.8,y-2,1.1,.6,rgba(GLINT,.3));
  }
  ctx.restore();
}
function species(ctx:CanvasRenderingContext2D,id:MountId,p:Palette,time:number):void {
  // Silhuetas próprias, não recoloração de um único cavalo.
  if(id==="warhorse"||id==="silver-unicorn"||id==="imperial-elk"||id==="mountain-goat"){
    body(ctx,16,-37,9,18,p,-.15);
    body(ctx,21,-47,id==="mountain-goat"?11:8,10,p,-.15);
    for(let i=0;i<9;i++){
      const y=-50+i*3;
      limb(ctx,10-i%2*2,y,5-Math.sin(i)*2,y+6,1.7,p.dark);
    }
    if(id==="mountain-goat"){
      for(const s of [-1,1]){
        ctx.strokeStyle=EDGE;ctx.lineWidth=6;
        ctx.beginPath();ctx.moveTo(18+s*5,-54);
        ctx.bezierCurveTo(26+s*8,-76,10+s*10,-82,11+s*8,-63);ctx.stroke();
        ctx.strokeStyle=p.accent;ctx.lineWidth=3.3;ctx.stroke();
      }
      limb(ctx,23,-41,20,-31,5,p.dark);
    }
    if(id==="imperial-elk"){
      for(const s of [-1,1]){
        limb(ctx,19+s*5,-56,19+s*18,-86,5,EDGE);
        limb(ctx,19+s*5,-56,19+s*18,-86,3,p.accent);
        for(let k=0;k<4;k++){
          limb(ctx,19+s*(10+k*2),-66-k*5,18+s*(19+k*3),-72-k*7,2.5,EDGE);
          limb(ctx,19+s*(10+k*2),-66-k*5,18+s*(19+k*3),-72-k*7,1.5,p.light);
        }
      }
    }
    if(id==="silver-unicorn"){
      ctx.fillStyle=p.accent;ctx.strokeStyle=EDGE;ctx.lineWidth=1.3;
      ctx.beginPath();ctx.moveTo(22,-58);ctx.lineTo(24,-84);ctx.lineTo(28,-58);ctx.closePath();
      ctx.fill();ctx.stroke();
      ctx.strokeStyle=rgba(GLINT,.8);ctx.beginPath();ctx.moveTo(24,-79);ctx.lineTo(24,-61);ctx.stroke();
    }
  }else if(id==="fire-lion"||id==="cavern-bear"||id==="dark-griffin"){
    body(ctx,19,-37,12,12,p);
    if(id==="fire-lion"){
      for(let i=0;i<18;i++){
        const a=i*TAU/18;
        body(ctx,19+Math.cos(a)*15,-43+Math.sin(a)*14,5,9,
          { ...p,base:p.accent,light:p.light,dark:p.dark },a);
      }
      body(ctx,22,-44,11,9,p);
      ctx.strokeStyle=p.accent;ctx.lineWidth=3.5;
      ctx.beginPath();ctx.moveTo(-20,-22);ctx.bezierCurveTo(-31,-41,-38,-17,-30,-14);ctx.stroke();
      ellipse(ctx,-30,-14,5,6,p.accent);
    }else if(id==="dark-griffin"){
      for(const s of [-1,1]){
        ctx.fillStyle=s<0?p.dark:p.base;ctx.strokeStyle=EDGE;ctx.lineWidth=1.5;
        ctx.beginPath();ctx.moveTo(-5,-34);
        ctx.bezierCurveTo(s*9-25,-76,s*17-9,-63,s*20,-42);
        ctx.quadraticCurveTo(s*12,-42,-5,-34);ctx.fill();ctx.stroke();
        for(let k=0;k<6;k++)
          body(ctx,s*(9+k*2),-46-k%2*2,2.5,7,{...p,base:p.accent});
      }
      ctx.fillStyle=p.accent;ctx.beginPath();ctx.moveTo(26,-40);
      ctx.lineTo(40,-38);ctx.lineTo(28,-33);ctx.closePath();ctx.fill();
    }else{
      for(let i=0;i<12;i++){
        const x=12+Math.sin(i*4)*13,y=-37+Math.cos(i*5)*11;
        body(ctx,x,y,2.5,3.4,p,.3);
      }
    }
  }else if(id==="sand-basilisk"||id==="tidal-hippocampus"){
    // Escamas e nadadeiras, corpo de réptil/anfíbio em vez de pernas de mamífero.
    ctx.strokeStyle=EDGE;ctx.lineWidth=13;ctx.lineCap="round";
    ctx.beginPath();ctx.moveTo(-17,-20);ctx.bezierCurveTo(-35,-19,-40,-36,-44,-35);ctx.stroke();
    ctx.strokeStyle=p.base;ctx.lineWidth=9;ctx.stroke();
    for(let i=0;i<10;i++){
      const x=-23+i*4,y=-30-i%2*2;
      ellipse(ctx,x,y,2.5,2.3,i%2?p.accent:p.light);
    }
    if(id==="tidal-hippocampus"){
      body(ctx,19,-44,8,20,p,-.2);
      body(ctx,23,-56,9,9,p);
      ctx.fillStyle=p.accent;ctx.beginPath();ctx.moveTo(-41,-37);
      ctx.quadraticCurveTo(-56,-55,-49,-27);ctx.lineTo(-35,-27);ctx.closePath();ctx.fill();
      for(let i=0;i<5;i++){
        ctx.strokeStyle=rgba(p.light,.7);ctx.lineWidth=1.5;
        ctx.beginPath();ctx.moveTo(-43,-37);ctx.lineTo(-50+i*2,-49+i*4);ctx.stroke();
      }
    }else{
      body(ctx,19,-29,14,8,p);
      for(const s of [-1,1])for(const x of [-10,10]){
        limb(ctx,x,-18,x+s*11,-8,5,EDGE);
        limb(ctx,x,-18,x+s*11,-8,3,p.light);
      }
      for(let i=0;i<7;i++)body(ctx,8+i*4,-37,2.8,4.2,{...p,base:p.accent});
    }
  }else if(id==="cargo-beetle"){
    for(const s of [-1,1])for(let k=0;k<3;k++){
      const x=-11+k*9;
      limb(ctx,x,-20,x+s*24,-10+k*3,5,EDGE);
      limb(ctx,x,-20,x+s*24,-10+k*3,3,p.base);
    }
    body(ctx,0,-27,27,19,p);
    ctx.strokeStyle=p.dark;ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(0,-42);ctx.quadraticCurveTo(-4,-30,0,-11);ctx.stroke();
    for(let i=0;i<6;i++){
      ctx.strokeStyle=p.accent;ctx.lineWidth=1;
      ctx.beginPath();ctx.arc(0,-25,5+i*3,Math.PI*1.2,Math.PI*1.8);ctx.stroke();
    }
    body(ctx,22,-31,12,9,p);
    for(const s of [-1,1])limb(ctx,25,-35,30+s*6,-43,3,EDGE);
    // Carga lateral de duas caixas, não uma sela de cavalo.
    for(const x of [-18,14]){
      ctx.fillStyle=p.tack;ctx.strokeStyle=EDGE;ctx.lineWidth=1;
      ctx.fillRect(x,-41,13,12);ctx.strokeRect(x,-41,13,12);
      ctx.strokeStyle=rgba(GLINT,.65);
      ctx.beginPath();ctx.moveTo(x+2,-38);ctx.lineTo(x+11,-38);ctx.stroke();
    }
  }
  if(id!=="cargo-beetle"&&id!=="sand-basilisk")pack(ctx,p);
  ellipse(ctx,27,-43,2.2,2.5,EDGE);
  ellipse(ctx,26.6,-44,1.1,1.1,p.accent);
  ellipse(ctx,26.2,-44.6,.5,.45,GLINT);
  // Reflexos e facetas posteriores seguem o movimento sem aleatoriedade global.
  const bob=Math.sin(time*2)*.4;
  for(let i=0;i<5;i++){
    ellipse(ctx,-12+i*7,-27+bob,1.4,.7,rgba(i%2?p.accent:p.light,.66));
    ellipse(ctx,-12+i*7-.5,-27.5+bob,.5,.3,rgba(GLINT,.6));
  }
}
/** Ponto (x,y) é o contato com o solo, id = ficha canônica. */
export function renderMount(ctx:CanvasRenderingContext2D,
  id:MountId,x:number,y:number,time=0):void {
  const p=PALETTES[id];
  ctx.save();ctx.translate(x,y);
  softShadow(ctx,0,3,29,9,.42);
  const heavy=id==="cavern-bear"||id==="cargo-beetle";
  const swinging=Math.sin(time*5)*1.7;
  if(id!=="cargo-beetle"&&id!=="tidal-hippocampus"&&id!=="sand-basilisk"){
    for(const x of [-15,14])for(const side of [-1,1])
      outlineLeg(ctx,x,-21,side*4,side*swinging,p,heavy);
  }
  body(ctx,0,-26,heavy?29:25,heavy?18:14,p);
  decorativeFur(ctx,p,id.length,heavy?25:21,heavy?17:13);
  species(ctx,id,p,time);
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
  ctx.fillStyle=EDGE;ctx.font="bold 7px system-ui";ctx.textAlign="center";
  ctx.fillText(built?"ESTÁBULO":"FUTURO ESTÁBULO",0,-12);
  ctx.restore();
}
