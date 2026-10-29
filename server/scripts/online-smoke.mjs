import assert from "node:assert/strict";
import { once } from "node:events";
import { setTimeout as sleep } from "node:timers/promises";
import WebSocket from "ws";

// Read-only public smoke test. Two short-lived guests in a unique room.
const origin = "https://rpg.analysepro.com";
const api = "https://api-rpg.analysepro.com";
const endpoint = "wss://api-rpg.analysepro.com/ws";
const room = "probe-" + Date.now().toString(36);
let failures = 0;

async function check(label, fn) {
  try {
    await fn();
    console.log("PASS:", label);
  } catch (error) {
    failures++;
    console.error("FAIL:", label, error instanceof Error ? error.message : error);
  }
}
async function get(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000), cache: "no-store" });
  assert.equal(res.status, 200, url + " returned HTTP " + res.status);
  return await res.text();
}
async function until(predicate, label, ms = 8_000) {
  const deadline = Date.now() + ms;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error("timeout: " + label);
    await sleep(50);
  }
}
for (const publicOrigin of [origin]) {
  await check("frontend publicado em " + publicOrigin, async () => {
    const site = await get(publicOrigin + "/");
    const pageTitle = site.match(/<title>([^<]*)<\/title>/i)?.[1] ?? "(sem titulo)";
    console.log("  homepage:", pageTitle);
    assert.ok(site.includes("/jogar/"), "homepage ainda não é site de apresentação alfa 0.3");
    const game = await get(publicOrigin + "/jogar/");
    const gameTitle = game.match(/<title>([^<]*)<\/title>/i)?.[1] ?? "(sem titulo)";
    console.log("  jogo:", gameTitle);
    assert.ok(game.includes("ALFA 0.3"), "jogo publicado não é alfa 0.3");
    const assets = [...game.matchAll(/<script[^>]*src="([^"]+\.js)"/g)].map(m => m[1]);
    assert.ok(assets.length, "HTML do jogo não referencia bundle JS");
    const scripts = await Promise.all(assets.map(asset => get(new URL(asset, publicOrigin).href)));
    assert.ok(scripts.some(code => code.includes(endpoint)), "variável WSS não aparece no bundle publicado");
  });
}
await check("health público da VPS", async () => {
  assert.deepEqual(JSON.parse(await get(api + "/health")), { status: "ok" });
});
await check("dois jogadores e movimento autoritativo por WSS público", async () => {
  const streams = [[], []];
  const sockets = [];
  try {
    for (let i = 0; i < 2; i++) {
      const ws = new WebSocket(endpoint + "?room=" + room, {
        origin, handshakeTimeout: 9_000, perMessageDeflate: false,
      });
      sockets.push(ws);
      ws.on("message", data => {
        try { streams[i].push(JSON.parse(data.toString("utf8"))); }
        catch { /* fail on timeout if server sends invalid JSON */ }
      });
      await once(ws, "open");
    }
    await until(() => streams.every(messages =>
      messages.some(m => m.type === "welcome" && m.version === 2) &&
      messages.some(m => m.type === "state" && m.players?.length === 2)
    ), "dois jogadores no mesmo mundo, protocolo 2");
    const welcomes = streams.map(messages => messages.find(m => m.type === "welcome"));
    assert.equal(welcomes[0].room, room);
    assert.equal(welcomes[1].room, room);
    assert.equal(welcomes[0].seed, welcomes[1].seed);
    assert.notEqual(welcomes[0].id, welcomes[1].id);
    const start = streams[1].filter(m => m.type === "state").at(-1)
      .players.find(p => p.id === welcomes[0].id).x;
    for (let i = 0; i < 10; i++) {
      sockets[0].send(JSON.stringify({ type: "input", x: 1, y: 0, attack: false }));
      await sleep(70);
    }
    sockets[0].send(JSON.stringify({ type: "input", x: 0, y: 0, attack: false }));
    await until(() => streams[1].some(m =>
      m.type === "state" && m.players?.some(p => p.id === welcomes[0].id && p.x > start + 8)
    ), "jogador 2 observar movimento do jogador 1");
    console.log("  sala", room, "seed", welcomes[0].seed, "ambos presentes; movimento compartilhado.");
  } finally {
    sockets.forEach(ws => ws.terminate());
  }
});
if (failures) {
  console.error("Smoke público falhou em", failures, "verificação(ões).");
  process.exitCode = 1;
} else {
  console.log("Smoke público aprovado: frontend + HTTPS + 2 jogadores online.");
}
