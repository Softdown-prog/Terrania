#!/usr/bin/env node
/**
 * Pinned, disposable integration of Terrania's real world generator with SAC.
 * Only this isolated probe executes game source; the static SAC scanner does not.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assessProceduralGridSamples } from '../../.sac-tool/packages/sac-multistack/src/procedural-properties.mjs';
import { getTile } from '../../.sac-target/terrania/src/world/terrain.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const game = path.join(root, '.sac-target/terrania');
const sac = path.join(root, '.sac-tool');
const gameSha='65eab09b37a58e71023aa68c106d7ee78d2569f8';
const sacSha='98ca6986b79fa81f6a1595fb8a6d4950c757fe86';
const git = dir => execFileSync('git',['-C',dir,'rev-parse','HEAD'],{
  encoding:'utf8',timeout:10000,stdio:['ignore','pipe','pipe']
}).trim();
assert.equal(git(game),gameSha,'game-revision-mismatch');
assert.equal(git(sac),sacSha,'sac-revision-mismatch');

const width=32,height=32;
const kinds={grass:1,forest:2,path:3,sand:4,water:5};
function generate(seed) {
  const grid=new Uint8Array(width*height);
  for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
    const tile=getTile(x-16,y-16,seed);
    assert.ok(Object.hasOwn(kinds,tile.ground),'unexpected-ground');
    grid[y*width+x]=tile.tree?6:tile.rock?7:kinds[tile.ground];
  }
  return grid;
}
const seeds=[0,842136,12345,4294967295];
const samples=seeds.flatMap(seed=>[
  {seed,trial:0,grid:generate(seed)},
  {seed,trial:1,grid:generate(seed)}
]);
const positive=assessProceduralGridSamples({
  width,height,maxTile:7,samples,requireSeedDiversity:true
});
const altered=samples.map(x=>({...x,grid:new Uint8Array(x.grid)}));
altered[1].grid[0]=altered[1].grid[0]===1?2:1;
const negative=assessProceduralGridSamples({
  width,height,maxTile:7,samples:altered
});
assert.equal(positive.status,'pass',JSON.stringify(positive));
assert.equal(negative.status,'fail',JSON.stringify(negative));
assert.equal(negative.code,'same-seed-nondeterministic');
const hashes=Object.fromEntries(seeds.map(seed=>[
  String(seed),createHash('sha256').update(samples.find(x=>x.seed===seed).grid).digest('hex')
]));
const report={
  schema_version:1,kind:'terrania-real-terrain-sac-properties',
  game_sha:gameSha,sac_sha:sacSha,revisions_verified:true,
  scope:'32x32 sampled tile grid at coordinates [-16,15] on each axis',
  real_game_terrain_function_executed:true,
  seeds_checked:seeds.length,repeated_samples:samples.length,
  check:positive,negative_control:{status:negative.status,code:negative.code},
  tile_digest_by_seed:hashes,
  game_canvas_pixels_verified:false,
  gameplay_verified:false,
  deployment_authorized:false
};
console.log(JSON.stringify(report,null,2));
