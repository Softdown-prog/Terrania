import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { checkPublishedFrontend } from "../../scripts/check-published-frontend.mjs";
import { parsePresence } from "../../src/net/presence.ts";

// Smoke público somente de leitura e sem WebSocket: o jogo é solo; o servidor só informa saúde,
// conta quem está jogando (/presence) e serve o catálogo. O sinal usa um id aleatório que expira
// sozinho em ~45 s, então não deixa resíduo.
const origin = "https://rpg.analysepro.com";
const api = "https://api-rpg.analysepro.com";
const endpoint = "wss://api-rpg.analysepro.com/ws"; // valor publicado em VITE_MULTIPLAYER_URL (nome histórico)
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
const presenceNow = async () => {
  const res = await fetch(api + "/presence", { headers: { Origin: origin }, signal: AbortSignal.timeout(10_000), cache: "no-store" });
  assert.equal(res.status, 200);
  const presence = parsePresence(await res.json());
  assert.ok(presence, "presença pública inválida");
  return { res, presence };
};

await check("frontend Angular publicado em " + origin, async () => {
  const result = await checkPublishedFrontend({ origin, endpoint, get });
  console.log("  homepage:", result.homepage);
  console.log("  jogo:", result.game);
  console.log("  bundles publicados:", result.bundles);
});
await check("health público da VPS", async () => {
  const health = JSON.parse(await get(api + "/health"));
  assert.equal(health.status, "ok");
  if (process.env.EXPECTED_SHA) assert.equal(health.revision, process.env.EXPECTED_SHA);
});
await check("presença pública com CORS e dados atuais", async () => {
  const { res, presence } = await presenceNow();
  assert.equal(res.headers.get("access-control-allow-origin"), origin);
  assert.equal(res.headers.get("cache-control"), "no-store");
  const age = Date.now() - Date.parse(presence.updatedAt);
  assert.ok(age <= 15_000 && age >= -60_000, "presença pública desatualizada");
  assert.equal("rooms" in presence, false, "o servidor não deve mais informar salas");
  console.log("  pessoas jogando agora:", presence.online);
});
await check("sinal anônimo de presença é aceito e contado", async () => {
  const preflight = await fetch(api + "/presence/heartbeat", { method: "OPTIONS", headers: { Origin: origin },
    signal: AbortSignal.timeout(10_000) });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), origin);
  const before = (await presenceNow()).presence.online;
  const id = randomBytes(16).toString("hex");
  const res = await fetch(api + "/presence/heartbeat", { method: "POST", signal: AbortSignal.timeout(10_000),
    headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
  assert.equal(res.status, 200, "sinal recusado: HTTP " + res.status);
  const deadline = Date.now() + 8_000;
  let after = before;
  while (after < before + 1 && Date.now() < deadline) { await sleep(300); after = (await presenceNow()).presence.online; }
  assert.ok(after >= before + 1, "o sinal não apareceu na contagem (" + before + " → " + after + ")");
});
await check("a rota de jogo por WebSocket foi retirada", async () => {
  const res = await fetch(api + "/ws", { headers: { Origin: origin }, signal: AbortSignal.timeout(10_000) });
  assert.equal(res.status, 404);
});
if (failures) {
  console.error("Smoke público falhou em", failures, "verificação(ões).");
  process.exitCode = 1;
} else {
  console.log("Smoke público aprovado: frontend, HTTPS, presença e sinal anônimo.");
}
