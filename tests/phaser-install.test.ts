import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("Phaser 4 instalado com lock reprodutível e integridade npm", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
  assert.equal(pkg.dependencies?.phaser, "4.2.1");
  assert.equal(lock.packages[""].dependencies?.phaser, pkg.dependencies.phaser);
  assert.equal(lock.packages["node_modules/phaser"]?.version, "4.2.1");
  assert.match(lock.packages["node_modules/phaser"]?.integrity ?? "", /^sha512-/);
  assert.equal(lock.packages["node_modules/phaser"]?.dependencies?.eventemitter3, "^5.0.4");
  assert.equal(lock.packages["node_modules/eventemitter3"]?.version, "5.0.4");
  assert.match(lock.packages["node_modules/eventemitter3"]?.integrity ?? "", /^sha512-/);
});
test("laboratório Phaser isolado: não inicia na aventura original nem altera o motor", () => {
  const main = readFileSync("src/main.ts", "utf8");
  const lab = readFileSync("src/phaser-lab/main.ts", "utf8");
  const vite = readFileSync("vite.config.mjs", "utf8");
  const page = readFileSync("laboratorio-phaser/index.html", "utf8");
  assert.doesNotMatch(main, /phaser/i);
  assert.match(lab, /import Phaser from "phaser"/);
  assert.match(lab, /import \{ renderHero \} from "\.\.\/render\/actors\.ts"/);
  assert.match(lab, /textures\.addCanvas\(/);
  assert.match(lab, /seededRandom\(/);
  assert.match(lab, /phaserGame\.destroy\(true\)/);
  assert.match(vite, /"laboratorio-phaser"/);
  assert.match(page, /id="phaser-root"/);
  assert.match(page, /noindex,nofollow/);
});
