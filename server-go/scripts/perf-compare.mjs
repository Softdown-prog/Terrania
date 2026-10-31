// Controlled CI-only load measurement. Does not touch VPS or public players.
// Both servers get 12 clients, same input frequency, identical CPU quota.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import WebSocket from "../../server/node_modules/ws/index.js";

const origin = "https://rpg.analysepro.com";
const entries = [
  { name:"go",container:"terrania-go-performance",port:18788 },
  { name:"node",container:"terrania-node-performance",port:18787 },
];
const sockets = [];
const stats = Object.fromEntries(entries.map(e=>[e.name,{welcome:0,snapshots:0,gaps:[],last:0,messages:0}]));
async function waitHealth(entry) {
  for(let i=0;i<25;i++){
    try {
      const r=await fetch("http://127.0.0.1:"+entry.port+"/health",{signal:AbortSignal.timeout(1500)});
      if(r.ok) {
        const status=await r.json();
        assert.equal(status.status,"ok");
        return;
      }
    } catch {}
    await sleep(300);
  }
  throw Error(entry.name+" did not become healthy");
}
async function connect(entry,i) {
  return new Promise((resolve,reject)=>{
    const room="perf-ci-"+entry.name;
    const ws = new WebSocket("ws://127.0.0.1:"+entry.port+"/ws?room="+room,{
      origin,handshakeTimeout:5000,perMessageDeflate:false,
    });
    sockets.push(ws);
    ws.once("open",()=>resolve(ws));
    ws.once("error",reject);
    const sample=stats[entry.name];
    ws.on("message",data=>{
      const message=JSON.parse(data.toString());
      sample.messages++;
      if(message.type==="welcome"){
        assert.equal(message.version,3);
        sample.welcome++;
      }
      if(message.type==="state"){
        sample.snapshots++;
        const now=performance.now();
        // Gaps for each client, not one global cross-client timer.
        const prev=sample["last"+i]||0;
        if(prev>0)sample.gaps.push(now-prev);
        sample["last"+i]=now;
        assert.ok(message.players.length>0);
      }
    });
  });
}
function sampleDockerStats() {
  const proc=spawnSync("docker",[
    "stats","--no-stream","--format","{{json .}}",
    "terrania-go-performance","terrania-node-performance",
  ],{encoding:"utf8",timeout:12000});
  if(proc.status!==0)throw Error("docker stats failed: "+proc.stderr.slice(0,300));
  const rows=proc.stdout.trim().split("\n").map(x=>JSON.parse(x));
  if(rows.length!==2)throw Error("expected two docker stats rows");
  return rows.map(r=>({container:r.Name,CPU:r.CPUPerc,memory:r.MemUsage,netIO:r.NetIO}));
}
const intervals=[];
try {
  for(const entry of entries)await waitHealth(entry);
  for(const entry of entries) {
    for(let i=0;i<12;i++)await connect(entry,i);
  }
  // Run both servers simultaneously under identical input rate.
  const clients=sockets;
  intervals.push(setInterval(()=>{
    for(const ws of clients) {
      if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({type:"input",x:1,y:0,attack:false}));
    }
  },100));
  await sleep(1200);
  const samples=[];
  for(let i=0;i<3;i++) {
    samples.push(sampleDockerStats());
    await sleep(500);
  }
  for(const item of entries){
    const s=stats[item.name];
    assert.equal(s.welcome,12,item.name+" welcome");
    assert.ok(s.snapshots>=100,item.name+" expected snapshots");
  }
  const percentile=(xs,p)=>{
    if(xs.length===0)return null;
    const sorted=[...xs].sort((a,b)=>a-b);
    return Number(sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1)].toFixed(2));
  };
  const result={
    context:"GitHub Actions runner, Docker limits 0.5 CPU, 12 clients/server, ~10 inputs/s/client. NOT VPS measurements.",
    workloads:entries.map(e=>({engine:e.name,clients:12,welcomes:stats[e.name].welcome,
      snapshots:stats[e.name].snapshots,snapshotGapP50ms:percentile(stats[e.name].gaps,.5),
      snapshotGapP95ms:percentile(stats[e.name].gaps,.95)})),
    dockerSamples:samples
  };
  console.log("CI_PERFORMANCE_RESULT="+JSON.stringify(result));
} finally {
  for(const it of intervals)clearInterval(it);
  for(const ws of sockets)ws.terminate();
}
