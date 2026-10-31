import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const template = readFileSync('dist/index.html', 'utf8');
const routes = JSON.parse(readFileSync('scripts/routes.json', 'utf8'));
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
for (const route of [...routes, {path:'jogar', title:'Jogar · Terrania: Origins', description:'Explore Terrania: Origins no navegador.'},
  {path:'laboratorio-phaser', title:'Jogar · Terrania: Origins', description:'O Phaser 3 agora está integrado à aventura principal.'}]) {
  const path = route.path === '404' ? 'dist/404.html' : `dist/${route.path ? route.path + '/' : ''}index.html`;
  if (route.path && route.path !== '404') mkdirSync(`dist/${route.path}`, {recursive:true});
  const html = template.replace(/<title>.*?<\/title>/s, `<title>${escape(route.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${escape(route.description)}" />`);
  writeFileSync(path, html);
}
