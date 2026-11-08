import { readFileSync } from 'node:fs';
import { Pool } from 'pg';

export function databasePool(env:NodeJS.ProcessEnv=process.env):Pool|null {
 if(env.TERRANIA_DB_ENABLED!=='1')return null;
 const passwordFile=env.TERRANIA_DB_PASSWORD_FILE;
 if(!passwordFile)throw Error('TERRANIA_DB_PASSWORD_FILE is required');
 const password=readFileSync(passwordFile,'utf8').trim();
 if(password.length<24)throw Error('Invalid database secret');
 const user=env.TERRANIA_DB_USER||'terrania_app';
 if(!['terrania_app','terrania_migrator'].includes(user))throw Error('Invalid database identity');
 const pool=new Pool({host:env.TERRANIA_DB_HOST||'terrania-postgres',port:5432,
  database:'terrania',user,password,max:4,idleTimeoutMillis:30000,connectionTimeoutMillis:3000,
  statement_timeout:5000,query_timeout:6000,application_name:'terrania-'+(user==='terrania_app'?'catalog':'migrate')});
 // Never log pg errors containing SQL, addresses or credentials.
 pool.on('error',()=>console.error('Terrania database connection unavailable'));
 return pool;
}
export async function databaseStatus(pool:Pool|null) {
 if(!pool)return {enabled:false,ready:false,schemaVersion:null};
 try{
  const r=await pool.query<{version:number}>('SELECT version FROM market.schema_migrations ORDER BY version DESC LIMIT 1');
  return {enabled:true,ready:r.rows[0]?.version===1,schemaVersion:r.rows[0]?.version??null};
 }catch{return {enabled:true,ready:false,schemaVersion:null};}
}
export async function readCatalog(pool:Pool) {
 const r=await pool.query(`SELECT id,name,category,rarity,max_stack AS "maxStack",attributes,
  trade_enabled AS "tradeEnabled" FROM market.item_catalog WHERE active ORDER BY category,id LIMIT 200`);
 return {items:r.rows};
}
