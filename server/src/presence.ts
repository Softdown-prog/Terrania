import type { IncomingMessage, ServerResponse } from 'node:http';

/** Identificador anônimo gerado pelo navegador a cada aba; nunca é gravado nem associado a IP ou conta. */
const SESSION_ID = /^[A-Za-z0-9_-]{16,64}$/;

export type BeatResult = 'ok' | 'invalid' | 'full';

/**
 * Conta quem está jogando agora sem WebSocket: cada aba envia um sinal periódico e o servidor
 * lembra o último instante de cada id por `ttlMs`. Fica só em memória, com tamanho limitado.
 * É um contador informativo: quem controla o navegador pode inventar ids até o limite.
 */
export class PresenceTracker {
  private readonly seen = new Map<string, number>();
  private lastPrune = 0;
  private readonly ttlMs: number;
  private readonly maxSessions: number;
  private readonly minIntervalMs: number;
  constructor(ttlMs = 45_000, maxSessions = 5_000, minIntervalMs = 5_000) {
    this.ttlMs = ttlMs;
    this.maxSessions = maxSessions;
    this.minIntervalMs = minIntervalMs;
  }

  beat(id: unknown, now = Date.now()): BeatResult {
    if (typeof id !== 'string' || !SESSION_ID.test(id)) return 'invalid';
    this.prune(now);
    const previous = this.seen.get(id);
    if (previous === undefined) {
      if (this.seen.size >= this.maxSessions) return 'full';
    } else if (now - previous < this.minIntervalMs) return 'ok'; // sinal repetido não renova o prazo
    this.seen.set(id, now);
    return 'ok';
  }

  count(now = Date.now()): number {
    this.prune(now);
    return this.seen.size;
  }

  private prune(now: number): void {
    // No máximo uma varredura por segundo (a contagem pode atrasar até 1 s); o mapa nunca passa de maxSessions.
    if (now - this.lastPrune < 1_000 && this.seen.size < this.maxSessions) return;
    this.lastPrune = now;
    for (const [id, at] of this.seen) if (now - at >= this.ttlMs) this.seen.delete(id);
  }
}

const MAX_BODY_BYTES = 256;

function readBody(req: IncomingMessage): Promise<string | null> {
  return new Promise(resolve => {
    let size = 0;
    const chunks: Buffer[] = [];
    let tooLarge = false;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (tooLarge) return; // o excesso é descartado sem ser guardado; requestTimeout limita a duração
      if (size > MAX_BODY_BYTES) { tooLarge = true; chunks.length = 0; resolve(null); return; }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', () => resolve(null));
  });
}

/** Rotas `GET /presence` (contagem) e `POST /presence/heartbeat` (sinal de uma aba jogando). */
export function presenceHttp(tracker: PresenceTracker, origins: readonly string[]) {
  return async (req: IncomingMessage, res: ServerResponse, path: string): Promise<boolean> => {
    if (path !== '/presence' && path !== '/presence/heartbeat') return false;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Vary', 'Origin');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const origin = req.headers.origin;
    if (origin && !origins.includes(origin)) { res.writeHead(403); res.end(); return true; }
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
    const json = (status: number, value: unknown): void => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(value));
    };

    if (path === '/presence') {
      if (req.method !== 'GET') { res.writeHead(405, { Allow: 'GET' }); res.end(); return true; }
      json(200, { online: tracker.count(), updatedAt: new Date().toISOString(), scope: 'server' });
      return true;
    }
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600',
      });
      res.end();
      return true;
    }
    // Sem Origin permitido o sinal é recusado: reduz abuso casual (não impede quem forja o cabeçalho).
    if (req.method !== 'POST') { res.writeHead(405, { Allow: 'POST, OPTIONS' }); res.end(); return true; }
    if (!origin) { res.writeHead(403); res.end(); return true; }
    const raw = await readBody(req);
    if (raw === null) { res.setHeader('Connection', 'close'); json(413, { error: 'Corpo grande demais.' }); return true; }
    let id: unknown;
    try { id = (JSON.parse(raw) as { id?: unknown }).id; } catch { id = undefined; }
    const result = tracker.beat(id);
    if (result === 'invalid') json(400, { error: 'Identificador inválido.' });
    else if (result === 'full') json(503, { error: 'Contador cheio no momento.' });
    else json(200, { online: tracker.count() });
    return true;
  };
}
