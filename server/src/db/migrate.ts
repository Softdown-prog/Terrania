import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Pool } from 'pg';
import { databasePool } from './database.ts';
import { gameCatalog } from './catalog.ts';

export async function migrate(pool:Pool,directory=resolve('db/migrations')) {
 const sql=readFileSync(resolve(directory,'001_market.sql'),'utf8');
 const checksum=createHash('sha256').update(sql).digest('hex');
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(746572,72616)');
  await client.query('SET LOCAL ROLE terrania_owner');
  await client.query('CREATE SCHEMA IF NOT EXISTS market AUTHORIZATION terrania_owner');
  await client.query(`CREATE TABLE IF NOT EXISTS market.schema_migrations (
   version integer PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())`);
  const old=await client.query<{checksum:string}>('SELECT checksum FROM market.schema_migrations WHERE version=1');
  if(old.rows[0]&&old.rows[0].checksum!==checksum)throw Error('Applied migration checksum changed');
  if(!old.rowCount){
   await client.query(sql);
   await client.query('INSERT INTO market.schema_migrations(version,checksum) VALUES(1,$1)',[checksum]);
  }
  for(const item of gameCatalog())await client.query(`INSERT INTO market.item_catalog(id,name,category,rarity,max_stack,attributes)
   VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,category=EXCLUDED.category,
   max_stack=EXCLUDED.max_stack,attributes=EXCLUDED.attributes,updated_at=now()
   WHERE market.item_catalog.rarity='common' AND market.item_catalog.rarity=EXCLUDED.rarity`,
   [item.id,item.name,item.category,item.rarity,item.maxStack,JSON.stringify(item.attributes)]);
  await client.query('COMMIT');return {schemaVersion:1,catalogItems:gameCatalog().length};
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const pool=databasePool();if(!pool)throw Error('Migration requires enabled database');
 try{console.log(JSON.stringify(await migrate(pool)));}
 catch{console.error('Terrania migration failed; transaction rolled back');process.exitCode=1;}
 finally{await pool.end();}
}
