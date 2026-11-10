import { ellipse, rgba, shade, TAU } from "../../draw.ts";
export type Palette={base:string;light:string;dark:string;accent:string;eye:string;extra:string};
export const OUTLINE="#252a2a",GLOW="#fff5d7";
/** Volumes e acabamento: primitivas, não imagens completas de criaturas. */
export const body = (ctx:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,c:Palette,rotation=0):void => {
  const g=ctx.createLinearGradient(x-rx,y-ry,x+rx,y+ry);
  g.addColorStop(0,c.light);g.addColorStop(.45,c.base);g.addColorStop(1,c.dark);
  ellipse(ctx,x,y,rx,ry,g,rotation);
  ctx.beginPath();ctx.ellipse(x,y,rx,ry,rotation,0,TAU);
  ctx.strokeStyle=OUTLINE;ctx.lineWidth=1.4;ctx.stroke();
  ctx.strokeStyle=rgba(GLOW,.42);ctx.lineWidth=.8;
  ctx.beginPath();ctx.ellipse(x-.6,y-1,Math.max(1,rx-1.8),Math.max(1,ry-1.8),
    rotation,Math.PI*1.02,Math.PI*1.8);ctx.stroke();
};

export const line = (ctx:CanvasRenderingContext2D,x:number,y:number,x2:number,y2:number,c:Palette,width=4):void => {
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);
  ctx.lineCap="round";ctx.strokeStyle=OUTLINE;ctx.lineWidth=width+2.2;ctx.stroke();
  ctx.strokeStyle=c.base;ctx.lineWidth=width;ctx.stroke();
  ellipse(ctx,x2,y2,width*.47,width*.48,c.light);
};

export const tip = (ctx:CanvasRenderingContext2D,x:number,y:number,r:number,h:number,color:string):void => {
  ctx.fillStyle=OUTLINE;
  ctx.beginPath();ctx.moveTo(x-r,y);ctx.lineTo(x,y-h);ctx.lineTo(x+r,y);
  ctx.closePath();ctx.fill();
  ctx.fillStyle=color;
  ctx.beginPath();ctx.moveTo(x-r+1,y-1);ctx.lineTo(x,y-h+2);ctx.lineTo(x+.6,y-1);ctx.closePath();ctx.fill();
  ctx.strokeStyle=rgba(GLOW,.65);ctx.lineWidth=.8;
  ctx.beginPath();ctx.moveTo(x-r*.5,y-2);ctx.lineTo(x,y-h+2);ctx.stroke();
};

export const eye = (ctx:CanvasRenderingContext2D,x:number,y:number,c:Palette,size=1.8):void => {
  ellipse(ctx,x,y,size+.8,size*.85,OUTLINE);
  ellipse(ctx,x,y-.25,size,size*.67,c.eye);
  ellipse(ctx,x-.4,y-.7,.5,.36,GLOW);
};

export const freckles = (ctx:CanvasRenderingContext2D,c:Palette,count:number,x=0,y=-17,rx=15,ry=11):void => {
  for(let i=0;i<count;i++){
    const a=i*2.399963,rad=Math.sqrt((i+.5)/count);
    const px=x+Math.cos(a)*rx*rad,py=y+Math.sin(a)*ry*rad;
    ellipse(ctx,px,py,1.1+i%3*.28,.6+i%2*.3,
      i%4===0?c.accent:i%3===0?shade(c.light,-.24):c.extra,a);
    ellipse(ctx,px-.4,py-.5,.45,.25,rgba(GLOW,.57));
  }
};
