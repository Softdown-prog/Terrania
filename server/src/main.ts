import { createServer } from 'node:http';
import { databasePool, databaseStatus } from './db/database.ts';
import { marketHttp } from './db/http.ts';
import { PresenceTracker, presenceHttp } from './presence.ts';

// O jogo é solo e offline. O servidor existe só para o contador de quem está jogando
// (/presence), o catálogo de itens (/market) e a saúde do serviço (/health). Não há salas,
// simulação nem WebSocket: ver docs/adr/0012-retirada-do-multiplayer.md.
const port = Number(process.env.PORT ?? 8787);
const originList = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean)
  ?? ['http://localhost:5173', 'http://127.0.0.1:5173'];
if (process.env.NODE_ENV === 'production' && !process.env.ALLOWED_ORIGINS) {
  throw new Error('ALLOWED_ORIGINS é obrigatório em produção.');
}
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT inválida.');

/** `new URL` lança para entradas como `//`; uma requisição hostil não pode derrubar o processo. */
const parseRequestUrl = (raw: string | undefined): URL | null => {
  try { return new URL(raw ?? '/', 'http://localhost'); } catch { return null; }
};

const database = databasePool();
const market = marketHttp(database, originList);
const presence = presenceHttp(new PresenceTracker(), originList);

const server = createServer(async (req, res) => {
  try {
    const requestUrl = parseRequestUrl(req.url);
    if (!requestUrl) { res.writeHead(400); res.end(); return; }
    const pathname = requestUrl.pathname;
    if (await market(req, res, pathname)) return;
    if (await presence(req, res, pathname)) return;
    if (pathname === '/health' && req.method === 'GET') {
      const state = await databaseStatus(database);
      const healthy = !state.enabled || state.ready;
      res.writeHead(healthy ? 200 : 503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ status: healthy ? 'ok' : 'unavailable', database: state,
        revision: /^[0-9a-f]{40}$/.test(process.env.GIT_SHA ?? '') ? process.env.GIT_SHA : null }));
    } else { res.writeHead(404); res.end(); }
  } catch (error) {
    // Uma falha em uma rota vira 500 daquela requisição; não derruba o processo.
    console.error('Falha ao atender a requisição', error);
    if (!res.headersSent) res.writeHead(500);
    res.end();
  }
});
// Conexões que não terminam o cabeçalho ou ficam ociosas não podem segurar o servidor.
server.headersTimeout = 10_000;
server.requestTimeout = 15_000;

function shutdown(): void {
  void database?.end().catch(() => {});
  server.close();
  setTimeout(() => process.exit(0), 2000).unref();
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
server.listen(port, '0.0.0.0', () => console.log('Terrania servidor (presença, catálogo, saúde) na porta ' + port));
