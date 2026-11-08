import test from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { connect, createServer } from "node:net";
import { once } from "node:events";
import { WebSocket } from "ws";

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

async function startServer(): Promise<{ child: ChildProcess; port: number; exited: () => boolean }> {
  const port = await freePort();
  const child = spawn(
    process.execPath,
    ["--experimental-strip-types", new URL("../src/main.ts", import.meta.url).pathname],
    { env: { ...process.env, PORT: String(port), ALLOWED_ORIGINS: ORIGIN }, stdio: ["ignore", "pipe", "pipe"] },
  );
  let exited = false;
  child.once("exit", () => { exited = true; });
  await once(child.stdout!, "data");
  return { child, port, exited: () => exited };
}

/** Envia bytes crus: o `fetch` e o `WebSocket` normalizam URLs e chaves que queremos malformadas. */
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

const badHandshake = (room: string): string =>
  `GET /ws?room=${room} HTTP/1.1\r\nHost: x\r\nOrigin: ${ORIGIN}\r\nUpgrade: websocket\r\n` +
  "Connection: Upgrade\r\nSec-WebSocket-Key: invalida\r\nSec-WebSocket-Version: 13\r\n\r\n";

test("URL malformada recebe 400 e não derruba o servidor", { timeout: 20_000 }, async () => {
  const { child, port, exited } = await startServer();
  try {
    for (const target of ["//", "//?a=1", "http://"]) {
      const http = await rawRequest(port, `GET ${target} HTTP/1.1\r\nHost: x\r\n\r\n`);
      assert.match(http, /^HTTP\/1\.1 400/, `HTTP ${target}`);
      const upgrade = await rawRequest(port,
        `GET ${target} HTTP/1.1\r\nHost: x\r\nOrigin: ${ORIGIN}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n`);
      assert.match(upgrade, /^HTTP\/1\.1 (400|403)/, `upgrade ${target}`);
    }
    assert.equal(exited(), false, "o processo precisa continuar vivo");
    assert.equal((await fetch(`http://127.0.0.1:${port}/health`)).status, 200);
  } finally { child.kill("SIGKILL"); }
});

test("handshake rejeitado não deixa salas vazias consumindo o limite", { timeout: 30_000 }, async () => {
  const { child, port } = await startServer();
  try {
    // O limite é de 8 salas: nove nomes distintos esgotariam o mapa se a sala fosse criada antes do handshake.
    for (let i = 0; i < 9; i++)
      assert.match(await rawRequest(port, badHandshake(`vazia${i}`)), /^HTTP\/1\.1 400/);
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?room=real`, { origin: ORIGIN });
    const [first] = await Promise.race([
      once(ws, "message"),
      once(ws, "unexpected-response").then(([, response]) => { throw new Error("recusado com " + response.statusCode); }),
    ]);
    assert.equal(JSON.parse(String(first)).type, "welcome");
    const presence = await (await fetch(`http://127.0.0.1:${port}/presence`)).json() as { rooms: number };
    assert.equal(presence.rooms, 1);
    ws.close();
  } finally { child.kill("SIGKILL"); }
});
