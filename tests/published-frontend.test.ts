import assert from 'node:assert/strict';
import test from 'node:test';
import { checkPublishedFrontend } from '../scripts/check-published-frontend.mjs';

const origin = 'https://game.example.test';
const endpoint = 'wss://api.example.test/ws';
const shell = (title: string) => `<title>${title}</title><base href="/"><app-root></app-root><script type="module" src="main.js"></script>`;
function fixture() {
  const files = new Map([
    ['/', shell('Terrania: Origins')], ['/jogar/', shell('Jogar · Terrania: Origins')],
    ['/main.js', 'import { a } from "./shared.js"; const load = () => import(`./game.js`);'],
    ['/shared.js', `export const url = '${endpoint}';`],
    ['/game.js', 'import "./shared.js"; import { start } from "./main.js";'],
  ]);
  const requests: string[] = [];
  const get = async (url: string) => {
    assert.equal(new URL(url).origin, origin, 'não buscar código externo');
    const path = new URL(url).pathname;
    requests.push(path);
    const content = files.get(path);
    assert.notEqual(content, undefined, 'asset inexistente: ' + path);
    return content!;
  };
  return { files, requests, get };
}

test('smoke Angular percorre imports estáticos/dinâmicos, respeita base e deduplica ciclos', async () => {
  const source = fixture();
  const result = await checkPublishedFrontend({ origin, endpoint, get: source.get });
  assert.equal(result.bundles, 3);
  assert.deepEqual(source.requests, ['/', '/jogar/', '/main.js', '/shared.js', '/game.js']);
});

test('smoke rejeita configuração WSS ausente, mesmo com HTML e assets disponíveis', async () => {
  const source = fixture(); source.files.set('/shared.js', 'export const url = "";');
  await assert.rejects(checkPublishedFrontend({ origin, endpoint, get: source.get }), /variável WSS ausente/);
});

test('smoke rejeita HTML antigo ou rota do jogo sem bundle compilado', async () => {
  const old = fixture(); old.files.set('/', '<title>Terrania</title><a href="/jogar/">Jogar</a>');
  await assert.rejects(checkPublishedFrontend({ origin, endpoint, get: old.get }), /Angular ausente/);
  const missing = fixture(); missing.files.set('/jogar/', '<title>Jogar · Terrania</title><app-root></app-root>');
  await assert.rejects(checkPublishedFrontend({ origin, endpoint, get: missing.get }), /nenhum bundle/);
});

test('smoke não busca imports de terceiros encontrados no bundle', async () => {
  const source = fixture(); source.files.set('/game.js', 'import("https://third-party.test/external.js");');
  assert.equal((await checkPublishedFrontend({ origin, endpoint, get: source.get })).bundles, 3);
  assert.ok(!source.requests.some(path => path.includes('external')));
});
