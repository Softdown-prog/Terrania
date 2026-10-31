import { Player } from "../../src/actors/Player.ts";
import { canMoveOnSeed, SeedCollision } from "../../src/world/collision.ts";
import { hash2, seedFromText } from "../../src/world/random.ts";
import { getTile } from "../../src/world/terrain.ts";
import { slimeSpawns } from "../../src/actors/Slime.ts";
import { canStrike } from "../../src/engine/combat.ts";

const seed=842136;
const world=new SeedCollision(seed);
const coords=[[0,0],[1,1],[-3,5],[12,-8],[40,18],[-19,-12],[200,50]];
const positions=[[16,16],[128,-16],[352,-72],[448,176],[800,800],[-176,-96],[10_000,0]];
const round=(n)=>Number(n.toFixed(8));
const player=new Player();
const moving=[];
for(let i=0;i<8;i++) {
  player.update(.05,{x:1,y:0},world);
  moving.push([round(player.x),round(player.y),round(player.vx),round(player.vy)]);
}
for(let i=0;i<5;i++) {
  player.update(.05,{x:0,y:0},world);
  moving.push([round(player.x),round(player.y),round(player.vx),round(player.vy)]);
}
const attacker=new Player();
attacker.faceX=1;attacker.faceY=0;
const result={
 seed:seedFromText("area-1"),
 hashes:[[-8,3,0],[0,0,seed],[12,9,seed],[-3,-4,seed]]
   .map(([x,y,s])=>round(hash2(x,y,s))),
 tiles:coords.map(([tx,ty])=>{const t=getTile(tx,ty,seed);
   return [t.ground,t.tree,t.rock];}),
 walkable:positions.map(([x,y])=>canMoveOnSeed(x,y,seed)),
 speeds:positions.map(([x,y])=>world.speedAt(x,y)),
 moving,
 strike:[canStrike(attacker,{x:28,y:16},world),canStrike(attacker,{x:4,y:16},world)],
 spawns:[[-1,1],[0,1],[2,2],[-2,-1]].map(([cx,cy])=>
   slimeSpawns(cx,cy,seed).map(m=>[m.id,m.x,m.y])),
};
console.log(JSON.stringify(result));
