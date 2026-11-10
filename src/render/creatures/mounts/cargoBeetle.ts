/**
 * Escaravelho de Carga: corpo hexápode, élitros, ferragens e bagagem.
 * A carga é desenho do arnês, não inventário real ou capacidade simulada.
 */
import { ellipse, rgba, TAU } from "../../draw.ts";
const C={
  shell:"#8d8868", shellLight:"#d6d0a0",shellDark:"#403e36",gold:"#d4ad68",
  bronze:"#a87b48", bone:"#efe0b7", leather:"#77513c", wood:"#775c44",
  shadow:"#252c2c", glint:"#fff3d6", green:"#668473",
} as const;
function legs(ctx:CanvasRenderingContext2D,time:number):void{
  for(const side of [-1,1]){
    for(let i=0;i<3;i++){
      const x=-17+i*16,phase=i*Math.PI*.7+(side<0?Math.PI:0);
      const stride=Math.sin(time*4+phase)*2.8;
      ctx.strokeStyle=C.shadow;ctx.lineWidth=7;ctx.lineCap="round";
      ctx.beginPath();ctx.moveTo(x,-23);ctx.lineTo(x+side*(16+i),-12+stride);
      ctx.lineTo(x+side*(22+i*2),-2+stride);ctx.stroke();
      ctx.strokeStyle=C.shellDark;ctx.lineWidth=4.4;ctx.stroke();
      ctx.strokeStyle=rgba(C.shellLight,.52);ctx.lineWidth=.9;
      ctx.beginPath();ctx.moveTo(x,-22);ctx.lineTo(x+side*(16+i),-12+stride);ctx.stroke();
      for(let spike=0;spike<3;spike++){
        const sx=x+side*(16+i+spike*2.1),sy=-10+stride+spike*2.2;
        ctx.fillStyle=C.bone;ctx.beginPath();ctx.moveTo(sx-1,sy);
        ctx.lineTo(sx+side*3,sy-4);ctx.lineTo(sx+1,sy+2);
        ctx.closePath();ctx.fill();
      }
      ellipse(ctx,x+side*(23+i*2),-2+stride,4,1.8,C.shellDark);
    }
  }
}
function elytra(ctx:CanvasRenderingContext2D):void{
  const g=ctx.createLinearGradient(-29,-48,29,-11);
  g.addColorStop(0,C.shellLight);g.addColorStop(.4,C.shell);g.addColorStop(1,C.shellDark);
  ctx.fillStyle=g;ctx.strokeStyle=C.shadow;ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(-29,-28);ctx.bezierCurveTo(-29,-49,-10,-55,0,-48);
  ctx.bezierCurveTo(15,-56,30,-44,30,-27);
  ctx.bezierCurveTo(20,-7,-21,-7,-29,-28);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.strokeStyle=C.shellDark;ctx.lineWidth=2.3;
  ctx.beginPath();ctx.moveTo(0,-47);ctx.quadraticCurveTo(-3,-31,0,-12);ctx.stroke();
  ctx.strokeStyle=rgba(C.glint,.44);ctx.lineWidth=.9;
  ctx.beginPath();ctx.moveTo(-2,-47);ctx.lineTo(-3,-19);ctx.stroke();
  for(const side of [-1,1]){
    for(let row=0;row<5;row++)for(let col=0;col<4;col++){
      const x=side*(6+col*5),y=-39+row*5+(col%2)*2;
      const color=(row+col)%3===0?C.gold:(row+col)%2?C.shellDark:C.shellLight;
      ellipse(ctx,x,y,1.9,1.1,rgba(color,.6),side*.14);
      ellipse(ctx,x-.5,y-.4,.5,.4,rgba(C.glint,.48));
    }
  }
}
function head(ctx:CanvasRenderingContext2D,time:number):void{
  const g=ctx.createLinearGradient(13,-52,44,-21);
  g.addColorStop(0,C.shellLight);g.addColorStop(.6,C.shell);g.addColorStop(1,C.shellDark);
  ellipse(ctx,29,-32,13,9,g,-.13);
  ctx.strokeStyle=C.shadow;ctx.lineWidth=1.5;
  ctx.beginPath();ctx.ellipse(29,-32,13,9,-.13,0,TAU);ctx.stroke();
  for(const side of [-1,1]){
    ctx.strokeStyle=C.shadow;ctx.lineWidth=4;
    ctx.beginPath();ctx.moveTo(33+side*2,-35);
    ctx.quadraticCurveTo(42+side*6,-44,45+side*4,-48+Math.sin(time*1.8+side)*.7);ctx.stroke();
    ctx.strokeStyle=C.gold;ctx.lineWidth=2;ctx.stroke();
    ellipse(ctx,45+side*4,-48,2,2,C.shellDark);
  }
  ellipse(ctx,32,-36,4,3,C.shadow);
  ellipse(ctx,32.4,-36.4,2.3,1.7,C.green);
  ellipse(ctx,31.8,-37,.9,.7,C.glint);
  for(let i=0;i<5;i++){
    ctx.strokeStyle=rgba(C.bone,.64);ctx.lineWidth=.9;
    ctx.beginPath();ctx.moveTo(22+i*3,-28);
    ctx.lineTo(23+i*3,-24);ctx.stroke();
  }
}
function harness(ctx:CanvasRenderingContext2D):void{
  for(const x of [-16,12]){
    ctx.strokeStyle=C.shadow;ctx.lineWidth=5;
    ctx.beginPath();ctx.moveTo(x,-47);ctx.lineTo(x,-13);ctx.stroke();
    ctx.strokeStyle=C.leather;ctx.lineWidth=3;ctx.stroke();
    ctx.strokeStyle=rgba(C.glint,.4);ctx.lineWidth=.7;
    ctx.beginPath();ctx.moveTo(x-1,-46);ctx.lineTo(x-1,-15);ctx.stroke();
    ellipse(ctx,x,-23,3.7,4,C.gold);
    ellipse(ctx,x-1,-24,1,1,C.glint);
  }
  ctx.strokeStyle=C.bronze;ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(-24,-41);ctx.quadraticCurveTo(0,-57,24,-41);ctx.stroke();
  for(let i=-3;i<=3;i++){
    const x=i*7,y=-46-Math.cos(i*.35)*3;
    ellipse(ctx,x,y,1.6,1.6,C.gold);
  }
}
function load(ctx:CanvasRenderingContext2D,time:number):void{
  for(const side of [-1,1]){
    ctx.save();ctx.translate(side*24,-39+Math.sin(time*1.4+side)*.35);
    // Volumes por caixa: tampo iluminado, fundo envelhecido e cantos escurecidos.
    const crate=ctx.createLinearGradient(-13,-14,13,12);
    crate.addColorStop(0,C.shellLight);
    crate.addColorStop(.28,C.bronze);
    crate.addColorStop(.72,C.wood);
    crate.addColorStop(1,C.shadow);
    ctx.fillStyle=crate;ctx.strokeStyle=C.shadow;ctx.lineWidth=1.3;
    ctx.beginPath();ctx.moveTo(-12,-14);ctx.lineTo(12,-14);
    ctx.lineTo(11,12);ctx.lineTo(-11,12);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle=C.bronze;ctx.fillRect(-12,-13,24,4);
    ctx.fillStyle=C.shellDark;ctx.fillRect(-12,7,24,4);
    ctx.strokeStyle=C.gold;ctx.lineWidth=1.2;
    ctx.beginPath();ctx.moveTo(-8,-13);ctx.lineTo(7,11);
    ctx.moveTo(8,-13);ctx.lineTo(-7,11);ctx.stroke();
    for(let i=0;i<8;i++){
      const x=-8+(i%4)*5,y=-9+Math.floor(i/4)*16;
      ctx.strokeStyle=i%2?C.shellLight:C.leather;ctx.lineWidth=.7;
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+2.5,y+.4);ctx.stroke();
    }
    ctx.fillStyle=C.gold;ctx.fillRect(-3,-3,6,7);
    ellipse(ctx,0,0,.9,.9,C.shadow);
    ctx.restore();
  }
}
function dust(ctx:CanvasRenderingContext2D,time:number):void{
  for(let i=0;i<12;i++){
    const x=-32+i*5.6,y=3+Math.sin(time*1.1+i)*2;
    ellipse(ctx,x,y,1+i%3*.6,.7,rgba(i%2?C.bronze:C.shellLight,(1-i/12)*.24));
  }
}
export function renderCargoBeetleDetail(ctx:CanvasRenderingContext2D,time:number):void{
  legs(ctx,time);elytra(ctx);head(ctx,time);harness(ctx);load(ctx,time);dust(ctx,time);
}
