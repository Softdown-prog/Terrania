import test from 'node:test';import assert from 'node:assert/strict';
import {catalogEndpoint,catalogItems} from '../src/net/itemCatalog.ts';
test('catalog endpoint derives public API origin and rejects credentials or insecure external hosts',()=>{
 assert.equal(catalogEndpoint('wss://api-rpg.analysepro.com/ws'),'https://api-rpg.analysepro.com/market/catalog');
 assert.equal(catalogEndpoint('ws://127.0.0.1:18787/ws'),'http://127.0.0.1:18787/market/catalog');
 assert.equal(catalogEndpoint('http://external.example'),null);assert.equal(catalogEndpoint('https://user:password@external.example'),null);
});
test('catalog items must be real validated data, never a fallback or duplicated inventory',()=>{
 const item={id:'gel',name:'Gel de slime',category:'material',rarity:'common',maxStack:99,tradeEnabled:false};
 assert.equal(catalogItems({items:[item]}).length,1);assert.throws(()=>catalogItems({items:[item,item]}));
 assert.throws(()=>catalogItems({items:[{...item,maxStack:-1}]}));assert.throws(()=>catalogItems({ok:true}));
});
