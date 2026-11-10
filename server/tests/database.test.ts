import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import type {Pool} from 'pg';
import {gameCatalog} from '../src/db/catalog.ts';
import {WEAPON_IDS} from '../../src/engine/character/Weapons.ts';
import {databasePool,databaseStatus} from '../src/db/database.ts';
import {marketHttp} from '../src/db/http.ts';

test('catalogue exposes the eleven actual Knight swords alongside existing game items',()=>{
 const items=gameCatalog();assert.equal(items.length,35);
 assert.equal(new Set(items.map(i=>i.id)).size,35);
 const swordIds=items.filter(i=>i.category==='weapon').map(i=>i.id);
 assert.deepEqual(swordIds, WEAPON_IDS.map(id=>'sword-'+id));
 assert.ok(items.find(i=>i.id==='sword-forge'));
 assert.ok(items.find(i=>i.id==='sword-astral'));
 assert.ok(items.find(i=>i.id==='potion'));
 const rare=items.filter(i=>i.rarity==='rare');
 assert.equal(rare.length,10);
 assert.ok(rare.every(i=>i.category==='collectible'));
 assert.ok(rare.some(i=>i.id==='rare-sandworm-pearl'));
 assert.equal(items.some(i=>i.id==='ci-relic'),false,'no speculative collectible can enter the game catalogue');
});
test('database is opt-in and enabled configuration cannot silently use postgres/admin',async()=>{
 assert.equal(databasePool({}),null);assert.deepEqual(await databaseStatus(null),{enabled:false,ready:false,schemaVersion:null});
 assert.throws(()=>databasePool({TERRANIA_DB_ENABLED:'1'}),/PASSWORD_FILE/);
 const broken={query:async()=>{throw Error('secret internal failure');}} as unknown as Pool;
 assert.deepEqual(await databaseStatus(broken),{enabled:true,ready:false,schemaVersion:null});
});
test('HTTP catalogue is read-only, exact-origin scoped, cached and reports absence as unavailable',async t=>{
 let reads=0;const pool={query:async()=>{reads++;return {rows:[{id:'gel',name:'Gel de slime'}]};}} as unknown as Pool;
 const handler=marketHttp(pool,['https://rpg.example']);
 const server=createServer((req,res)=>void handler(req,res,'/market/catalog'));
 server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(()=>{server.closeAllConnections();server.close();});
 const addr=server.address();assert.ok(addr&&typeof addr==='object');const base='http://127.0.0.1:'+addr.port;
 assert.equal((await fetch(base,{headers:{Origin:'https://evil.example'}})).status,403);
 assert.equal((await fetch(base,{method:'POST'})).status,405);
 for(let i=0;i<2;i++){
  const r=await fetch(base,{headers:{Origin:'https://rpg.example'}});assert.equal(r.status,200);
  assert.equal(r.headers.get('access-control-allow-origin'),'https://rpg.example');assert.equal((await r.json()).items[0].id,'gel');
 }
 assert.equal(reads,1);
 const unavailable=marketHttp(null,[]);server.removeAllListeners('request');server.on('request',(req,res)=>void unavailable(req,res,'/market/catalog'));
 assert.equal((await fetch(base)).status,503);
});
