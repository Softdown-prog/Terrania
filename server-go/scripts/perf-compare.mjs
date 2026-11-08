// CI-only HTTP smoke/load measurements after Terrania became solo.
// Do not claim equivalence of game engines: both services are measured only
// on their common /health contract. No game rooms, WebSocket or remote players.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { setTimeout as sleep } from "node:timers/promises";

const execAsync=promisify(execFile);
const entries=[
  {name:"go",container:"terrania-go-performance",port:18788},
  {name:"node",container:"terrania-node-performance",port:18787},
];
async function readHealth(entry,timeout=1500) {
  const begin=performance.now();
  const response=await fetch("http://127.0.0.1:"+entry.port+"/health",{
    signal:AbortSignal.timeout(timeout),headers:{"cache-control":"no-cache"}
  });
  assert.equal(response.status,200,entry.name+" HTTP status");
  const body=await response.json();
  assert.equal(body.status,"ok",entry.name+" health status");
  return performance.now()-begin;
}
async function waitHealth(entry) {
  for(let i=0;i<30;i++){
    try {await readHealth(entry);return;}
    catch {await sleep(300);}
  }
  throw Error(entry.name+" did not become healthy");
}
async function dockerSample(){
  const {stdout}=await execAsync("docker",[
    "stats","--no-stream","--format","{{json .}}",
    ...entries.map(e=>e.container)
  ],{encoding:"utf8",timeout:12000,maxBuffer:256*1024});
  const rows=stdout.trim().split("\n").filter(Boolean).map(x=>JSON.parse(x));
  assert.equal(rows.length,entries.length,"docker stats containers");
  return rows.map(r=>({container:r.Name,CPU:r.CPUPerc,memory:r.MemUsage}));
}
function percentile(xs,p){
  if(xs.length===0)return null;
  const a=[...xs].sort((x,y)=>x-y),i=Math.max(0,Math.ceil(a.length*p)-1);
  return Number(a[i].toFixed(2));
}
await Promise.all(entries.map(waitHealth));
// 12 independent HTTP clients per service, 10 fixed iterations each; both
// services start at once and share the same CPU quotas in Docker.
async function workload(entry){
  const samples=[];
  const clients=Array.from({length:12},async()=>{
    for(let k=0;k<10;k++){
      samples.push(await readHealth(entry,3000));
      await sleep(70);
    }
  });
  await Promise.all(clients);
  assert.equal(samples.length,120,entry.name+" health samples");
  return {engine:entry.name,clients:12,requests:samples.length,
    failures:0,latencyP50ms:percentile(samples,.5),
    latencyP95ms:percentile(samples,.95)};
}
async function resources(){
  const samples=[];
  for(let i=0;i<3;i++){samples.push(await dockerSample());await sleep(450);}
  return samples;
}
const [workloads,dockerSamples]=await Promise.all([
  Promise.all(entries.map(workload)),resources()
]);
const result={
  context:"GitHub Actions local Docker only; NOT VPS or public-game performance.",
  workload:"Concurrent HTTP GET /health only; not game simulation or WebSocket.",
  version:2,workloads,dockerSamples
};
process.stdout.write("CI_PERFORMANCE_RESULT="+JSON.stringify(result)+"\n");
