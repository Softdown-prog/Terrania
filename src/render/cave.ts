import type { GearState } from "../engine/Equipment.ts";
import type { WeaponId } from "../engine/Weapons.ts";
import { renderHero } from "./actors.ts";
import { ellipse, mix, rgba, softShadow, TAU } from "./draw.ts";
import { hash2 } from "../world/random.ts";
import { TILE_SIZE } from "../world/terrain.ts";
import type { CaveEntrance, CaveTheme } from "../world/caves.ts";
import { CAVE_EXIT, CAVE_HEIGHT, CAVE_WIDTH, type CaveFloor, type CaveRoom } from "../engine/CaveRoom.ts";

const PALETTE: Record<CaveTheme, { ground: string; light: string; wall: string; rim: string; water: string; accent: string }> = {
  verdant: { ground:"#51604a",light:"#879270",wall:"#27382e",rim:"#607555",water:"#345a51",accent:"#b1d17d" },
  glacial: { ground:"#789da5",light:"#bcd9db",wall:"#355668",rim:"#a0ccdc",water:"#3a8396",accent:"#d9fcff" },
  desert: { ground:"#8c7458",light:"#d6b785",wall:"#594636",rim:"#bba078",water:"#6a7a65",accent:"#ead18e" },
  coastal: { ground:"#577b78",light:"#a4bfb0",wall:"#284e55",rim:"#74a5a0",water:"#307d90",accent:"#b0e9d9" },
  basalt: { ground:"#505660",light:"#8d9194",wall:"#222b32",rim:"#677682",water:"#36505c",accent:"#b5c0b9" },
  marsh: { ground:"#494f3d",light:"#89926b",wall:"#262c29",rim:"#637355",water:"#36594b",accent:"#afd887" },
};
const wallCache = new WeakMap<CaveFloor,HTMLCanvasElement>();

function paintFloor(ctx:CanvasRenderingContext2D, floor:CaveFloor):HTMLCanvasElement {
  const source=document.createElement("canvas");
  source.width=CAVE_WIDTH*TILE_SIZE;
  source.height=CAVE_HEIGHT*TILE_SIZE;
  const c=source.getContext("2d");
  if(!c)return source;
  const p=PALETTE[floor.theme];
  const seed=floor.entrance.seed ^ floor.entrance.tileX ^ Math.imul(floor.entrance.tileY,29);
  for(let y=0;y<CAVE_HEIGHT;y++)for(let x=0;x<CAVE_WIDTH;x++){
    const tile=floor.at(x,y),px=x*TILE_SIZE,py=y*TILE_SIZE;
    const n=hash2(x,y,seed+43),detail=hash2(x,y,seed+83);
    if(tile===0){
      c.fillStyle=mix(p.wall,p.ground,n*.36);
      c.fillRect(px,py,32,32);
      // Rock relief: beveled walls, fissures and corner shadow.
      const bevel=c.createLinearGradient(px,py,px+28,py+30);
      bevel.addColorStop(0,rgba(p.rim,.38));bevel.addColorStop(.4,rgba(p.wall,.12));
      bevel.addColorStop(1,rgba("#071317",.7));
      c.fillStyle=bevel;c.fillRect(px,py,32,32);
      c.strokeStyle=rgba(p.rim,.24+n*.2);c.lineWidth=1.1;
      c.beginPath();c.moveTo(px+3,py+12+n*7);c.lineTo(px+13,py+5);
      c.lineTo(px+22,py+10);c.lineTo(px+27,py+3);c.stroke();
      c.strokeStyle=rgba("#0c1517",.5);c.beginPath();
      c.moveTo(px+9,py+30);c.lineTo(px+16,py+20);c.lineTo(px+30,py+23);c.stroke();
      if(floor.at(x,y+1)===1||floor.at(x,y+1)===2){
        c.fillStyle=p.rim;c.fillRect(px,py+28,32,3);
        c.fillStyle=rgba("#071317",.5);c.fillRect(px,py+31,32,1);
      }
      if(floor.at(x+1,y)===1) {
        c.fillStyle=rgba(p.rim,.55);c.fillRect(px+29,py,3,32);
      }
    }else if(tile===2){
      const w=c.createLinearGradient(px,py,px+32,py+32);
      w.addColorStop(0,mix(p.water,p.light,n*.27));w.addColorStop(1,mix(p.wall,p.water,.58));
      c.fillStyle=w;c.fillRect(px,py,32,32);
      c.strokeStyle=rgba(p.accent,.35);
      c.beginPath();c.ellipse(px+15,py+17,9+detail*4,3,0,0,TAU);c.stroke();
      ellipse(c,px+7,py+9,2,1,rgba("#ffffff",.2));
    }else{
      const col=mix(p.ground,p.light,.12+n*.52);
      c.fillStyle=col;c.fillRect(px,py,32,32);
      c.strokeStyle=rgba(p.wall,.22);c.lineWidth=.85;
      c.beginPath();c.moveTo(px+3,py+22+detail*4);c.lineTo(px+10,py+18);
      c.lineTo(px+17,py+20);c.stroke();
      // Regional particles: frost, dune dust, wet lichen, mineral grains.
      const frost=floor.theme==="glacial",wet=floor.theme==="marsh",sand=floor.theme==="desert";
      for(let j=0;j<5;j++){
        const gx=px+3+hash2(x*9+j,y,seed+211)*26;
        const gy=py+3+hash2(x,y*7+j,seed+223)*26;
        ellipse(c,gx,gy,1+hash2(j,x+y,seed+233)*1.1,.5,
          rgba(frost?"#e9ffff":wet?"#a8c782":sand?"#f3e0ad":p.accent,.15+(j%3)*.12));
      }
      if(frost&&n>.79){
        c.strokeStyle=rgba("#eafaff",.42);c.lineWidth=1;
        c.beginPath();c.moveTo(px+5,py+6);c.lineTo(px+18,py+16);c.lineTo(px+27,py+12);c.stroke();
      }
      if(wet&&detail>.82){
        for(let j=0;j<3;j++){
          c.strokeStyle=rgba("#a5ce83",.45);c.beginPath();
          c.moveTo(px+10+j*5,py+26);c.lineTo(px+7+j*6,py+15);c.stroke();
        }
      }
    }
  }
  // Torchlight at the only return staircase: no invented floor transition.
  const exitX=(CAVE_EXIT.x+.5)*32, exitY=(CAVE_EXIT.y+.5)*32;
  softShadow(c,exitX,exitY+5,24,8,.55);
  const stair=c.createRadialGradient(exitX,exitY,2,exitX,exitY,31);
  stair.addColorStop(0,"#070d10");stair.addColorStop(.7,p.wall);stair.addColorStop(1,rgba(p.rim,.35));
  c.fillStyle=stair;c.beginPath();c.ellipse(exitX,exitY,23,12,0,0,TAU);c.fill();
  for(let j=0;j<4;j++){
    c.fillStyle=mix(p.rim,p.accent,.18+j*.18);
    c.fillRect(exitX-14+j*2,exitY-8+j*3,28-j*4,2.5);
  }
  c.strokeStyle=p.accent;c.lineWidth=1.5;
  c.beginPath();c.ellipse(exitX,exitY,24,13,0,0,TAU);c.stroke();
  return source;
}
/** High-fidelity but strictly decoration: entrances don't alter terrain collision. */
export function drawCaveEntrance(ctx:CanvasRenderingContext2D, entry:CaveEntrance,
  x:number,y:number,time:number):void {
  const p=PALETTE[entry.theme];
  ctx.save();ctx.translate(x,y);
  softShadow(ctx,1,4,23,10,.54);
  // Distinct rim, cut stone and deep passage.
  for(let ring=3;ring>=0;ring--){
    const rx=21+ring*2,ry=8+ring*1.6;
    ellipse(ctx,0,-1-ring*.5,rx,ry,ring===3?p.wall:ring===0?"#08151a":mix(p.rim,p.wall,ring/4));
  }
  ellipse(ctx,0,0,15,5,"#080e14");
  for(let i=0;i<9;i++){
    const a=(i/9)*TAU,rx=16+hash2(i,entry.tileX,entry.seed+17)*7;
    const px=Math.cos(a)*rx,py=Math.sin(a)*rx*.4;
    ellipse(ctx,px,py,2.2,1.4,i%3?p.rim:p.light,a);
    ellipse(ctx,px-.4,py-.5,1,.6,rgba(p.accent,.5));
  }
  if(entry.kind==="ladder"){
    for(const sx of [-7,7]) {
      ctx.strokeStyle="#4a3323";ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(sx,-17);ctx.lineTo(sx,6);ctx.stroke();
    }
    for(let i=0;i<5;i++){
      ctx.strokeStyle=i%2?"#be9863":"#9e794a";ctx.lineWidth=2.1;
      ctx.beginPath();ctx.moveTo(-8,-14+i*5);ctx.lineTo(8,-14+i*5);ctx.stroke();
    }
  }else if(entry.kind==="stairs"){
    for(let i=0;i<4;i++) {
      ctx.fillStyle=mix(p.rim,p.wall,i*.2);
      ctx.fillRect(-11+i*2,-2+i*3,22-i*4,3);
      ctx.fillStyle=rgba(p.accent,.35);ctx.fillRect(-11+i*2,-2+i*3,22-i*4,1);
    }
  }else{
    const glint=.35+Math.sin(time*2+entry.tileX)*.11;
    ellipse(ctx,-7,-6,7,2.3,rgba(p.accent,glint));
  }
  ctx.restore();
}
export function drawCaveView(ctx:CanvasRenderingContext2D,room:CaveRoom,
  left:number,top:number,width:number,height:number,time:number,
  gear?:GearState,weapon?:WeaponId):void {
  ctx.fillStyle="#070e13";ctx.fillRect(0,0,width,height);
  let texture=wallCache.get(room.floor);
  if(!texture){texture=paintFloor(ctx,room.floor);wallCache.set(room.floor,texture);}
  ctx.drawImage(texture,-left,-top);
  const player=room.player;
  renderHero(ctx,{...player,gear,equippedWeapon:weapon},player.x-left,player.y-top,time);
  // Static darkness with a local light pool following the real cave player.
  const light=ctx.createRadialGradient(player.x-left,player.y-top,24,
    player.x-left,player.y-top,Math.max(180,Math.min(width,height)*.68));
  light.addColorStop(0,"rgba(2,9,13,0)");
  light.addColorStop(.65,"rgba(3,10,13,.2)");
  light.addColorStop(1,"rgba(3,8,12,.66)");
  ctx.fillStyle=light;ctx.fillRect(0,0,width,height);
}
export function drawCaveAtlas(ctx:CanvasRenderingContext2D, floor:CaveFloor,
  tileX:number,tileY:number):void {
  const w=ctx.canvas.width,h=ctx.canvas.height,p=PALETTE[floor.theme];
  ctx.clearRect(0,0,w,h);ctx.fillStyle="#111b1c";ctx.fillRect(0,0,w,h);
  const size=Math.floor(Math.min((w-24)/CAVE_WIDTH,(h-24)/CAVE_HEIGHT));
  const ox=Math.floor((w-CAVE_WIDTH*size)/2),oy=Math.floor((h-CAVE_HEIGHT*size)/2);
  for(let y=0;y<CAVE_HEIGHT;y++)for(let x=0;x<CAVE_WIDTH;x++){
    const t=floor.at(x,y);
    ctx.fillStyle=t===0?p.wall:t===2?p.water:mix(p.ground,p.light,.2+hash2(x,y,floor.entrance.seed)*.5);
    ctx.fillRect(ox+x*size,oy+y*size,size,size);
  }
  const marker=(x:number,y:number,color:string):void=>{
    ctx.fillStyle="#102021";ctx.fillRect(ox+x*size-2,oy+y*size-2,size+4,size+4);
    ctx.fillStyle=color;ctx.fillRect(ox+x*size-1,oy+y*size-1,size+2,size+2);
  };
  marker(CAVE_EXIT.x,CAVE_EXIT.y,"#f6d18e");
  marker(tileX,tileY,"#ffffff");
  ctx.strokeStyle=rgba(p.accent,.8);ctx.lineWidth=2;
  ctx.strokeRect(ox-2,oy-2,CAVE_WIDTH*size+4,CAVE_HEIGHT*size+4);
}
