import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
const STYLES=[
  "./styles/game-core.css","./styles/dialogs-and-controls.css",
  "./styles/responsive.css","./styles/inventory.css",
  "./styles/game-overlays.css","./styles/battle-list.css",
  "./styles/world-atlas.css","./styles/mounts.css",
] as const;
const contents=STYLES.map(p=>readFileSync(join("src/app",p),"utf8"));
test("GamePage: CSSs carregados na ordem exata e sem folha duplicada",()=>{
  const component=readFileSync("src/app/game-page.component.ts","utf8");
  const match=component.match(/styleUrls:\s*\[([\s\S]*?)\]/);
  assert.ok(match);
  assert.deepEqual([...match[1]!.matchAll(/'([^']+\.css)'/g)].map(m=>m[1]),STYLES);
  assert.equal(existsSync("src/style.css"),false);
});
test("GamePage: módulos CSS não ficam monolíticos nem com regras incompletas",()=>{
  for(const [i,css] of contents.entries()){
    assert.ok(css.trim(),STYLES[i]!);
    assert.ok(css.split("\n").length<=350,STYLES[i]+" excedeu 350 linhas");
    const plain=css.replace(/\/\*[\s\S]*?\*\//g,"");
    assert.equal((plain.match(/\{/g)??[]).length,(plain.match(/\}/g)??[]).length,STYLES[i]);
    assert.doesNotMatch(css,/@import\b/i);
  }
});
test("GamePage: HUD, inventário, Battle List, mapa, montarias e Android mantidos",()=>{
  const all=contents.join("");
  for(const s of [":host",".hud","#quickPotion","#joystick","#attack","#talkButton",
    "#inventoryDialog",".equipment-grid",".backpack-grid",".classic-status",
    ".classic-battle",".battle-panel",".battle-entry",".world-atlas-panel",
    "#worldAtlasCanvas",".mount-status",".mount-roster"])
    assert.ok(all.includes(s),s+" ausente");
  assert.match(all,/@media\s*\(pointer:\s*coarse\)/);
  assert.match(all,/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});
