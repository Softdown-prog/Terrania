import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const sitePages = [
  "index.html", "404.html", "mundo/index.html", "guia/index.html",
  "novidades/index.html", "comunidade/index.html",
  "privacidade/index.html", "termos/index.html", "jogar/index.html",
];

test("site usa tokens púrpura em vez de verde e dourado", () => {
  const css = read("src/site/site.css");
  assert.match(css, /--bg:\s*#0b0812/);
  assert.match(css, /--panel:\s*#191021/);
  assert.match(css, /--accent:\s*#b986ff/);
  assert.match(css, /\.hero-shade\s*\{/);
  assert.match(css, /\.button:hover\s*\{/);
  assert.doesNotMatch(css, /--gold|#0c2423|#0b2524|#d1ba82/i);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(max-width: 480px\)/);
});

test("todas as páginas usam a cor púrpura-preta da barra do navegador", () => {
  for (const path of sitePages) {
    assert.match(read(path), /<meta name="theme-color" content="#0b0812"\s*\/>/, path);
  }
});

test("escudo do site acompanha a identidade púrpura", () => {
  const crest = read("public/art/crest.svg");
  assert.match(crest, /#c392ff/);
  assert.match(crest, /#11091a/);
  assert.doesNotMatch(crest, /#102b29|#c8b17b/);
});
