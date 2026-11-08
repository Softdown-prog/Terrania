import test from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { connect, createServer } from "node:net";
import { once } from "node:events";

const ORIGIN = "http://localhost:5173";

async function freePort(): Promise<number> {
  const probe = createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const address = probe.address();
  assert.ok(address && typeof address === "object");
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  return address.port;
}

async function startServer(): Promise<{ child: ChildProcess; base: string; port: number; exited: () => boolean }> {
  const port = await freePort();
  const child = spawn(process.execPath, ["--experimental-strip-types", new URL("../src/main.ts", import.meta.url).pathname], {
    env: { ...process.env, PORT: String(port), ALLOWED_ORIGINS: ORIGIN, GIT_SHA: "a".repeat(40) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let exited = false;
  child.once("exit", () => { exited = true; });
  await once(child.stdout!, "data");
  return { child, base: "http://127.0.0.1:" + port, port, exited: () => exited };
}

/** Bytes crus: `fetch` normaliza URLs que queremos malformadas. */
function rawRequest(port: number, request: string): Promise<string> {
  return new Promise((resolve) => {
    const socket = connect(port, "127.0.0.1", () => socket.write(request));
    let received = "";
    socket.on("data", (chunk) => { received += chunk.toString("latin1"); });
    socket.on("error", () => resolve(received));
    socket.on("close", () => resolve(received));
    setTimeout(() => socket.destroy(), 1_500).unref();
  });
}

const id = (n: number): string => "aba-de-teste-" + String(n).padStart(6, "0");
const beat = (base: string, body: unknown, origin: string | null = ORIGIN): Promise<Response> =>
  fetch(base + "/presence/heartbeat", { method: "POST", headers: { "Content-Type": "application/json", ...(origin ? { Origin: origin } : {}) },
    body: typeof body === "string" ? body : JSON.stringify(body) });

test("o servidor só atende HTTP: saúde, presença e catálogo; o WebSocket não existe mais", { timeout: 30_000 }, async () => {
  const { child, base, port, exited } = await startServer();
  try {
    assert.deepEqual(await (await fetch(base + "/health")).json(),
      { status: "ok", database: { enabled: false, ready: false, schemaVersion: null }, revision: "a".repeat(40) });
    assert.equal((await fetch(base + "/health?deploy=verified")).status, 200);
    assert.equal((await fetch(base + "/nao-existe")).status, 404);
    // A rota antiga de jogo foi retirada: um cliente antigo recebe 404, não um servidor de salas.
    const upgrade = await rawRequest(port, `GET /ws?room=origins HTTP/1.1\r\nHost: x\r\nOrigin: ${ORIGIN}\r\nUpgrade: websocket\r\n` +
      "Connection: Upgrade\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n\r\n");
    assert.match(upgrade, /^HTTP\/1\.1 (404|426)/);
    assert.equal(exited(), false);
  } finally { child.kill("SIGKILL"); }
});

test("URL malformada recebe 400 e não derruba o servidor", { timeout: 20_000 }, async () => {
  const { child, base, port, exited } = await startServer();
  try {
    for (const target of ["//", "//?a=1", "http://"]) {
      const response = await rawRequest(port, `GET ${target} HTTP/1.1\r\nHost: x\r\n\r\n`);
      assert.match(response, /^HTTP\/1\.1 400/, target);
    }
    assert.equal(exited(), false, "o processo precisa continuar vivo");
    assert.equal((await fetch(base + "/health")).status, 200);
  } finally { child.kill("SIGKILL"); }
});

test("presença: GET conta as abas que enviaram sinal e controla origem e método", { timeout: 30_000 }, async () => {
  const { child, base } = await startServer();
  try {
    const count = async (): Promise<{ online: number; scope: string; updatedAt: string }> =>
      (await fetch(base + "/presence")).json() as Promise<{ online: number; scope: string; updatedAt: string }>;
    assert.equal((await count()).online, 0);
    assert.equal((await fetch(base + "/presence", { headers: { Origin: "https://untrusted.test" } })).status, 403);
    assert.equal((await fetch(base + "/presence", { method: "POST" })).status, 405);
    const cors = await fetch(base + "/presence", { headers: { Origin: ORIGIN } });
    assert.equal(cors.headers.get("Access-Control-Allow-Origin"), ORIGIN);
    assert.equal(cors.headers.get("Cache-Control"), "no-store");

    assert.equal((await beat(base, { id: id(1) })).status, 200);
    assert.equal((await beat(base, { id: id(2) })).status, 200);
    assert.equal((await beat(base, { id: id(1) })).status, 200, "o mesmo id não conta duas vezes");
    const now = await count();
    assert.equal(now.online, 2);
    assert.equal(now.scope, "server");
    assert.ok(Math.abs(Date.now() - Date.parse(now.updatedAt)) < 5_000);
    assert.equal("rooms" in now, false, "não existem mais salas");
  } finally { child.kill("SIGKILL"); }
});

test("presença: o sinal recusa origem não permitida, ausência de origem, corpo inválido e corpo grande", { timeout: 30_000 }, async () => {
  const { child, base } = await startServer();
  try {
    assert.equal((await beat(base, { id: id(1) }, "https://untrusted.test")).status, 403);
    assert.equal((await beat(base, { id: id(1) }, null)).status, 403);
    assert.equal((await beat(base, { id: "curto" })).status, 400);
    assert.equal((await beat(base, "não é json")).status, 400);
    assert.equal((await beat(base, {})).status, 400);
    assert.equal((await beat(base, { id: id(1), lixo: "x".repeat(4_000) })).status, 413, "corpo acima do limite");
    assert.equal((await fetch(base + "/presence/heartbeat", { headers: { Origin: ORIGIN } })).status, 405);
    const preflight = await fetch(base + "/presence/heartbeat", { method: "OPTIONS", headers: { Origin: ORIGIN } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get("Access-Control-Allow-Origin"), ORIGIN);
    assert.equal(preflight.headers.get("Access-Control-Allow-Methods"), "POST");
    assert.equal((await (await fetch(base + "/presence")).json() as { online: number }).online, 0, "nada recusado foi contado");
  } finally { child.kill("SIGKILL"); }
});
