import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { setTimeout as pause } from "node:timers/promises";
import { WebSocket } from "ws";
import {
  PROTOCOL_VERSION,
  type ServerMessage,
} from "../../src/shared/protocol.ts";

test(
  "two websocket clients share authoritative movement and versioned state",
  { timeout: 10_000 },
  async () => {
    const probe = createServer();
    probe.listen(0, "127.0.0.1");
    await once(probe, "listening");
    const address = probe.address();
    assert.ok(address && typeof address === "object");
    const port = address.port;
    await new Promise<void>((resolve) => probe.close(() => resolve()));
    const child = spawn(
      process.execPath,
      [
        "--experimental-strip-types",
        new URL("../src/main.ts", import.meta.url).pathname,
      ],
      {
        env: {
          ...process.env,
          PORT: String(port),
          ALLOWED_ORIGINS: "http://localhost:5173",
          GIT_SHA: "a".repeat(40),
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    const sockets: WebSocket[] = [];
    async function until(predicate: () => boolean): Promise<void> {
      const start = Date.now();
      while (!predicate()) {
        if (Date.now() - start > 4_000)
          throw new Error("Timed out waiting for shared state");
        await pause(20);
      }
    }
    try {
      await once(child.stdout!, "data");
      assert.equal(
        (await fetch("http://127.0.0.1:" + port + "/health")).status,
        200,
      );
      assert.deepEqual(await (await fetch("http://127.0.0.1:" + port + "/health?deploy=verified")).json(),
        { status: "ok", revision: "a".repeat(40) });
      const streams: ServerMessage[][] = [[], []];
      for (let i = 0; i < 2; i++) {
        const ws = new WebSocket(
          "ws://127.0.0.1:" + port + "/ws?room=origins",
          { origin: "http://localhost:5173" },
        );
        sockets.push(ws);
        ws.on("message", (data) =>
          streams[i].push(JSON.parse(data.toString()) as ServerMessage),
        );
        await once(ws, "open");
      }
      await until(() =>
        streams.every(
          (messages) =>
            messages.some((m) => m.type === "welcome") &&
            messages.some((m) => m.type === "state" && m.players.length === 2),
        ),
      );
      const welcome = streams[0].find((m) => m.type === "welcome");
      assert.ok(welcome?.type === "welcome");
      assert.equal(welcome.version, PROTOCOL_VERSION);
      assert.equal(welcome.seed, 842136);
      for (let i = 0; i < 6; i++) {
        sockets[0].send(
          JSON.stringify({ type: "input", x: 1, y: 0, attack: i === 0 }),
        );
        await pause(50);
      }
      await until(() =>
        streams[1].some(
          (m) =>
            m.type === "state" &&
            m.players.some((p) => p.id === welcome.id && p.x > 32),
        ),
      );
      const states = streams[1].filter((m) => m.type === "state");
      assert.ok(
        states.every((state) =>
          state.players.every(
            (p) => Number.isFinite(p.x) && Number.isFinite(p.y) && p.hp === 100,
          ),
        ),
      );
    } finally {
      for (const ws of sockets) ws.terminate();
      child.kill("SIGTERM");
      await once(child, "exit");
    }
  },
);
