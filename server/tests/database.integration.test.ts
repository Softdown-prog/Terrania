import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {Pool} from 'pg';
import {migrate} from '../src/db/migrate.ts';
import {readCatalog} from '../src/db/database.ts';
import {gameCatalog} from '../src/db/catalog.ts';

const url=process.env.TERRANIA_TEST_ADMIN_URL;
test('PostgreSQL: migration, least privilege, vault invariants and concurrent atomic trades', {skip:!url},async()=>{
 const target=new URL(url!);assert.equal(target.pathname,'/postgres');
 assert.ok(['127.0.0.1','localhost'].includes(target.hostname),'integration tests only use the disposable local CI PostgreSQL');
 const admin=new Pool({connectionString:url});
 try{
  await admin.query('CREATE ROLE terrania_owner NOLOGIN');
  await admin.query("CREATE ROLE terrania_app LOGIN PASSWORD 'ci-runtime-only-password-123456'");
  await admin.query('CREATE DATABASE terrania_ci OWNER terrania_owner');
 }finally{await admin.end();}
 target.pathname='/terrania_ci';const owner=new Pool({connectionString:target.href,max:6});
 const appTarget=new URL(target);appTarget.username='terrania_app';appTarget.password='ci-runtime-only-password-123456';
 const app=new Pool({connectionString:appTarget.href});
 const q=async(sql:string,params:unknown[]=[])=>{
  const client=await owner.connect();try{await client.query('SET ROLE terrania_owner');return await client.query(sql,params);}finally{client.release();}
 };
 try{
  const dir=fileURLToPath(new URL('../db/migrations',import.meta.url));
  const expected=gameCatalog().length;
  assert.equal(expected,35,'25 itens existentes (incluindo 11 espadas) e dez raros do Sul');
  assert.equal((await migrate(owner,dir)).catalogItems,expected);
  assert.equal((await migrate(owner,dir)).schemaVersion,1);
  const published=(await readCatalog(app)).items;
  assert.equal(published.length,expected);
  assert.ok(published.some(i=>i.id==='sword-astral'),'migration must publish the level-100 sword');
  const rares=published.filter(i=>i.rarity==='rare');
  assert.equal(rares.length,10,'raros publicáveis no catálogo');
  assert.ok(rares.every(i=>!i.tradeEnabled),'sem negociação sem posse autenticada');
  assert.equal(published.find(i=>i.id==='rare-ruby-stinger')?.category,'collectible');
  for(const sql of ['SELECT * FROM market.accounts','CREATE TABLE public.bad(id int)',
   "UPDATE market.item_catalog SET name='bad'",'SELECT market.confirm_trade(gen_random_uuid(),gen_random_uuid(),1)'])
   await assert.rejects(app.query(sql),(e:unknown)=>(e as {code:string}).code==='42501');
  const a=randomUUID(),b=randomUUID(),outsider=randomUUID();
  for(const id of [a,b,outsider])await q("INSERT INTO market.accounts(id,auth_provider,auth_subject,display_name) VALUES($1::uuid,'ci',$1::text,'Fixture')",[id]);
  await q("INSERT INTO market.item_catalog(id,name,category,rarity,max_stack,trade_enabled) VALUES('ci-relic','CI relic','collectible','rare',1,true)");
  const item=async(ownerId:string)=>{const id=randomUUID();await q("INSERT INTO market.rare_items(id,catalog_id,owner_account_id) VALUES($1,'ci-relic',$2)",[id,ownerId]);return id;};
  const trade=async(ids:{id:string;from:string;version?:number}[])=>{
   const id=randomUUID();await q('INSERT INTO market.trades(id,proposer_account_id,recipient_account_id,idempotency_key) VALUES($1,$2,$3,$4)',[id,a,b,randomUUID()]);
   for(const i of ids)await q('INSERT INTO market.trade_items(trade_id,item_id,offered_by_account_id,expected_version) VALUES($1,$2,$3,$4)',[id,i.id,i.from,i.version??1]);
   return id;
  };
  const confirm=async(actor:string,id:string,version=1)=>(await q('SELECT market.confirm_trade($1,$2,$3) AS state',[actor,id,version])).rows[0].state;
  const i1=await item(a),i2=await item(b),t=await trade([{id:i1,from:a},{id:i2,from:b}]);
  await assert.rejects(confirm(outsider,t),(e:unknown)=>(e as {code:string}).code==='42501');
  assert.equal(await confirm(a,t),'pending');assert.equal((await q('SELECT owner_account_id FROM market.rare_items WHERE id=$1',[i1])).rows[0].owner_account_id,a);
  await assert.rejects(q('DELETE FROM market.trade_items WHERE trade_id=$1',[t]));
  assert.equal(await confirm(b,t),'completed');assert.equal(await confirm(b,t),'completed');
  assert.equal((await q('SELECT owner_account_id FROM market.rare_items WHERE id=$1',[i1])).rows[0].owner_account_id,b);
  assert.equal(Number((await q('SELECT count(*) FROM market.item_events WHERE trade_id=$1',[t])).rows[0].count),2);
  await assert.rejects(q('DELETE FROM market.item_events WHERE trade_id=$1',[t]),(e:unknown)=>(e as {code:string}).code==='23514');
  await assert.rejects(q("INSERT INTO market.rare_items(catalog_id,owner_account_id) VALUES('gel',$1)",[a]));
  const checked=await item(a);await q("UPDATE market.rare_items SET state='checked_out',checkout_token=gen_random_uuid(),version=version+1 WHERE id=$1",[checked]);
  const blocked=await trade([{id:checked,from:a,version:2}]);await confirm(a,blocked);
  await assert.rejects(confirm(b,blocked));assert.equal((await q('SELECT owner_account_id FROM market.rare_items WHERE id=$1',[checked])).rows[0].owner_account_id,a);
  const contested=await item(a),one=await trade([{id:contested,from:a}]),two=await trade([{id:contested,from:a}]);
  await confirm(a,one);await confirm(a,two);
  const results=await Promise.allSettled([confirm(b,one),confirm(b,two)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(Number((await q('SELECT count(*) FROM market.item_events WHERE item_id=$1',[contested])).rows[0].count),1);
 }finally{await app.end();await owner.end();}
});
