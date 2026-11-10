import { WEAPONS, type WeaponId } from "../engine/character/Weapons.ts";
import { KNIGHT_SWORD_GRIP } from "./heroPose.ts";
import { clamp01, rgba, TAU } from "./draw.ts";

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
export function drawKnightSword(ctx:CanvasRenderingContext2D,weapon:WeaponId,
  impact=0,tone:(color:string)=>string=(c)=>c):void {
  const s=WEAPONS[weapon].visual,w=s.width,len=s.length;
  ctx.save();ctx.lineJoin="round";ctx.lineCap="round";
  // Linen-wrapped or jeweled hilt (x=4..13), consistent with the grip position.
  const handle=ctx.createLinearGradient(4,-3.3,12,3.3);
  handle.addColorStop(0,tone(s.grip));handle.addColorStop(1,tone(s.shade));
  ctx.strokeStyle="#20232c";ctx.lineWidth=1.5;
  ctx.fillStyle=handle;ctx.fillRect(4,-2.4,8.6,4.8);ctx.strokeRect(4,-2.4,8.6,4.8);
  for(let i=0;i<4;i++){
    ctx.strokeStyle=tone(s.wrapColor??"#b2a187");
    ctx.lineWidth=.9;ctx.beginPath();ctx.moveTo(5+i*2,-2.1);
    ctx.lineTo(6.5+i*2,2);ctx.stroke();
  }
  point(ctx,3.5,0,s.pommelRadius??2.2,tone(s.guard));
  point(ctx,13,-w-1,.85,tone("#f7e9c6"));
  point(ctx,13,w+1,.85,tone("#8e8573"));
  point(ctx,6.7,0,.7,tone("#fef9dd"));
  if(s.pommelRing) {
    ctx.strokeStyle=tone("#edc45e");ctx.lineWidth=1.1;
    ctx.beginPath();ctx.arc(3.5,0,1.5,0,TAU);ctx.stroke();
  }
  // Unique guards: short iron cross, spiked dune bone, crystalline and celestial wings.
  ctx.fillStyle=tone(s.guard);ctx.strokeStyle="#262431";ctx.lineWidth=1.2;
  ctx.beginPath();
  ctx.moveTo(12,-w-.8);ctx.lineTo(13.6,-w-(s.guardReach??3));
  ctx.lineTo(15.3,-w-1);ctx.lineTo(15.3,w+1);
  ctx.lineTo(13.6,w+(s.guardReach??3));
  ctx.lineTo(12,w+.8);ctx.closePath();ctx.fill();ctx.stroke();
  if(s.wingedGuard){
    for(const sign of [-1,1]){
      ctx.fillStyle=tone(s.wingColor??s.guard);
      ctx.beginPath();ctx.moveTo(13.4,sign*3);ctx.lineTo(18,sign*(w+7));
      ctx.lineTo(19.2,sign*4);ctx.closePath();ctx.fill();
    }
  }
  // Flat polygonal blade, point visibly different from long taper and curved sabre.
  const blade=ctx.createLinearGradient(16,-w,len,w);
  blade.addColorStop(0,tone(s.shade));blade.addColorStop(.47,tone(s.blade));blade.addColorStop(1,tone(s.glint));
  ctx.beginPath();ctx.moveTo(15,-w);
  if(s.curved){
    ctx.quadraticCurveTo(len-11,-w-4,len,-w-8);
    ctx.quadraticCurveTo(len+3,-w-4,len+1,w-1);
    ctx.quadraticCurveTo(len-13,w+6,15,w);
  }else{
    const steps=s.serrated?5:1;
    for(let i=0;i<=steps;i++){
      const x=15+(len-21)*i/steps;
      ctx.lineTo(x,-w-(s.serrated&&i>0&&i%2?3:0));
    }
    ctx.lineTo(len,0);
    for(let i=steps;i>=0;i--){
      const x=15+(len-21)*i/steps;
      ctx.lineTo(x,w+(s.serrated&&i>0&&i%2?2:0));
    }
  }
  ctx.closePath();ctx.fillStyle=blade;ctx.fill();
  ctx.strokeStyle=tone(s.shade);ctx.lineWidth=1.3;ctx.stroke();
  ctx.strokeStyle=tone(s.glint);ctx.lineWidth=.9;
  ctx.beginPath();ctx.moveTo(16,-w+.7);
  ctx.lineTo(len-7,s.curved?-w-2:-w*.5);ctx.stroke();
  ctx.strokeStyle=tone(s.shade);ctx.beginPath();ctx.moveTo(17,0);ctx.lineTo(len-5,0);ctx.stroke();
  if(s.rune){
    ctx.strokeStyle=tone(s.runeColor??"#e4fbff");
    ctx.lineWidth=1.15;
    for(let i=0;i<5;i++){
      const x=20+i*(len-27)/5,vertical=s.ornament==="storm"?(i%2?2:-2):0;
      ctx.beginPath();ctx.moveTo(x,-1.3+vertical);ctx.lineTo(x+2,-.2);
      ctx.lineTo(x+.7,1.5);ctx.stroke();
    }
  }
  if(s.ornament==="magma"){
    ctx.strokeStyle="#fb7427";ctx.lineWidth=1.8;
    ctx.beginPath();ctx.moveTo(19,0);ctx.lineTo(24,-2);ctx.lineTo(30,2);
    ctx.lineTo(len-4,-1);ctx.stroke();
  }
  if(s.ornament==="venom"){
    for(let i=0;i<5;i++)point(ctx,21+i*4,w+1+(i%2)*2,1.3,"#8cff2e");
  }
  if(s.ornament==="stars"){
    for(let i=0;i<4;i++)star(ctx,24+i*5,i%2?2:-1,2,"#efcd74");
    point(ctx,15.2,0,2.1,"#65cdf8");
  }
  if(s.ornament==="storm"){
    ctx.strokeStyle="#ffee58";ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(19,1);ctx.lineTo(27,-3);
    ctx.lineTo(31,1);ctx.lineTo(len-5,-4);ctx.stroke();
  }
  if(impact>0){
    ctx.globalAlpha=clamp01(impact)*.7;
    const glow=ctx.createRadialGradient(len-5,0,1,len-5,0,15);
    glow.addColorStop(0,rgba(s.glint,.65));glow.addColorStop(1,rgba(s.glint,0));
    ctx.fillStyle=glow;ctx.fillRect(len-22,-18,32,36);
    star(ctx,len-5,0,4,tone(s.glint));
  }
  ctx.restore();
}

/** A distinct color and texture for each illustrated attack trail. */
export function drawKnightTrail(ctx:CanvasRenderingContext2D,weapon:WeaponId,
  facing:number,angles:readonly number[],alpha:number):void {
  if(angles.length<2 || alpha<=.02)return;
  const w=WEAPONS[weapon],s=w.visual,opacity=alpha*w.trail.opacity;
  // Raio acompanha a lâmina real; o herói fornece escala e posição da mão.
  const range=s.length-KNIGHT_SWORD_GRIP;
  const inner=Math.max(9,range*.6);
  ctx.save();
  for(let layer=0;layer<2;layer++){
    ctx.beginPath();
    for(let i=0;i<angles.length;i++){
      const a=facing+angles[i]!;
      if(!i)ctx.moveTo(Math.cos(a)*range,Math.sin(a)*range);
      else ctx.lineTo(Math.cos(a)*range,Math.sin(a)*range);
    }
    for(let i=angles.length-1;i>=0;i--){
      const a=facing+angles[i]!;
      ctx.lineTo(Math.cos(a)*(inner+layer*9),Math.sin(a)*(inner+layer*9));
    }
    ctx.closePath();
    ctx.fillStyle=rgba(layer?w.trail.second:w.trail.first,opacity*(layer?.5:.28));
    ctx.fill();
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
      const color=i%2?w.trail.first:w.trail.second;
      if(s.trailAccent==="bolts"){
        ctx.strokeStyle=color;ctx.lineWidth=1.3;
        ctx.beginPath();ctx.moveTo(x-5,y-1);ctx.lineTo(x+1,y-4);
        ctx.lineTo(x-1,y+3);ctx.lineTo(x+5,y);ctx.stroke();
      }else if(s.trailAccent==="stars"){
        star(ctx,x,y,2.2,rgba(color,opacity));
      }else{
        point(ctx,x,y,(i%3)+.4,rgba(color,opacity));
      }
    }
  }
  ctx.restore();
}
