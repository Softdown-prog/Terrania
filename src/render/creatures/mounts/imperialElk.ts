/** Alce Imperial — galhada ramificada assimétrica e pelo de cervídeo. */
import type { Palette } from "./geometry.ts";
import { body, longNeck, eyeShine, EDGE, GLINT } from "./geometry.ts";
import { ellipse, limb, rgba } from "../../draw.ts";

export const drawImperialElk = (ctx:CanvasRenderingContext2D,p:Palette,time:number):void => {
  longNeck(ctx,p,time);
  // Galhada segue a anatomia cervical; cada galho ganha seu contorno.
  for(const s of [-1,1]){
    limb(ctx,19+s*5,-56,19+s*18,-86,6,EDGE);
    limb(ctx,19+s*5,-56,19+s*18,-86,3.8,p.accent);
    for(let k=0;k<5;k++){
      const bx=19+s*(10+k*2),by=-66-k*5;
      const tipx=18+s*(19+k*3),tipy=-72-k*7;
      limb(ctx,bx,by,tipx,tipy,3.6,EDGE);
      limb(ctx,bx,by,tipx,tipy,2,p.light);
      ellipse(ctx,tipx,tipy,1.5,1.8,p.accent);
      ctx.strokeStyle=rgba(GLINT,.65);ctx.lineWidth=.65;
      ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(tipx,tipy);ctx.stroke();
    }
    // Duas orelhas largas e almofadadas.
    body(ctx,22+s*6,-54,3,6,p,s*.4);
    ellipse(ctx,22+s*6,-54,1.2,3.2,rgba(p.accent,.65),s*.4);
  }
  // Focinho alongado, lábios, nariz úmido e olho móvel.
  body(ctx,28,-42,9.5,5,p,.1);
  ellipse(ctx,34,-39.5,4.8,2.9,p.light);
  ellipse(ctx,35.4,-40.8,1.5,.8,EDGE);
  eyeShine(ctx,p,25,-48);
  ctx.strokeStyle=p.dark;ctx.lineWidth=1.2;
  ctx.beginPath();ctx.moveTo(29,-37);ctx.quadraticCurveTo(33,-35,37,-38);ctx.stroke();
  // Pintas cervídeas distribuídas no dorso, fixas no tempo.
  for(let i=0;i<28;i++){
    const x=-21+(i%9)*4.8,y=-30+Math.floor(i/9)*5.2;
    ellipse(ctx,x,y,1.2+i%3*.25,.8,rgba(i%4?p.light:p.accent,.65),i*.14);
  }
  // Peitoral de caçador, plaquetas de bronze e acabamento na cauda.
  for(let i=0;i<9;i++){
    const x=-16+i*3.7;
    ctx.strokeStyle=i%3?p.tack:p.accent;ctx.lineWidth=1.2;
    ctx.beginPath();ctx.moveTo(x,-29);ctx.lineTo(x+1,-22);ctx.stroke();
  }
  ellipse(ctx,-25,-25,5,4,p.dark);
  ellipse(ctx,-26,-26,3,2.4,p.light);
  // A face vira levemente na passada sem deslocar colisão.
  ellipse(ctx,29,-42+Math.sin(time*1.7)*.3,.8,.5,rgba(GLINT,.6));
};
