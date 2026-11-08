import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { setTimeout as pause } from "node:timers/promises";
import { WebSocket } from "ws";
import { canMoveOnSeed } from "../../src/world/collision.ts";
import { chunkOf } from "../../src/world/terrain.ts";
import {
  PROTOCOL_VERSION,
  type ServerMessage,
} from "../../src/shared/protocol.ts";

test(
  "two websocket clients share authoritative movement and versioned state",
  { timeout: 30_000 },
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
    async function until(predicate: () => boolean, timeout = 4_000): Promise<void> {
      const start = Date.now();
      while (!predicate()) {
        if (Date.now() - start > timeout)
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
      const presenceUrl = "http://127.0.0.1:" + port + "/presence";
      const presence = async () => (await (await fetch(presenceUrl)).json()) as { online: number; rooms: number; scope: string; updatedAt: string };
      assert.equal((await presence()).online, 0);
      assert.equal((await fetch(presenceUrl, { headers: { Origin: "https://untrusted.test" } })).status, 403);
      assert.equal((await fetch(presenceUrl, { method: "POST" })).status, 405);
      const cors = await fetch(presenceUrl, { headers: { Origin: "http://localhost:5173" } });
      assert.equal(cors.headers.get("Access-Control-Allow-Origin"), "http://localhost:5173");
      assert.equal(cors.headers.get("Cache-Control"), "no-store");
      const streams: ServerMessage[][] = [[], []];
      for (let i = 0; i < 2; i++) {
        const ws = new WebSocket(
          "ws://127.0.0.1:" + port + "/ws?room=origins" + (i === 0 ? "&movement=tiles&combat=target&progression=xp&inventory=loot&equipment=forge" : ""),
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
      const connected = await presence();
      assert.equal(connected.online, 2);
      assert.equal(connected.rooms, 1);
      assert.equal(connected.scope, "server");
      assert.ok(Number.isFinite(Date.parse(connected.updatedAt)));
      assert.ok(welcome?.type === "welcome");
      assert.equal(welcome.version, PROTOCOL_VERSION);
      assert.equal(welcome.seed, 842136);
      assert.equal(welcome.movement, "tiles");
      assert.equal(welcome.combat, "target");
      assert.equal(welcome.inventory, "loot");
      const legacy = streams[1].find((m) => m.type === "welcome");
      assert.ok(legacy?.type === "welcome");
      assert.equal(legacy.movement, undefined);
      assert.equal(legacy.combat, undefined);
      assert.equal(legacy.inventory, undefined);
      assert.ok(streams[0].some(m => m.type === "state" &&
        m.players.some(p => p.id === welcome.id && p.experience === 0) &&
        m.inventory?.loadout?.equipped === "starter" && m.inventory.loadout.forged === false));
      sockets[0].send(JSON.stringify({ type: "inventory", action: "trade-potion", requestId: 1,
        x: 448, y: 250, gel: 99 }));
      await until(() => streams[0].some(m => m.type === "state" && m.inventory?.gel === 0 &&
        m.inventory.receipt?.requestId === 1 && m.inventory.receipt.outcome === "too-far"));
      sockets[0].send(JSON.stringify({ type: "inventory", action: "buy-sword", requestId: 2, x: 538, y: 32, gel: 99 }));
      await until(() => streams[0].some(m => m.type === "state" && m.inventory?.gel === 0 &&
        m.inventory.receipt?.requestId === 2 && m.inventory.receipt.outcome === "too-far-from-forge"));
      sockets[0].send(JSON.stringify({ type: "input", x: 0, y: 0, attack: false, experience: 3000 }));
      sockets[0].send(JSON.stringify({ type: "walk", target: { x: 78, y: 18 } }));
      sockets[1].send(JSON.stringify({ type: "input", x: 1, y: 0, attack: false }));
      await until(() =>
        streams[1].some(
          (m) =>
            m.type === "state" &&
            m.players.some((p) => p.id === welcome.id && p.x === 80 && p.y === 16) &&
            m.players.some((p) => p.id === legacy.id && p.x > 16),
        ),
      );
      await until(() => streams[0].some(m => m.type === "state" && m.walkTarget === null &&
        m.players.some(p => p.id === welcome.id && p.x === 80 && p.y === 16)));
      const states = streams[1].filter((m) => m.type === "state");
      assert.ok(
        states.every((state) =>
          state.players.every(
            (p) => Number.isFinite(p.x) && Number.isFinite(p.y) && p.hp === 100,
          ),
        ),
      );
      const target = "0,-1,0";
      await until(() => streams[0].some(m => m.type === "state" && m.mobs.some(mob => mob.id === target)));
      sockets[0].send(JSON.stringify({ type: "target", id: target }));
      await until(() => streams[0].some(m => m.type === "state" && m.focus?.id === target));
      await until(() => streams[1].some(m => m.type === "state" && m.focus === undefined &&
        m.players.some(p => p.id === welcome.id && p.kills === 1 && p.experience === undefined) &&
        !m.mobs.some(mob => mob.id === target)), 8_000);
      await until(() => streams[0].some(m => m.type === "state" &&
        m.players.some(p => p.id === welcome.id && p.kills === 1 && p.experience === 10) &&
        m.inventory && m.inventory.gel + m.inventory.drops.length === 1));
      assert.ok(streams[1].every(m => m.type !== "state" || m.inventory === undefined));
      // QA-BOT-001 usa o transporte WebSocket verdadeiro na sala isolada do teste:
      // quatro quadrantes do mundo, sem teleporte e sem ler dados privados de terceiros.
      const patrolRegions = new Set<string>();
      const patrolGoals = [
        { x: -16, y: 16 }, { x: -16, y: -16 },
        { x: 16, y: -16 }, { x: 16, y: 16 },
      ];
      for (const goal of patrolGoals) {
        const after = streams[0].length;
        sockets[0].send(JSON.stringify({ type: "walk", target: goal }));
        await until(() => streams[0].slice(after).some(state => {
          if (state.type !== "state") return false;
          const hero = state.players.find(p => p.id === welcome.id);
          if (!hero) return false;
          patrolRegions.add(chunkOf(hero.x) + "," + chunkOf(hero.y));
          assert.ok(canMoveOnSeed(hero.x, hero.y, 842136),
            "snapshot QA em tile de colisão");
          return Math.hypot(hero.x - goal.x, hero.y - goal.y) <= 1.5;
        }), 6_000);
      }
      assert.ok(patrolRegions.size >= 3, "QA bot percorreu regiões distintas pela rede");
      assert.ok(streams[1].every(m => m.type !== "state" || m.inventory === undefined),
        "informações privadas nunca chegam ao observador");
      sockets[1].terminate();
      let count = await presence();
      for (let i = 0; i < 40 && count.online !== 1; i++) { await pause(20); count = await presence(); }
      assert.equal(count.online, 1);
      sockets[0].terminate();
      for (let i = 0; i < 40 && count.online !== 0; i++) { await pause(20); count = await presence(); }
      assert.equal(count.online, 0);
      assert.equal(count.rooms, 0);
      // Reconnecting after the last guest has left starts a fresh room session;
      // it must never inherit a previous guest's movement, loot or identity.
      const resumed: ServerMessage[] = [];
      const rejoined = new WebSocket(
        "ws://127.0.0.1:" + port +
          "/ws?room=origins&movement=tiles&combat=target&progression=xp&inventory=loot&equipment=forge&gear=slots",
        { origin: "http://localhost:5173" },
      );
      sockets.push(rejoined);
      rejoined.on("message", data =>
        resumed.push(JSON.parse(data.toString()) as ServerMessage));
      await once(rejoined, "open");
      await until(() => resumed.some(m => m.type === "welcome") &&
        resumed.some(m => m.type === "state"));
      const newWelcome = resumed.find(m => m.type === "welcome");
      assert.ok(newWelcome?.type === "welcome");
      assert.notEqual(newWelcome.id, welcome.id);
      assert.equal(newWelcome.seed, welcome.seed);
      const fresh = resumed.find(m => m.type === "state");
      assert.ok(fresh?.type === "state");
      const newHero = fresh.players.find(hero => hero.id === newWelcome.id);
      assert.ok(newHero);
      assert.deepEqual({ x: newHero.x, y: newHero.y, kills: newHero.kills, experience: newHero.experience },
        { x: 16, y: 16, kills: 0, experience: 0 });
      assert.equal(fresh.walkTarget, null);
      assert.equal(fresh.inventory?.gel, 0);
      assert.equal(fresh.inventory?.loadout?.equipped, "starter");
      assert.equal((await presence()).online, 1);
      rejoined.terminate();
      let emptied = await presence();
      for (let i = 0; i < 40 && emptied.online !== 0; i++) {
        await pause(20);
        emptied = await presence();
      }
      assert.equal(emptied.online, 0);
      assert.equal(emptied.rooms, 0);
    } finally {
      for (const ws of sockets) ws.terminate();
      child.kill("SIGTERM");
      await once(child, "exit");
    }
  },
);
