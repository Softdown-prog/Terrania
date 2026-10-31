import assert from "node:assert/strict";
import { once } from "node:events";
import { setTimeout as sleep } from "node:timers/promises";
import WebSocket from "ws";
import { PROTOCOL_VERSION } from "../../src/shared/protocol.ts";
import { checkPublishedFrontend } from "../../scripts/check-published-frontend.mjs";
import { parsePresence } from "../../src/net/presence.ts";

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
await check("frontend Angular publicado em " + origin, async () => {
  const result = await checkPublishedFrontend({ origin, endpoint, get });
  console.log("  homepage:", result.homepage);
  console.log("  jogo:", result.game);
  console.log("  bundles publicados:", result.bundles, "· WSS configurado");
});
await check("health público da VPS", async () => {
  const health = JSON.parse(await get(api + "/health"));
  assert.equal(health.status, "ok");
  if (process.env.EXPECTED_SHA) assert.equal(health.revision, process.env.EXPECTED_SHA);
});
await check("presença pública com CORS e dados atuais", async () => {
  const res = await fetch(api + "/presence", { headers: { Origin: origin },
    signal: AbortSignal.timeout(10_000), cache: "no-store" });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("access-control-allow-origin"), origin);
  assert.equal(res.headers.get("cache-control"), "no-store");
  const presence = parsePresence(await res.json());
  assert.ok(presence, "presença pública inválida");
  const age = Date.now() - Date.parse(presence.updatedAt);
  assert.ok(age <= 15_000 && age >= -60_000, "presença pública desatualizada");
  console.log("  conexões ativas:", presence.online, "salas:", presence.rooms);
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
      messages.some(m => m.type === "welcome" && m.version === PROTOCOL_VERSION) &&
      messages.some(m => m.type === "state" && m.players?.length === 2)
    ), "dois jogadores no mesmo mundo, protocolo " + PROTOCOL_VERSION);
    const welcomes = streams.map(messages => messages.find(m => m.type === "welcome"));
    const presence = parsePresence(JSON.parse(await get(api + "/presence")));
    assert.ok(presence && presence.online >= 2 && presence.rooms >= 1,
      "presença pública não inclui as duas conexões confirmadas");
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
