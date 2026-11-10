import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Canvas acompanha o tamanho do elemento e mudanças de viewport Android", () => {
  const scene = read("src/ui/CanvasScene.ts");
  const game = read("src/game/PhaserGame.ts");
  assert.match(scene, /resize\(viewWidth: number, viewHeight: number\)/);
  assert.match(scene, /Math\.round\(viewHeight\)/);
  assert.match(game, /visualViewport\?\.addEventListener\(['"]resize['"]/);
  assert.match(game, /['"]orientationchange['"]/);
});
test("gamepad touch respeita gestos, notch e área segura", () => {
  // O componente Angular declara a ordem canônica das folhas do jogo.
  const declaration = read("src/app/game-page.component.ts").match(/styleUrls:\s*\[([\s\S]*?)\]/);
  assert.ok(declaration, "a tela do jogo precisa declarar suas folhas de estilo");
  const css = [...declaration[1].matchAll(/'\.\/styles\/([^']+\.css)'/g)]
    .map(match => read("src/app/styles/" + match[1])).join("");
  const html = read("src/app/game-page.html");
  assert.match(css, /height: 100dvh/);
  assert.match(css, /overscroll-behavior: none/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /max-height: 500px/);
  assert.match(read("index.html"), /viewport-fit=cover/);
  assert.match(html, /role="group" aria-label="Controle de movimento/);
});
test("menu institucional do site permanece navegável no Android", () => {
  const site = read("src/site/site.css");
  assert.match(site, /#main-nav \{/);
  assert.match(site, /max-height: calc\(100dvh - 78px\)/);
  assert.match(site, /overscroll-behavior: contain/);
  assert.match(site, /min-height: 44px/);
});
