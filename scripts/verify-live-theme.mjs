const origin = "https://rpg.analysepro.com";
const release = process.env.TERRANIA_RELEASE_SHA ?? "manual";
const wait = (time) => new Promise(resolve => setTimeout(resolve, time));

async function get(path) {
  const url = new URL(path, origin);
  url.searchParams.set("terraniav", release);
  const response = await fetch(url, {
    headers: { "Cache-Control": "no-cache" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(url.pathname + " HTTP " + response.status);
  return response.text();
}
async function verify() {
  if (release !== "manual") {
    const deployed = JSON.parse(await get("/release.json"));
    if (deployed.sha !== release) throw new Error("O domínio ainda não serve o SHA esperado.");
  }
  const home = await get("/");
  if (!/<meta\s+name="theme-color"\s+content="#0b0812"/.test(home)) {
    throw new Error("Página inicial ainda apresenta o tema antigo.");
  }
  const css = [...home.matchAll(/<link[^>]+href="([^"]+\.css(?:\?[^"]*)?)"/g)]
    .map(match => match[1]);
  if (!css.length) throw new Error("O HTML público não contém o CSS compilado do Vite.");
  const assets = await Promise.all(css.map(get));
  if (!assets.some(text => /#b986ff/i.test(text))) {
    throw new Error("CSS público ainda não possui o tom púrpura #b986ff.");
  }
  const guide = await get("/guia/");
  if (!/<meta\s+name="theme-color"\s+content="#0b0812"/.test(guide)) {
    throw new Error("A página do guia ainda mostra o tema antigo.");
  }
}
let last;
for (let attempt = 1; attempt <= 12; attempt++) {
  try {
    await verify();
    console.log("Deploy público confirmado em " + origin + " (tema púrpura e preto, revisão " + release.slice(0,12) + ").");
    process.exit(0);
  } catch (error) {
    last = error;
    console.error("Verificação " + attempt + "/12:", error.message);
    if (attempt < 12) await wait(5000);
  }
}
throw new Error("O domínio não está servindo a revisão nova: " + last?.message +
  ". Verifique o domínio vinculado ao Worker e o cache na Cloudflare.");
