export interface CatalogItem { id:string;name:string;category:string;rarity:string;maxStack:number;tradeEnabled:boolean; }
export function catalogEndpoint(multiplayer:string,override=''):string|null {
 try{
  const url=new URL(override||multiplayer.replace(/^ws:/,'http:').replace(/^wss:/,'https:'));
  if(url.username||url.password||!(url.protocol==='https:'||url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))return null;
  url.pathname='/market/catalog';url.search='';url.hash='';return url.href;
 }catch{return null;}
}
export function catalogItems(value:unknown):CatalogItem[] {
 if(!value||typeof value!=='object'||!('items' in value)||!Array.isArray(value.items)||value.items.length>200)throw Error('Invalid catalogue');
 const seen=new Set<string>();
 return value.items.map((item:unknown)=>{
  if(!item||typeof item!=='object')throw Error('Invalid item');
  const i=item as Record<string,unknown>;
  if(typeof i['id']!=='string'||!/^[a-z][a-z0-9-]{0,63}$/.test(i['id'])||seen.has(i['id'])||
   typeof i['name']!=='string'||i['name'].length<1||i['name'].length>80||
   typeof i['category']!=='string'||!['material','consumable','food','weapon','equipment','collectible'].includes(i['category'])||
   typeof i['rarity']!=='string'||!['common','rare'].includes(i['rarity'])||
   typeof i['maxStack']!=='number'||!Number.isInteger(i['maxStack'])||i['maxStack']<1||i['maxStack']>999||
   typeof i['tradeEnabled']!=='boolean')throw Error('Invalid item');
  seen.add(i['id']);return {id:i['id'],name:i['name'],category:i['category'],rarity:i['rarity'],maxStack:i['maxStack'],tradeEnabled:i['tradeEnabled']};
 });
}
