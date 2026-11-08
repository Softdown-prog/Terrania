import type { IncomingMessage,ServerResponse } from 'node:http';
import type { Pool } from 'pg';
import { databaseStatus,readCatalog } from './database.ts';

/** Public read-only catalogue. Account/vault mutations await real authentication. */
export function marketHttp(pool:Pool|null,origins:readonly string[]) {
 let cached:{until:number;value:Awaited<ReturnType<typeof readCatalog>>}|null=null;
 let pending:Promise<Awaited<ReturnType<typeof readCatalog>>>|null=null;
 return async(req:IncomingMessage,res:ServerResponse,path:string):Promise<boolean>=>{
  if(!['/market/catalog','/market/health'].includes(path))return false;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');res.setHeader('Vary','Origin');
  res.setHeader('X-Content-Type-Options','nosniff');
  const send=(status:number,value:unknown)=>{res.writeHead(status);res.end(JSON.stringify(value));};
  const origin=req.headers.origin;
  if(origin&&!origins.includes(origin)){send(403,{error:'Origem não autorizada.'});return true;}
  if(origin)res.setHeader('Access-Control-Allow-Origin',origin);
  if(req.method!=='GET'){res.setHeader('Allow','GET');send(405,{error:'Somente consulta.'});return true;}
  if(path==='/market/health'){
   const state=await databaseStatus(pool);send(state.ready?200:503,state);return true;
  }
  if(!pool){send(503,{error:'Catálogo temporariamente indisponível.'});return true;}
  try{
   if(!cached||cached.until<Date.now()){
    pending??=readCatalog(pool).finally(()=>{pending=null;});
    cached={until:Date.now()+10000,value:await pending};
   }
   send(200,cached.value);
  }catch{send(503,{error:'Catálogo temporariamente indisponível.'});}
  return true;
 };
}
