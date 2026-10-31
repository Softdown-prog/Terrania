import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import { Room } from './Room.ts';
import { isValidInput, PROTOCOL_VERSION, validRoom, type ServerMessage } from '../../src/shared/protocol.ts';

const port = Number(process.env.PORT ?? 8787);
const originList = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean)
  ?? ['http://localhost:5173', 'http://127.0.0.1:5173'];
if (process.env.NODE_ENV === 'production' && !process.env.ALLOWED_ORIGINS) {
  throw new Error('ALLOWED_ORIGINS é obrigatório em produção.');
}
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT inválida.');
const maxClients = 48;
const maxRooms = 8;
const maxRoomClients = 12;
const rooms = new Map<string, Room>();
const clients = new Map<WebSocket, { id: string; room: Room; alive: boolean; count: number; windowStart: number }>();
let guestNumber = 0;
const send = (socket: WebSocket, msg: ServerMessage): void => {
  if (socket.readyState !== WebSocket.OPEN || socket.bufferedAmount > 64_000) return;
  socket.send(JSON.stringify(msg));
};
const server = createServer((req, res) => {
  const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
  if (pathname === '/presence') {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Vary', 'Origin');
    const origin = req.headers.origin;
    if (origin && !originList.includes(origin)) { res.writeHead(403); res.end(); return; }
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
    if (req.method !== 'GET') { res.writeHead(405, { Allow: 'GET' }); res.end(); return; }
    const activeRooms = new Set<string>();
    let online = 0;
    for (const [socket, client] of clients) {
      if (socket.readyState !== WebSocket.OPEN) continue;
      online++;
      activeRooms.add(client.room.id);
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ online, rooms: activeRooms.size, updatedAt: new Date().toISOString(), scope: 'server' }));
  } else if (pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ status: 'ok', revision: /^[0-9a-f]{40}$/.test(process.env.GIT_SHA ?? '') ? process.env.GIT_SHA : null }));
  } else { res.writeHead(404); res.end(); }
});
const wss = new WebSocketServer({ noServer: true, maxPayload: 512, perMessageDeflate: false });
server.on('upgrade', (req, socket, head) => {
  const path = new URL(req.url ?? '/', 'http://localhost');
  const origin = req.headers.origin;
  if (path.pathname !== '/ws' || !origin || !originList.includes(origin)) {
    socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
    socket.destroy(); return;
  }
  const roomId = path.searchParams.get('room') ?? 'origins';
  if (!validRoom(roomId) || clients.size >= maxClients) {
    socket.write('HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\n\r\n');
    socket.destroy(); return;
  }
  let room = rooms.get(roomId);
  if (!room && rooms.size >= maxRooms) {
    socket.write('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n');
    socket.destroy(); return;
  }
  if (room && room.guests.size >= maxRoomClients) {
    socket.write('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n');
    socket.destroy(); return;
  }
  const selectedRoom = room ?? new Room(roomId);
  rooms.set(roomId, selectedRoom);
  wss.handleUpgrade(req, socket, head, ws => {
    const id = randomUUID();
    const name = 'Aventureiro ' + (++guestNumber);
    selectedRoom.add(id, name);
    clients.set(ws, { id, room: selectedRoom, alive: true, count: 0, windowStart: Date.now() });
    send(ws, { type: 'welcome', version: PROTOCOL_VERSION, id, room: roomId, seed: selectedRoom.seed });
    wss.emit('connection', ws, req);
  });
});
wss.on('connection', ws => {
  ws.on('pong', () => { const c = clients.get(ws); if (c) c.alive = true; });
  ws.on('message', (data, isBinary) => {
    const c = clients.get(ws);
    if (!c) return;
    const now = Date.now();
    if (now - c.windowStart >= 1000) { c.windowStart = now; c.count = 0; }
    if (++c.count > 35 || isBinary) { ws.close(1008, 'Limite do protocolo'); return; }
    let message: unknown;
    try { message = JSON.parse(data.toString('utf8')); }
    catch { ws.close(1007, 'JSON inválido'); return; }
    if (!isValidInput(message)) { ws.close(1008, 'Comando inválido'); return; }
    c.room.receiveInput(c.id, message.x, message.y, message.attack);
  });
  ws.on('close', () => {
    const c = clients.get(ws);
    if (!c) return;
    clients.delete(ws);
    c.room.remove(c.id);
    if (c.room.guests.size === 0) rooms.delete(c.room.id);
  });
  ws.on('error', () => { /* close lida com a liberação de recursos */ });
});
let previous = Date.now();
let broadcastClock = 0;
const gameLoop = setInterval(() => {
  const now = Date.now();
  const dt = Math.min(0.05, Math.max(0, (now - previous) / 1000));
  previous = now;
  for (const room of rooms.values()) room.tick(dt, now);
  broadcastClock += dt;
  if (broadcastClock < 0.10) return;
  broadcastClock = 0;
  for (const [ws, c] of clients) {
    const snap = c.room.snapshotFor(c.id);
    if (snap) send(ws, { type: 'state', ...snap });
  }
}, 50);
const heartbeat = setInterval(() => {
  for (const [ws, c] of clients) {
    if (!c.alive) { ws.terminate(); continue; }
    c.alive = false; ws.ping();
  }
}, 30_000);
function shutdown(): void {
  clearInterval(gameLoop); clearInterval(heartbeat);
  for (const ws of clients.keys()) ws.close(1001, 'Servidor reiniciando');
  wss.close(); server.close();
  setTimeout(() => process.exit(0), 2000).unref();
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
server.listen(port, '0.0.0.0', () => console.log('Terrania multiplayer escutando na porta ' + port));
