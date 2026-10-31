import { appendFileSync } from "node:fs";

const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
const override = process.env.TERRANIA_PAGES_PROJECT?.trim();
const domain = "rpg.analysepro.com";

if (!account || !token) {
  throw new Error("Configure CLOUDFLARE_ACCOUNT_ID e CLOUDFLARE_API_TOKEN.");
}
if (!/^[a-f\d]{32}$/i.test(account)) {
  throw new Error("CLOUDFLARE_ACCOUNT_ID inválido.");
}
if (override && !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(override)) {
  throw new Error("TERRANIA_PAGES_PROJECT tem formato inválido.");
}
async function cloudflare(path) {
  const response = await fetch(
    "https://api.cloudflare.com/client/v4/accounts/" + account + "/pages/projects" + path,
    { headers: { Authorization: "Bearer " + token, Accept: "application/json" },
      signal: AbortSignal.timeout(15000) },
  );
  if (!response.ok) throw new Error("Cloudflare Pages API retornou HTTP " + response.status + ". Verifique o token e as permissões Pages Read/Edit.");
  const body = await response.json();
  if (body.success !== true) throw new Error("Cloudflare Pages não autorizou a consulta de projetos.");
  return body;
}

let projects = [];
if (override) {
  projects = [(await cloudflare("/" + encodeURIComponent(override))).result];
} else {
  for (let page = 1; page <= 10; page++) {
    const body = await cloudflare("?per_page=100&page=" + page);
    if (!Array.isArray(body.result)) throw new Error("Resposta inesperada da listagem Pages.");
    projects.push(...body.result);
    if (body.result.length < 100) break;
  }
}
const matches = projects.filter(project =>
  Array.isArray(project?.domains) &&
  project.domains.some(item => String(item).toLowerCase() === domain),
);
if (matches.length !== 1) {
  throw new Error(
    "Não foi encontrado um único projeto Cloudflare Pages ligado a " + domain +
    ". Confira se o domínio pertence a Pages (e não Workers) e, se necessário, configure TERRANIA_PAGES_PROJECT. Nenhum deploy foi executado.",
  );
}
const projectName = matches[0].name;
if (typeof projectName !== "string" ||
    !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(projectName)) {
  throw new Error("Slug do projeto Pages inválido.");
}
console.error("Destino confirmado: Cloudflare Pages / " + projectName + " / " + domain);
appendFileSync(process.env.GITHUB_OUTPUT, "project=" + projectName + "\n");
