import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const domain = "rpg.analysepro.com";

export function confirmWorkerTarget(domains, worker) {
  if (!Array.isArray(domains)) throw new Error("Resposta inválida da API de domínios Workers.");
  const matches = domains.filter(item => item?.hostname?.toLowerCase() === domain);
  if (matches.length !== 1 || matches[0].service !== worker ||
      matches[0].environment !== "production" || matches[0].enabled === false) {
    throw new Error("O domínio não está associado ao Worker de produção esperado. Nenhum deploy executado.");
  }
  return worker;
}

async function main() {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!account || !token || !/^[a-f\d]{32}$/i.test(account)) {
    throw new Error("Configure os secrets CLOUDFLARE_ACCOUNT_ID e CLOUDFLARE_API_TOKEN do Terrania.");
  }
  const config = JSON.parse(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/workers/domains?hostname=${domain}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(15000) },
  );
  if (!response.ok) throw new Error(`Cloudflare Workers API: HTTP ${response.status}. Verifique acesso Workers Scripts Read/Edit.`);
  const body = await response.json();
  if (body.success !== true) throw new Error("A Cloudflare não autorizou consultar o destino.");
  const worker = confirmWorkerTarget(body.result, config.name);
  console.log(`Destino confirmado: Worker ${worker} / ${domain}. DNS e rotas serão preservados.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
