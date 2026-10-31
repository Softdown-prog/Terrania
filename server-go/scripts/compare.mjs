import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const expected=JSON.parse(readFileSync(process.argv[2],"utf8"));
const actual=JSON.parse(readFileSync(process.argv[3],"utf8"));
function compare(a,b,path) {
  if(typeof a==="number"&&typeof b==="number") {
    assert.ok(Math.abs(a-b)<=1e-7,path+": TypeScript="+a+" Go="+b);
    return;
  }
  if(Array.isArray(a)||Array.isArray(b)) {
    assert.ok(Array.isArray(a)&&Array.isArray(b),path+" formato diferente");
    assert.equal(a.length,b.length,path+" tamanho diferente");
    for(let i=0;i<a.length;i++) compare(a[i],b[i],path+"["+i+"]");
    return;
  }
  if(a&&b&&typeof a==="object"&&typeof b==="object") {
    assert.deepEqual(Object.keys(a).sort(),Object.keys(b).sort(),path+" chaves diferentes");
    for(const k of Object.keys(a)) compare(a[k],b[k],path+"."+k);
    return;
  }
  assert.deepEqual(a,b,path+": valor diferente");
}
compare(expected,actual,"parity");
console.log("Go e TypeScript: hash, seed, tiles, colisão, velocidades, jogador, combate e spawns equivalentes.");
