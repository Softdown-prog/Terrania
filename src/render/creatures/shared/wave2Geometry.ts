import { ellipse, rgba, shade, TAU } from "../../draw.ts";
export type Ramp = Readonly<{base:string;dark:string;light:string;accent:string;eyes:string}>;
export const EDGE="#142a2a",GLINT="#fff6dc";
/** Primitivas geométricas; identidade anatômica permanece em cada criatura. */
export const mass = (ctx:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,c:Ramp,angle=0):void => {
  const g=ctx.createLinearGradient(x-rx,y-ry,x+rx,y+ry);
  g.addColorStop(0,c.light);g.addColorStop(.48,c.base);g.addColorStop(1,c.dark);
  ellipse(ctx,x,y,rx,ry,g,angle);
  ctx.strokeStyle=EDGE;ctx.lineWidth=1.5;
  ctx.beginPath();ctx.ellipse(x,y,rx,ry,angle,0,TAU);ctx.stroke();
  ctx.strokeStyle=rgba(GLINT,.35);ctx.lineWidth=1;
  ctx.beginPath();ctx.ellipse(x-1,y-1,Math.max(1,rx-2),Math.max(1,ry-2),angle,Math.PI,1.86*Math.PI);ctx.stroke();
};

export const eye = (ctx:CanvasRenderingContext2D,x:number,y:number,c:Ramp,r=2.1):void => {
  ellipse(ctx,x,y,r+1,r,EDGE);
  ellipse(ctx,x,y-.25,r,r*.67,c.eyes);
  ellipse(ctx,x-.6,y-.8,.6,.5,GLINT);
};

export const joint = (ctx:CanvasRenderingContext2D,points:readonly (readonly [number,number])[],c:Ramp,w=5):void => {
  ctx.lineCap="round";
  ctx.lineJoin="round";
  for(let k=0;k<2;k++){
    ctx.beginPath();ctx.moveTo(points[0]![0],points[0]![1]);
    for(const [x,y] of points.slice(1))ctx.lineTo(x,y);
    ctx.strokeStyle=k?c.base:EDGE;ctx.lineWidth=w+(k?-1:2);ctx.stroke();
  }
  const p=points[points.length-2]!;
  ellipse(ctx,p[0],p[1],w*.55,w*.5,c.light);
};

export const crystal = (ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,
  fill:string,shine=GLINT):void => {
  ctx.fillStyle=EDGE;
  ctx.beginPath();ctx.moveTo(x-w,y);ctx.lineTo(x-w*.45,y-h*.75);
  ctx.lineTo(x+w*.1,y-h);ctx.lineTo(x+w,y-h*.2);ctx.lineTo(x+w*.4,y+w*.1);
  ctx.closePath();ctx.fill();
  ctx.fillStyle=fill;ctx.beginPath();ctx.moveTo(x-w+1,y-1);
  ctx.lineTo(x+w*.1,y-h+1);ctx.lineTo(x+.2,y-1);ctx.closePath();ctx.fill();
  ctx.strokeStyle=rgba(shine,.85);ctx.lineWidth=1.2;
  ctx.beginPath();ctx.moveTo(x-w*.5,y-h*.35);ctx.lineTo(x+w*.1,y-h+2);ctx.stroke();
};

export const etched = (ctx:CanvasRenderingContext2D,c:Ramp,count:number,x=0,y=-22,rx=14,ry=14):void => {
  // Sparse fine markings clipped in organic materials by the parent's silhouette.
  for(let i=0;i<count;i++){
    const a=i*2.39996, r=Math.sqrt((i+.5)/count);
    const px=x+Math.cos(a)*rx*r,py=y+Math.sin(a)*ry*r;
    ellipse(ctx,px,py,1.1+(i%3)*.5,.6+(i%2)*.5,i%3?shade(c.light,-.14):c.accent,a);
    ellipse(ctx,px-.6,py-.5,.55,.3,rgba(GLINT,.63));
  }
};
