/**
 * Poço Negro, cidade central dos Ermos do Sul. Coordenadas fixas (independentes da
 * seed), na antiga estrada norte-sul. Apenas O(1) por tile: sem varrer o deserto.
 * Os portões ficam abertos; a lei local protege qualquer visitante dentro do muro.
 */
export const SOUTH_CITY = {
  name: "Poço Negro", centerX: 0, centerY: 15500,
  minX: -28, maxX: 27, minY: -24, maxY: 23,
  northGate: "Portão das Presas", southGate: "Portão dos Ossos",
} as const;
export const SOUTH_CITY_PALETTE = {
  sand: ["#e3c58a","#c9a468","#8f6f3f"],
  clay: ["#c98a5a","#a8683e","#6e4128"],
  stone: ["#5a4a63","#3a2f45","#221a2b"],
  wine: ["#8a3b5c","#5e2440","#36142a"],
  bronze: ["#e0a24a","#b97a2a","#7a4a18"],
  bone: ["#efe3c8","#d3c3a0","#a08f6c"],
  poison: ["#8bd450","#5aa032","#356a1f"],
} as const;
export type SouthCityPropKind = "wall"|"gate"|"tower"|"building"|"well"|"tent"|
  "torch"|"bones"|"barrel"|"palm"|"arena"|"corral"|"sign"|"stall";
export interface SouthCityProp { readonly kind:SouthCityPropKind; readonly x:number;
  readonly y:number; readonly variant:number; readonly id?:string }
export function southPoint(localX:number,localY:number):{x:number;y:number}{
  return {x:(localX+.5)*32,y:(SOUTH_CITY.centerY+localY+.5)*32};
}
const specs = [
  ["south-fortress","Fortaleza do Poço",-17,-12,0,true],
  ["south-forge","Fornalha dos Trolls",-17,10,1,true],
  ["south-inn","Hospedaria Sombra do Escorpião",-6,12,2,true],
  ["south-bazaar","Bazar das Raridades",16,-12,3,false],
  ["south-poisons","Casa de Venenos",22,-5,4,false],
  ["south-temple","Templo do Sol Negro",15,8,5,false],
  ["south-ossuary","Ossuário",8,16,6,false],
  ["south-stable","Estábulo de Lagartos",-20,18,7,false],
  ["south-home-clay","Casa de Argila",-23,-2,8,false],
  ["south-home-hide","Tenda de Couro",-8,-15,9,false],
  ["south-home-bone","Casebre de Ossos",4,-15,10,false],
  ["south-home-stilts","Barraca sobre Estacas",22,15,11,false],
] as const;
export const SOUTH_BUILDINGS = specs.map(([id,name,tx,ty,variant,interior])=>({
  id,name, ...southPoint(tx,ty), variant, interior,
}));
export type SouthBuilding = (typeof SOUTH_BUILDINGS)[number];
export const SOUTH_SIGNS = [
  {id:"south-north-sign",name:"Placa: Portão das Presas",...southPoint(-5,-20)},
  {id:"south-well-sign",name:"Placa: Poço Negro",...southPoint(6,3)},
  {id:"south-south-sign",name:"Placa: Portão dos Ossos",...southPoint(5,19)},
  {id:"south-obelisk-sign",name:"Trilha do Obelisco Soterrado",...southPoint(11,-19)},
] as const;
function local(tx:number,ty:number):[number,number]{return [tx,ty-SOUTH_CITY.centerY]}
function insideWall(x:number,y:number):boolean{
  return x>=SOUTH_CITY.minX&&x<=SOUTH_CITY.maxX&&y>=SOUTH_CITY.minY&&y<=SOUTH_CITY.maxY;
}
/** Zona protegida exclui o próprio muro e todas as estradas externas. */
export function southCitySafe(tx:number,ty:number):boolean{
  const [x,y]=local(tx,ty);
  return x>SOUTH_CITY.minX&&x<SOUTH_CITY.maxX&&
    y>SOUTH_CITY.minY&&y<SOUTH_CITY.maxY;
}
/** Terreno e acesso aos dois portões, sem confundir poço decorativo com água oceânica. */
export function southCityGround(tx:number,ty:number):"path"|"sand"|null{
  if(!Number.isSafeInteger(tx)||!Number.isSafeInteger(ty))return null;
  const [x,y]=local(tx,ty);
  if(insideWall(x,y)){
    const road=Math.abs(x)<=2 || Math.abs(y)<=2 ||
      (Math.abs(x)<=19&&(y===-10||y===11)) ||
      (Math.abs(y)<=16&&(x===-12||x===12)) ||
      (Math.abs(x)<=6&&Math.abs(y)<=6);
    return road?"path":"sand";
  }
  if(Math.abs(x)<=2&&y>=-66&&y<=55)return "path";
  // Caminhos para oásis, obelisco e ruínas saem da estrada sul, por fora da muralha.
  if(y>=26&&y<=27&&Math.abs(x)<=73)return "path";
  if(x>=55&&x<=57&&y>=-6&&y<=27)return "path";
  if(x<=-55&&x>=-57&&y>=-6&&y<=27)return "path";
  return null;
}
function wallTile(tx:number,ty:number):boolean{
  const [x,y]=local(tx,ty);
  if(!insideWall(x,y))return false;
  if(x===SOUTH_CITY.minX||x===SOUTH_CITY.maxX)return true;
  return (y===SOUTH_CITY.minY||y===SOUTH_CITY.maxY)&&Math.abs(x)>2;
}
/** Muralha, fundações e o poço são físicos: as aberturas dos portões permanecem livres. */
export function southCityBlocks(x:number,y:number,r:number):boolean{
  if(![x,y,r].every(Number.isFinite))return true;
  if(Math.abs(x)>1600 || Math.abs(y-(SOUTH_CITY.centerY+.5)*32)>1700)return false;
  for(const dx of [-r,r])for(const dy of [-r,r])
    if(wallTile(Math.floor((x+dx)/32),Math.floor((y+dy)/32)))return true;
  const well=southPoint(0,0);
  if(Math.hypot(x-well.x,y-well.y)<52+r)return true;
  return SOUTH_BUILDINGS.some(b=>Math.abs(x-b.x)<41+r&&
    y>b.y-57-r&&y<b.y+8+r);
}
function p(kind:SouthCityPropKind,x:number,y:number,variant=0,id?:string):SouthCityProp{
  return {kind,...southPoint(x,y),variant,...(id?{id}:{})};
}
/** Cenário fixo, renderizado somente quando seus objetos entram na câmera. */
function makeProps():readonly SouthCityProp[]{
  const props:SouthCityProp[]=[];
  for(let x=-27;x<=26;x+=2){
    if(Math.abs(x)>2){props.push(p("wall",x,-24,x%4));props.push(p("wall",x,23,x%4));}
  }
  for(let y=-22;y<=22;y+=2){
    props.push(p("wall",-28,y,y%4));props.push(p("wall",27,y,y%4));
  }
  for(const y of [-24,23]){
    props.push(p("gate",0,y,y<0?0:1));
    props.push(p("tower",-4,y,0));props.push(p("tower",4,y,1));
  }
  for(const b of SOUTH_BUILDINGS)props.push({kind:"building",x:b.x,y:b.y,variant:b.variant,id:b.id});
  props.push(p("well",0,0));
  props.push(p("arena",20,17));
  props.push(p("corral",-19,16));
  for(const [x,y,v] of [[11,-8,0],[16,-8,1],[21,-9,2],[19,-1,3],[11,-3,4]] as const)
    props.push(p("tent",x,y,v));
  for(const [x,y] of [[11,-5],[15,-6],[19,-6],[17,1],[-14,2],[-11,16]] as const)
    props.push(p("stall",x,y));
  for(const [x,y,v] of [[-4,-22,0],[4,-22,1],[-4,21,1],[4,21,0],
    [-8,-3,0],[8,3,1],[-12,7,1],[12,7,0],[23,3,1],[-23,3,0]] as const)
    props.push(p("torch",x,y,v));
  for(const [x,y] of [[-24,-15],[24,-18],[-25,20],[24,19],[8,-18]] as const)
    props.push(p("bones",x,y));
  for(const [x,y] of [[-10,-8],[-13,17],[22,-14],[9,20],[-22,9]] as const)
    props.push(p("barrel",x,y));
  for(const [x,y] of [[-26,13],[-26,-19],[25,-20]] as const)
    props.push(p("palm",x,y));
  for(const sign of SOUTH_SIGNS)props.push({kind:"sign",x:sign.x,y:sign.y,variant:0});
  return props;
}
export const SOUTH_CITY_PROPS = makeProps();
