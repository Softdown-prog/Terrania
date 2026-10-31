import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const routes = JSON.parse(readFileSync('scripts/routes.json', 'utf8'));
for (const route of [...routes.map(r => r.path), 'jogar', 'laboratorio-phaser']) {
  const path = route === '404' ? 'dist/404.html' : `dist/${route ? route + '/' : ''}index.html`;
  const html = readFileSync(path, 'utf8');
  assert.match(html, /<app-root>/, path);
  assert.match(html, /<base href="\/"/, path);
  assert.match(html, /theme-color" content="#0b0812"/, path);
  assert.ok(!html.includes('src="/src/'), path);
  for (const match of html.matchAll(/(?:src|href)="([^"?#]+)"/g)) {
    if (/^(?:https?:|data:)/.test(match[1])) continue;
    assert.ok(existsSync(resolve('dist', match[1].replace(/^\//, ''))), 'Missing asset: ' + match[1]);
  }
}
const templates = routes.map(route => readFileSync(`src/app/pages/${route.path || 'home'}.html`, 'utf8')).join('\n') +
  readFileSync('src/app/site-layout.html', 'utf8') + readFileSync('src/app/game-page.html', 'utf8');
for (const [, target] of templates.matchAll(/routerLink="(\/[^"]*)"/g)) {
  const route = target.replace(/^\/+|\/+$/g, '');
  assert.ok(route === '' || route === 'jogar' || routes.some(r => r.path === route), 'Broken route: ' + target);
}
for (const [, asset] of templates.matchAll(/src="(\/art\/[^"]+)"/g))
  assert.ok(existsSync(resolve('dist', '.' + asset)), 'Missing template asset: ' + asset);
assert.ok(existsSync('dist/404.html'));
console.log('Verified Angular route shells, compiled entry, internal routes and assets.');
