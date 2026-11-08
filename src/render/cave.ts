import { renderRegionalCreature } from "./regionalCreatures.ts";
import type { GearState } from "../engine/Equipment.ts";
import type { WeaponId } from "../engine/Weapons.ts";
import { renderHero } from "./actors.ts";
import { ellipse, mix, rgba, shade, softShadow, TAU } from "./draw.ts";
import { CAVE_PALETTE, drawCaveExitStair, drawCaveFormation } from "./caveDetails.ts";
import { hash2, valueNoise } from "../world/random.ts";
import { TILE_SIZE } from "../world/terrain.ts";
import type { CaveEntrance, CaveTheme } from "../world/caves.ts";
import { CAVE_EXIT, CAVE_HEIGHT, CAVE_WIDTH, type CaveFloor, type CaveRoom } from "../engine/CaveRoom.ts";

const PALETTE = CAVE_PALETTE;

const wallCache = new WeakMap<CaveFloor, HTMLCanvasElement>();
const atlasCache = new WeakMap<CaveFloor, { width: number; height: number; canvas: HTMLCanvasElement }>();
const OUTLINE = "#142a2a";
const GLINT = "#fff6dc";

/** A cave is rock first, a tile grid second: the light/noise must continue across tile edges. */
function paintFloor(floor: CaveFloor): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = CAVE_WIDTH * TILE_SIZE;
  canvas.height = CAVE_HEIGHT * TILE_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const p = PALETTE[floor.theme];
  const seed = floor.entrance.seed ^ Math.imul(floor.entrance.tileX, 313) ^
    Math.imul(floor.entrance.tileY, 971);
  const n = (x: number, y: number, salt: number): number => hash2(x, y, seed + salt);
  const isOpen = (x: number, y: number): boolean => floor.at(x, y) !== 0;

  ctx.fillStyle = p.wall;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < CAVE_HEIGHT; y++) for (let x = 0; x < CAVE_WIDTH; x++) {
    const tile = floor.at(x, y), sx = x * TILE_SIZE, sy = y * TILE_SIZE;
    const fine = n(x, y, 37);
    // The same low-frequency noise continues through adjacent tiles; no checkerboard.
    const wide = valueNoise((x + .5) / 7, (y + .5) / 7, seed + 51);
    if (tile === 0) {
      ctx.fillStyle = mix(p.wall, p.ground, .02 + wide * .15);
      ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
      // Large mineral seams are uncommon, not stamped identically on every block.
      if (fine > .88) {
        const ox = 4 + n(x, y, 72) * 13, oy = 4 + n(x, y, 76) * 14;
        ctx.strokeStyle = rgba(shade(p.rim, -.36), .5);
        ctx.lineWidth = 1.1 + n(x, y, 82);
        ctx.beginPath();
        ctx.moveTo(sx + ox, sy + oy);
        ctx.quadraticCurveTo(sx + ox + 11, sy + oy - 4, sx + ox + 10, sy + oy + 8);
        ctx.quadraticCurveTo(sx + ox + 9, sy + oy + 11, sx + ox + 17, sy + oy + 19);
        ctx.stroke();
      }
      // Only the edge facing a chamber receives rock relief and an upper-left highlight.
      if (isOpen(x, y + 1)) {
        const lip = ctx.createLinearGradient(0, sy + 17, 0, sy + 32);
        lip.addColorStop(0, rgba(p.wall, 0));
        lip.addColorStop(.55, rgba(p.rim, .48));
        lip.addColorStop(1, rgba(OUTLINE, .95));
        ctx.fillStyle = lip;
        ctx.fillRect(sx, sy + 16, 32, 16);
        ctx.strokeStyle = rgba(p.light, .57);
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(sx, sy + 27 + n(x, y, 201) * 1.4);
        ctx.quadraticCurveTo(sx + 16, sy + 26, sx + 32, sy + 28);
        ctx.stroke();
        ctx.fillStyle = rgba(OUTLINE, .37);
        ctx.fillRect(sx, sy + 30, TILE_SIZE, 2);
      }
      if (isOpen(x + 1, y)) {
        const side = ctx.createLinearGradient(sx + 16, 0, sx + 32, 0);
        side.addColorStop(0, rgba(p.wall, 0));
        side.addColorStop(1, rgba(p.rim, .35));
        ctx.fillStyle = side;
        ctx.fillRect(sx + 16, sy, 16, TILE_SIZE);
      }
      continue;
    }

    if (tile === 2) {
      const water = ctx.createLinearGradient(sx, sy, sx + 32, sy + 32);
      water.addColorStop(0, mix(p.water, p.light, .18 + wide * .13));
      water.addColorStop(1, shade(p.water, -.27));
      ctx.fillStyle = water;
      ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
      if (fine > .44) {
        const offset = n(x, y, 64) * 11;
        ctx.strokeStyle = rgba(p.accent, .24 + fine * .17);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx + 3 + offset, sy + 15);
        ctx.quadraticCurveTo(sx + 12 + offset, sy + 12, sx + 25, sy + 17);
        ctx.stroke();
      }
      continue;
    }

    // Floor is a shared expanse: one continuous shade field and sparse local texture.
    ctx.fillStyle = mix(p.ground, p.light, .11 + wide * .15);
    ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
    if (fine > .77) {
      const px = sx + 5 + n(x, y, 73) * 19, py = sy + 5 + n(x, y, 79) * 19;
      ellipse(ctx, px + 1, py + 1, 5, 2.5, rgba(shade(p.ground, -.38), .21));
      ellipse(ctx, px, py, 3.5, 1.8, rgba(mix(p.light, p.ground, .5), .62));
      ellipse(ctx, px - 1, py - .7, 1.1, .55, rgba(GLINT, .19));
    }
    // A few cracks connect through irregular stone; never repeat a generic chevron.
    if (fine > .94) {
      const ox = 3 + n(x, y, 91) * 10, oy = 7 + n(x, y, 95) * 12;
      ctx.strokeStyle = rgba(OUTLINE, .17);
      ctx.lineWidth = .8;
      ctx.beginPath();
      ctx.moveTo(sx + ox, sy + oy);
      ctx.quadraticCurveTo(sx + ox + 10, sy + oy - 2, sx + ox + 12, sy + oy + 7);
      ctx.lineTo(sx + ox + 18, sy + oy + 9);
      ctx.stroke();
    }

    // Contact shadows exist only next to physical wall, not at every 32px seam.
    if (!isOpen(x, y - 1)) {
      const shadeEdge = ctx.createLinearGradient(0, sy, 0, sy + 19);
      shadeEdge.addColorStop(0, rgba(OUTLINE, .52));
      shadeEdge.addColorStop(1, rgba(OUTLINE, 0));
      ctx.fillStyle = shadeEdge;
      ctx.fillRect(sx, sy, TILE_SIZE, 19);
    }
    if (!isOpen(x - 1, y)) {
      const shadeEdge = ctx.createLinearGradient(sx, 0, sx + 14, 0);
      shadeEdge.addColorStop(0, rgba(OUTLINE, .28));
      shadeEdge.addColorStop(1, rgba(OUTLINE, 0));
      ctx.fillStyle = shadeEdge;
      ctx.fillRect(sx, sy, 14, TILE_SIZE);
    }

    // Theme-specific formations live at wall edges and do not change walkability.
    const besideWall = !isOpen(x, y + 1) || !isOpen(x - 1, y) || !isOpen(x + 1, y);
    if (!besideWall || n(x, y, 107) < .83) continue;
    const cx = sx + 7 + n(x, y, 113) * 17;
    const cy = sy + 11 + n(x, y, 119) * 14;
    drawCaveFormation(ctx, floor.theme, cx, cy + 3, fine);
  }

  // A cut-stone stairwell, with a dark recess and perspective rather than a flat circle.
  const ex = (CAVE_EXIT.x + .5) * TILE_SIZE;
  const ey = (CAVE_EXIT.y + .5) * TILE_SIZE;
  drawCaveExitStair(ctx, floor.theme, ex, ey);

  return canvas;
}

/** High-fidelity but strictly decoration: entrances don't alter terrain collision. */
export function drawCaveEntrance(ctx:CanvasRenderingContext2D, entry:CaveEntrance,
  x:number,y:number,time:number):void {
  const p=PALETTE[entry.theme];
  ctx.save();ctx.translate(x,y);
  softShadow(ctx,1,4,23,10,.54);
  // Readable volume and a coherent three-tone stone ramp, light from upper-left.
  const rim=ctx.createLinearGradient(-23,-14,23,11);
  rim.addColorStop(0,"#fff6dc");
  rim.addColorStop(.25,mix(p.rim,p.light,.55));
  rim.addColorStop(.64,p.ground);
  rim.addColorStop(1,mix(p.wall,"#142a2a",.55));
  ctx.fillStyle=rim;ctx.beginPath();ctx.ellipse(0,-1,25,11,0,0,TAU);ctx.fill();
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
    ctx.fillStyle=i%2===0?rgba(mix(p.light,"#fff6dc",.55),.75):
      rgba(mix(p.wall,p.ground,.45),.72);
    ctx.beginPath();ctx.arc(px-1,py-1.4,.85,0,TAU);ctx.fill();
  }
  // Single dark contour plus an upper-left highlight keep it legible on every biome.
  ctx.strokeStyle="#142a2a";ctx.lineWidth=1.5;
  ctx.beginPath();ctx.ellipse(0,-1,25,11,0,0,TAU);ctx.stroke();
  ctx.strokeStyle=rgba(p.light,.8);ctx.lineWidth=1;
  ctx.beginPath();ctx.ellipse(-2,-3,21,8,0,Math.PI,TAU*1.9);ctx.stroke();
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
  ellipse(ctx,-13,-6,3,1.1,rgba("#fff6dc",.6));
  ctx.restore();
}
export function drawCaveView(ctx:CanvasRenderingContext2D,room:CaveRoom,
  left:number,top:number,width:number,height:number,time:number,
  gear?:GearState,weapon?:WeaponId):void {
  ctx.fillStyle="#070e13";ctx.fillRect(0,0,width,height);
  let texture=wallCache.get(room.floor);
  if(!texture){texture=paintFloor(room.floor);wallCache.set(room.floor,texture);}
  ctx.drawImage(texture,-left,-top);
  const player=room.player;
  const occupants: Array<{y:number;render:()=>void}> = [];
  for(const mob of room.monsters.values()){
    if(Math.abs(mob.x-player.x)>width/2+65||Math.abs(mob.y-player.y)>height/2+80)continue;
    occupants.push({y:mob.y,render:()=>renderRegionalCreature(ctx,mob,mob.x-left,mob.y-top,time)});
  }
  occupants.push({y:player.y,render:()=>renderHero(ctx,
    {...player,gear,equippedWeapon:weapon},player.x-left,player.y-top,time)});
  occupants.sort((a,b)=>a.y-b.y);
  for(const actor of occupants)actor.render();
  // Static darkness with a local light pool following the real cave player.
  const light=ctx.createRadialGradient(player.x-left,player.y-top,24,
    player.x-left,player.y-top,Math.max(180,Math.min(width,height)*.68));
  light.addColorStop(0,"rgba(2,9,13,0)");
  light.addColorStop(.65,"rgba(3,10,13,.2)");
  light.addColorStop(1,"rgba(3,8,12,.66)");
  ctx.fillStyle=light;ctx.fillRect(0,0,width,height);
}

/** Readable cartography, not the same terrain screenshot shrunk to a few pixels. */
function paintCaveAtlasBackground(ctx: CanvasRenderingContext2D, floor: CaveFloor): void {
  const w = ctx.canvas.width, h = ctx.canvas.height, p = PALETTE[floor.theme];
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  const paper = ctx.createLinearGradient(0, 0, w, h);
  paper.addColorStop(0, shade(p.wall, -.52));
  paper.addColorStop(.55, shade(p.wall, -.3));
  paper.addColorStop(1, "#0b1b20");
  ctx.fillStyle = paper; ctx.fillRect(0, 0, w, h);

  // Spatial chart grid in the void: distinguish unknown rock from rooms.
  ctx.strokeStyle = rgba(p.rim, .1); ctx.lineWidth = .7;
  for (let i = 16; i < w; i += 32) {
    ctx.beginPath(); ctx.moveTo(i, 10); ctx.lineTo(i, h - 10); ctx.stroke();
  }
  for (let i = 16; i < h; i += 32) {
    ctx.beginPath(); ctx.moveTo(10, i); ctx.lineTo(w - 10, i); ctx.stroke();
  }
  const tileSize = Math.min((w - 26) / CAVE_WIDTH, (h - 48) / CAVE_HEIGHT);
  const ox = (w - CAVE_WIDTH * tileSize) / 2;
  const oy = (h - CAVE_HEIGHT * tileSize) / 2 + 5;
  ctx.save();
  ctx.translate(ox, oy);

  // The map has *one* color field for passages, independent of tile-to-tile random colors.
  for (let y = 0; y < CAVE_HEIGHT; y++) for (let x = 0; x < CAVE_WIDTH; x++) {
    const tile = floor.at(x, y);
    if (tile === 0) continue;
    const n = valueNoise(x / 8, y / 8, floor.entrance.seed + 171);
    ctx.fillStyle = tile === 2 ? mix(p.water, p.rim, .16 + n * .15)
      : mix(p.ground, p.light, .45 + n * .14);
    ctx.fillRect(x * tileSize, y * tileSize, tileSize + .25, tileSize + .25);
    if (tile === 2 && hash2(x, y, floor.entrance.seed + 181) > .52) {
      ctx.strokeStyle = rgba(p.accent, .55); ctx.lineWidth = .65;
      ctx.beginPath(); ctx.moveTo(x * tileSize + 1, (y + .5) * tileSize);
      ctx.lineTo((x + .65) * tileSize, (y + .5) * tileSize); ctx.stroke();
    }
  }
  // Join wall boundaries into a single continuous illuminated outline.
  ctx.beginPath();
  for (let y = 0; y < CAVE_HEIGHT; y++) for (let x = 0; x < CAVE_WIDTH; x++) {
    if (floor.at(x, y) === 0) continue;
    const sx = x * tileSize, sy = y * tileSize;
    if (floor.at(x, y - 1) === 0) { ctx.moveTo(sx, sy); ctx.lineTo(sx + tileSize, sy); }
    if (floor.at(x + 1, y) === 0) { ctx.moveTo(sx + tileSize, sy); ctx.lineTo(sx + tileSize, sy + tileSize); }
    if (floor.at(x, y + 1) === 0) { ctx.moveTo(sx + tileSize, sy + tileSize); ctx.lineTo(sx, sy + tileSize); }
    if (floor.at(x - 1, y) === 0) { ctx.moveTo(sx, sy + tileSize); ctx.lineTo(sx, sy); }
  }
  ctx.strokeStyle = rgba(OUTLINE, .85); ctx.lineWidth = 2.8; ctx.stroke();
  ctx.strokeStyle = rgba(p.light, .79); ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();

  // Frame and north indicator are part of the chart, not interior floor texture.
  ctx.strokeStyle = rgba(p.rim, .8); ctx.lineWidth = 1.4;
  ctx.strokeRect(10.5, 10.5, w - 21, h - 21);
  ctx.strokeStyle = rgba(GLINT, .32); ctx.lineWidth = .7;
  ctx.strokeRect(13.5, 13.5, w - 27, h - 27);
  ctx.fillStyle = rgba(GLINT, .84); ctx.textAlign = "left"; ctx.font = "bold 9px system-ui";
  ctx.fillText("ANDAR -1", 20, 24);
  ctx.fillStyle = p.accent; ctx.textAlign = "right";
  ctx.fillText("N ↑", w - 20, 24);
  ctx.fillStyle = rgba(GLINT, .52); ctx.textAlign = "center"; ctx.font = "8px system-ui";
  ctx.fillText("SOLO TRANSITÁVEL  ·  ROCHA MACIÇA  ·  ÁGUA", w / 2, h - 17);
  ctx.restore();
}

/** Map background is frozen per floor; moving the marker never regenerates 1260 tiles. */
export function drawCaveAtlas(ctx: CanvasRenderingContext2D, floor: CaveFloor,
  tileX: number, tileY: number): void {
  const w = ctx.canvas.width, h = ctx.canvas.height, p = PALETTE[floor.theme];
  let cached = atlasCache.get(floor);
  if (!cached || cached.width !== w || cached.height !== h) {
    const surface = document.createElement("canvas");
    surface.width = w; surface.height = h;
    const base = surface.getContext("2d");
    if (!base) return;
    paintCaveAtlasBackground(base, floor);
    cached = { width: w, height: h, canvas: surface };
    atlasCache.set(floor, cached);
  }
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(cached.canvas, 0, 0);
  const size = Math.min((w - 26) / CAVE_WIDTH, (h - 48) / CAVE_HEIGHT);
  const ox = (w - CAVE_WIDTH * size) / 2;
  const oy = (h - CAVE_HEIGHT * size) / 2 + 5;
  const markX = (x: number): number => ox + (x + .5) * size;
  const markY = (y: number): number => oy + (y + .5) * size;
  const exitX = markX(CAVE_EXIT.x), exitY = markY(CAVE_EXIT.y);
  // Gold diamond = return staircase.
  softShadow(ctx, exitX, exitY + 2, 8, 4, .55);
  ctx.fillStyle = OUTLINE;
  ctx.beginPath(); ctx.moveTo(exitX, exitY - 6); ctx.lineTo(exitX + 6, exitY);
  ctx.lineTo(exitX, exitY + 6); ctx.lineTo(exitX - 6, exitY); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#f6d18e";
  ctx.beginPath(); ctx.moveTo(exitX, exitY - 4.5); ctx.lineTo(exitX + 4.5, exitY);
  ctx.lineTo(exitX, exitY + 4.5); ctx.lineTo(exitX - 4.5, exitY); ctx.closePath(); ctx.fill();
  ctx.fillStyle = GLINT; ctx.fillRect(exitX - .7, exitY - 1, 1.4, 3);
  // White triangular arrow points north. Dark ring prevents it disappearing on ice.
  const px = markX(tileX), py = markY(tileY);
  ctx.fillStyle = rgba(p.accent, .18);
  ctx.beginPath(); ctx.arc(px, py, 10, 0, TAU); ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(px, py, 7.4, 0, TAU); ctx.stroke();
  ctx.strokeStyle = rgba(GLINT, .82); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(px, py, 7.4, 0, TAU); ctx.stroke();
  ctx.fillStyle = OUTLINE;
  ctx.beginPath(); ctx.moveTo(px, py - 7.3); ctx.lineTo(px + 6, py + 5.4);
  ctx.lineTo(px, py + 2.6); ctx.lineTo(px - 6, py + 5.4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = GLINT;
  ctx.beginPath(); ctx.moveTo(px, py - 6); ctx.lineTo(px + 4.4, py + 3.9);
  ctx.lineTo(px, py + 1.5); ctx.lineTo(px - 4.4, py + 3.9); ctx.closePath(); ctx.fill();
  ctx.restore();
}
