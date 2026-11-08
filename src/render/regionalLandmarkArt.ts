import { hash2 } from "../world/random.ts";
import type { RegionalLandmarkKind } from "../world/regionalLandmarks.ts";
import { ellipse, rgba, softShadow, TAU } from "./draw.ts";

/**
 * Art-only module. Regional landmark placement, collision and names stay in
 * world/. Every shape is local to the object's ground anchor (0,0), up to
 * y=-92. The caller caches at 2x resolution: no randomness or gradients on
 * the gameplay frame path.
 */
export function landmarkArtVariant(variant: number): number {
  return Math.max(0, Math.min(3, Math.floor((Number.isFinite(variant) ? variant : 0) * 4)));
}
const noise = (i: number, variant: number, salt: number): number =>
  hash2(i + 31, variant * 29 + 7, salt);
type Point = readonly [number, number];

function shape(c: CanvasRenderingContext2D, points: readonly Point[],
  fill: string | CanvasGradient, outline?: string): void {
  if (!points.length) return;
  c.beginPath();
  c.moveTo(points[0]![0], points[0]![1]);
  for (let i = 1; i < points.length; i++) c.lineTo(points[i]![0], points[i]![1]);
  c.closePath();
  c.fillStyle = fill; c.fill();
  if (outline) { c.strokeStyle = outline; c.lineWidth = 1; c.stroke(); }
}

function facet(c: CanvasRenderingContext2D, points: readonly Point[],
  light: string, shadow: string, outline?: string): void {
  const g = c.createLinearGradient(-20, -68, 20, -6);
  g.addColorStop(0, light); g.addColorStop(1, shadow);
  shape(c, points, g, outline);
}
function stroke(c: CanvasRenderingContext2D, points: readonly Point[], color: string,
  width = 1): void {
  if (points.length < 2) return;
  c.beginPath(); c.moveTo(points[0]![0], points[0]![1]);
  for (let i = 1; i < points.length; i++) c.lineTo(points[i]![0], points[i]![1]);
  c.strokeStyle = color; c.lineWidth = width; c.stroke();
}
function rubble(c: CanvasRenderingContext2D, v: number, base: string, highlight: string): void {
  for (let i = 0; i < 13; i++) {
    const a = noise(i, v, 1201) * TAU;
    const distance = 14 + noise(i, v, 1202) * 16;
    const x = Math.cos(a) * distance, y = Math.sin(a) * distance * 0.3 - 1;
    const radius = 1.5 + noise(i, v, 1203) * 3;
    ellipse(c, x + 1, y + 1, radius * 1.3, radius * 0.55, rgba("#0d1c20", .28));
    ellipse(c, x, y, radius, radius * .58, i % 3 ? base : highlight);
    stroke(c, [[x - radius * .5, y - .5], [x + .4, y - radius * .35]],
      rgba(highlight, .6), .7);
  }
}
function masonry(c: CanvasRenderingContext2D, v: number, y0: number, y1: number,
  halfWidth: (y: number) => number, color: string): void {
  for (let j = 0, y = y0; y < y1; j++, y += 9) {
    const width = halfWidth(y);
    stroke(c, [[-width + 1, y], [width - 1, y]], color, .85);
    for (let x = -width + (j % 2 ? 6 : 1); x < width - 3; x += 9) {
      stroke(c, [[x, y], [x - .5, Math.min(y + 8, y1)]], color, .8);
    }
  }
  for (let i = 0; i < 18; i++) {
    const y = y0 + noise(i, v, 1229) * (y1 - y0);
    const w = halfWidth(y) - 3;
    const x = (noise(i, v, 1230) * 2 - 1) * w;
    ellipse(c, x, y, 1.3 + noise(i, v, 1231), .6, rgba("#f5e9cb", .19));
  }
}

// Faceted blue ice with a broken crown, trapped bubbles and side spires.
function paintIce(c: CanvasRenderingContext2D, v: number): void {
  rubble(c, v, "#7da9bb", "#d5f6ff");
  facet(c, [[-29,-5],[-22,-42],[-12,-63],[-5,-13]], "#b7e9f5","#446b86","#29475c");
  facet(c, [[17,-6],[12,-39],[24,-54],[31,-16]], "#a0d2e5","#477d96","#36566b");
  shape(c, [[-19,-7],[-15,-61],[-5,-79],[2,-91],[13,-68],[18,-8]],
    "#446e87","#26485c");
  facet(c, [[-19,-7],[-15,-61],[-5,-79],[2,-91],[-2,-10]],
    "#effdff","#77b9d5");
  facet(c, [[-2,-10],[2,-91],[13,-68],[18,-8]],
    "#9ecfdf","#376680");
  facet(c, [[-3,-14],[2,-91],[6,-71],[6,-20]], "#f9ffff","#7eb7ca");
  stroke(c, [[2,-90],[6,-72],[6,-22]], rgba("#effbff",.75),1.4);
  stroke(c, [[-15,-59],[-7,-64],[-4,-46]], rgba("#d5f7ff",.85),1.2);
  stroke(c, [[12,-39],[2,-35],[5,-22]], rgba("#264e67",.38),1);
  // Glacial fractures, fixed within each of four deterministic appearance buckets.
  for (let i = 0; i < 15; i++) {
    const y=-14-noise(i,v,1001)*57;
    const side=noise(i,v,1002)>.5 ? -1 : 1;
    const x=side*(3+noise(i,v,1003)*8);
    stroke(c, [[x,y],[x+side*3,y-3],[x+side*5,y-6]],
      i%3===0?rgba("#2f617d",.35):rgba("#edfaff",.66),.7);
  }
  for (let i=0;i<22;i++) {
    const x=(noise(i,v,1011)-.5)*21,y=-12-noise(i,v,1012)*61;
    ellipse(c,x,y,.55+noise(i,v,1013)*.9,.75,rgba("#ffffff",.45));
  }
  for (const x of [-15,1,16]) {
    shape(c, [[x-6,-6],[x-1,-13],[x+5,-6],[x+1,0]], "#b9e3ed", "#537d91");
    stroke(c,[[x-1,-13],[x+1,0]],rgba("#ffffff",.65),.8);
  }
}

// Sand-worn sandstone: stepped plinth, chisel seams, hieroglyphs, broken edges.
function paintDesert(c: CanvasRenderingContext2D, v: number): void {
  rubble(c,v,"#bd9967","#efd7a0");
  const base=c.createLinearGradient(-22,-18,20,2);
  base.addColorStop(0,"#e4c38b");base.addColorStop(.6,"#bd9361");base.addColorStop(1,"#76583f");
  c.fillStyle=base;c.fillRect(-24,-10,48,9);
  c.fillStyle="#aa7c51";c.fillRect(-21,-17,42,7);
  for(const y of [-17,-10]) {
    stroke(c,[[-22,y],[21,y]],rgba("#f7e5bf",.45),1.3);
    stroke(c,[[-22,y+2],[21,y+2]],rgba("#5b432f",.3),.8);
  }
  shape(c,[[-16,-16],[-13,-66],[-4,-83],[3,-86],[14,-65],[16,-16]],
    "#9c704d","#674c37");
  facet(c,[[-16,-16],[-13,-66],[-4,-83],[3,-86],[-1,-17]],
    "#f5dda6","#c19b63");
  facet(c,[[-1,-17],[3,-86],[14,-65],[16,-16]],
    "#c6a171","#896247");
  stroke(c,[[-13,-66],[-4,-83],[3,-86],[14,-65]],"#f0d8a2",1.6);
  stroke(c,[[-14,-18],[-10,-62],[1,-82]],rgba("#fff1ca",.6),1.2);
  // Carved lines, never arbitrary UI text.
  for(let j=0;j<4;j++) {
    const y=-56+j*11,delta=noise(j,v,1101)*2;
    c.strokeStyle=rgba("#6b4d37",.85);c.lineWidth=1.5;
    c.beginPath();c.moveTo(-8,y);c.lineTo(8,y);c.stroke();
    stroke(c,[[-6,y-5],[0,y-1],[5,y-5]],rgba("#f6db9e",.7),.85);
    if(j%2===0){
      stroke(c,[[-1+delta,y-9],[-1+delta,y-3]],rgba("#705039",.7),1.3);
    } else {
      ellipse(c,0,y-5,2.1,1.8,rgba("#7b5635",.7));
    }
  }
  masonry(c,v,-60,-18,()=>12,rgba("#705239",.32));
  // Asymmetrical erosion cracks and protruding stone slivers.
  for(let i=0;i<9;i++) {
    const y=-21-noise(i,v,1111)*37;
    const x=(noise(i,v,1112)>.5?1:-1)*(10+noise(i,v,1113)*3);
    stroke(c,[[x,y],[x-2,y+3],[x+1,y+5]],rgba("#65503d",.55),.85);
  }
  if(v%2===1) {
    shape(c,[[2,-86],[10,-73],[8,-69],[3,-73]],"#a8845d");
    stroke(c,[[2,-86],[8,-69]],rgba("#fce4ac",.65),1);
  }
  for(let i=0;i<20;i++){
    const x=-22+noise(i,v,1151)*44,y=-7+noise(i,v,1152)*7;
    ellipse(c,x,y,1.1,.5,rgba("#f9e6b9",.5));
  }
}

// Maritime architecture: ashlar tower, arched door, trim, balcony, lantern and roof.
function paintCoast(c: CanvasRenderingContext2D, v: number): void {
  rubble(c,v,"#829c9a","#d1ddd4");
  shape(c,[[-19,-5],[-15,-61],[-10,-67],[11,-67],[16,-61],[20,-5]],
    "#57777d","#3d565e");
  facet(c,[[-19,-5],[-15,-61],[-10,-67],[-3,-5]],
    "#e0d9c5","#a6b4ad");
  facet(c,[[-3,-5],[-10,-67],[11,-67],[16,-61],[20,-5]],
    "#b2b9b3","#7e9999");
  stroke(c,[[-15,-61],[-10,-67],[11,-67],[16,-61]],"#f2e9ce",1.5);
  // Offset courses of masonry and worn mortar.
  masonry(c,v,-57,-7,y=>17+(y+7)*.08,rgba("#526567",.48));
  c.fillStyle="#485b5e";c.fillRect(-24,-9,48,7);
  c.fillStyle="#c6c6b6";c.fillRect(-24,-11,48,3);
  stroke(c,[[-23,-11],[23,-11]],"#f1e6d0",1.2);
  // Recessed arch doorway is not an accessible interior.
  c.fillStyle="#45565b";c.beginPath();c.moveTo(-7,-6);c.lineTo(-7,-22);
  c.arc(0,-22,7,Math.PI,0);c.lineTo(7,-6);c.closePath();c.fill();
  c.fillStyle="#334648";c.fillRect(-4.5,-16,9,10);
  stroke(c,[[0,-6],[0,-23]],rgba("#c8bba1",.35),.85);
  ellipse(c,3,-13,1.2,1.2,"#d4b27b");
  // Narrow glass panes and iron shutters.
  for (const y of [-48,-31]) {
    c.fillStyle="#3b555c";c.fillRect(-3,y,6,9);
    c.fillStyle="#7fb8bd";c.fillRect(-1.8,y+1,3.5,6);
    stroke(c,[[-1.2,y+1],[-1.2,y+6]],rgba("#e6faff",.7),.8);
    c.fillStyle="#8b8676";c.fillRect(-5,y+8,10,2.2);
  }
  // Octagonal lantern gallery, safety bars and metal brackets.
  c.fillStyle="#344b52";c.fillRect(-24,-68,48,4);
  c.fillStyle="#b8b2a0";c.fillRect(-24,-71,48,3.4);
  for(const x of [-18,-10,0,10,18]) {
    stroke(c,[[x,-71],[x,-80]],"#384e54",2.2);
    ellipse(c,x,-71,1.3,1.2,"#dfd8bb");
  }
  const lantern=c.createRadialGradient(-4,-80,1,0,-81,15);
  lantern.addColorStop(0,"#fff9d9");lantern.addColorStop(.5,"#f2d28e");
  lantern.addColorStop(1,"#a68859");
  c.fillStyle=lantern;c.fillRect(-13,-88,26,16);
  c.fillStyle="rgba(28,49,51,.28)";
  for(const x of [-12,0,12]) c.fillRect(x-1,-88,2,16);
  stroke(c,[[-13,-88],[13,-88]],"#eee8ca",1);
  shape(c,[[-21,-88],[0,-96],[21,-88],[14,-85],[-14,-85]],"#685c50","#39464b");
  stroke(c,[[-21,-88],[0,-96],[21,-88]],"#c6a884",1.5);
  for(let i=0;i<9;i++){
    const x=-20+noise(i,v,1311)*40,y=-18+noise(i,v,1312)*15;
    stroke(c,[[x,y],[x+3,y-5],[x+5,y-8]],rgba(i%2?"#577a5e":"#93ad7d",.75),1.4);
  }
  for(let i=0;i<7;i++) {
    const x=(noise(i,v,1320)-.5)*25;
    ellipse(c,x,-4-noise(i,v,1321)*7,2,1.4,rgba("#f4f2de",.28));
  }
}

// Deep basalt with exposed facets, veins, old runes, metal studs and lichen.
function paintMountain(c: CanvasRenderingContext2D, v: number): void {
  rubble(c,v,"#5f6b70","#a3b3ad");
  shape(c,[[-25,-7],[-20,-45],[-15,-70],[2,-89],[15,-73],[24,-40],[25,-7]],
    "#34454d","#1c2d34");
  facet(c,[[-25,-7],[-20,-45],[-15,-70],[2,-89],[-4,-9]],
    "#b3bec0","#66777e");
  facet(c,[[-4,-9],[2,-89],[15,-73],[24,-40],[25,-7]],
    "#6a7b83","#2e454f");
  shape(c,[[2,-89],[15,-73],[7,-62]],"#a1aeb2");
  shape(c,[[-25,-7],[-20,-45],[-7,-32],[-4,-9]],"#657c82");
  shape(c,[[24,-40],[25,-7],[5,-9],[11,-33]],"#415660");
  stroke(c,[[-20,-45],[-7,-32],[-4,-9]],rgba("#d7e0da",.5),1.2);
  stroke(c,[[2,-89],[15,-73],[24,-40]],rgba("#d4d9d5",.7),1.2);
  for(let i=0;i<15;i++){
    const y=-10-noise(i,v,1411)*65;
    const x=(noise(i,v,1412)-.5)*33;
    stroke(c,[[x,y],[x+3,y+4],[x-1,y+9]],rgba(i%3?"#162d33":"#c6cfca",.4),.8);
  }
  // Ancient symbol engraved into the rock; no interactive dungeon implied.
  stroke(c,[[-7,-60],[5,-53],[-5,-43],[8,-35],[-1,-27]],
    "#223c48",4);
  stroke(c,[[-7,-61],[5,-54],[-5,-44],[8,-36],[-1,-28]],
    "#9bc1c1",1.8);
  stroke(c,[[-1,-65],[2,-56]],rgba("#d5ebe4",.72),1);
  for(let i=0;i<18;i++){
    const x=(noise(i,v,1431)-.5)*37,y=-7-noise(i,v,1432)*61;
    ellipse(c,x,y,1.8+noise(i,v,1433)*2,.7+noise(i,v,1434),
      rgba(i%3?"#7da181":"#b1bf9e",.36));
  }
  // A split foot and chipped mineral edges.
  for(const side of [-1,1]){
    shape(c,[[side*12,-8],[side*19,-17],[side*27,-8],[side*29,0]],
      side<0?"#7a8b8b":"#42535a");
    stroke(c,[[side*19,-17],[side*27,-8]],rgba("#d0d9d5",.4),1);
  }
}

export function paintRegionalLandmark(c: CanvasRenderingContext2D,
  kind: RegionalLandmarkKind, variation = 0): void {
  const v = landmarkArtVariant(variation / 4);
  c.save();
  softShadow(c,2,2,30,9,.44);
  if(kind==="ice-spire") paintIce(c,v);
  else if(kind==="desert-obelisk") paintDesert(c,v);
  else if(kind==="coast-beacon") paintCoast(c,v);
  else paintMountain(c,v);
  c.restore();
}
