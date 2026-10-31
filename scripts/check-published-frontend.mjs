import assert from 'node:assert/strict';

/** Check the published Angular entry and its actual ESM graph, including lazy
 * chunks. Templates and public runtime configuration no longer live in HTML. */
export async function checkPublishedFrontend({ origin, endpoint, get }) {
  const site = new URL(origin);
  const pending = [];
  const seen = new Set();
  const code = [];
  const titles = [];
  let bytes = 0;
  for (const path of ['/', '/jogar/']) {
    const page = new URL(path, site);
    const html = await get(page.href);
    assert.match(html, /<app-root\b/, `${path}: aplicação Angular ausente`);
    const title = html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? '';
    assert.match(title, /Terrania/i, `${path}: título incorreto`);
    if (path === '/jogar/') assert.match(title, /Jogar/i, 'rota do jogo incorreta');
    titles.push(title);
    const base = new URL(html.match(/<base\b[^>]*href=["']([^"']+)["']/i)?.[1] ?? page.href, page);
    assert.equal(base.origin, site.origin, 'base da aplicação fora do domínio público');
    const entries = [...html.matchAll(/<script\b[^>]*src=["']([^"']+\.js(?:\?[^"']*)?)["']/gi)];
    assert.ok(entries.length, `${path}: nenhum bundle JavaScript publicado`);
    for (const entry of entries) pending.push(new URL(entry[1], base));
  }
  while (pending.length) {
    const asset = pending.shift();
    asset.hash = '';
    assert.equal(asset.origin, site.origin, 'bundle fora do domínio público');
    if (seen.has(asset.href)) continue;
    assert.ok(seen.size < 32, 'grafo de bundles excedeu o limite de verificação');
    seen.add(asset.href);
    const source = await get(asset.href);
    bytes += Buffer.byteLength(source);
    assert.ok(bytes <= 5_000_000, 'bundles excederam o limite de verificação');
    code.push(source);
    // Angular/esbuild may emit either quoted strings or literal templates for
    // dynamic imports. Only same-origin JS modules are visited; nothing runs.
    const imports = /(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)(["'`])([^"'`]+\.js(?:[?#][^"'`]*)?)\1/g;
    for (const match of source.matchAll(imports)) {
      if (match[2].includes('${')) continue;
      const dependency = new URL(match[2], asset);
      if (dependency.origin === site.origin) pending.push(dependency);
    }
  }
  assert.ok(code.some(source => source.includes(endpoint)), 'variável WSS ausente dos bundles publicados');
  return { homepage: titles[0], game: titles[1], bundles: seen.size };
}
