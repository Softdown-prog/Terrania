import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

/**
 * Runner do GitHub Actions em contêiner na VPS (ADR 0030): trava as propriedades de segurança e de
 * operação dos arquivos de `scripts/runner-vps/`. Não executa nada na VPS e não constrói a imagem.
 */
const DIR = "scripts/runner-vps/";
const read = (name: string): string => readFileSync(DIR + name, "utf8");
const compose = read("docker-compose.yml"), dockerfile = read("Dockerfile"), entry = read("entrypoint.sh"), install = read("install.sh");
/** O bloco de um serviço do Compose (do nome até o próximo serviço ou volume de topo). */
const service = (name: string): string => compose.split(new RegExp(`^  ${name}:\\n`, "m"))[1]!.split(/^  \w[\w-]*:\n|^\w/m)[0]!;

test("o runner não recebe o Docker da VPS, e só o dind é privilegiado e sem porta publicada", () => {
  assert.equal(/docker\.sock/.test(compose.replace(/^\s*#.*$/gm, "")), false, "nada de montar /var/run/docker.sock");
  assert.equal(/^\s+privileged:\s*true/m.test(service("dind")), true);
  assert.equal(/privileged/.test(service("runner")), false, "o runner em si não é privilegiado");
  assert.equal(/^\s+ports:/m.test(compose), false, "nenhuma porta é publicada na VPS");
  assert.equal(/network_mode:\s*"?host/.test(compose), false, "nunca a rede da VPS");
  assert.match(service("runner"), /network_mode:\s*"service:dind"/, "mesma rede do dind: localhost dos serviços de contêiner");
  assert.match(service("runner"), /DOCKER_HOST:\s*tcp:\/\/localhost:2375/);
});

test("há limites de CPU e de memória para a CI não derrubar a produção, e a etiqueta é a esperada", () => {
  for (const name of ["dind", "runner"]) { assert.match(service(name), /cpus:/); assert.match(service(name), /mem_limit:/); }
  assert.match(compose, /RUNNER_LABELS:\s*\$\{RUNNER_LABELS:-terrania-vps\}/);
  assert.match(compose, /restart:\s*unless-stopped/);
  assert.match(compose, /runner-state:\/home\/runner\/state/, "o registro sobrevive a reinício");
});

test("o token nunca vem escrito nem é impresso, e o .env fica fora do Git", () => {
  for (const [name, text] of [["docker-compose.yml", compose], ["entrypoint.sh", entry], ["install.sh", install], ["Dockerfile", dockerfile]] as const) {
    assert.equal(/AAAA[A-Z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|github_pat_/.test(text), false, name + " não tem token");
  }
  assert.equal(/echo[^\n]*\$\{?RUNNER_TOKEN/.test(entry + install), false, "nenhum echo do token");
  assert.match(install, /read -rs RUNNER_TOKEN/, "o token é digitado sem aparecer");
  assert.match(install, /umask 077/);
  assert.match(install, /: > \.env/, "o token é apagado do .env depois do registro");
  assert.match(install, /--force-recreate runner/, "e o contêiner é recriado sem ele");
  assert.match(readFileSync(".gitignore", "utf8"), /^\.env$/m);
});

test("a imagem parte da oficial da GitHub, roda como usuário comum e guarda o registro em volume", () => {
  assert.match(dockerfile, /ARG RUNNER_IMAGE=ghcr\.io\/actions\/actions-runner:/);
  assert.match(dockerfile, /^USER runner$/m);
  assert.match(dockerfile, /docker-ce-cli/);
  assert.match(dockerfile, /mkdir -p \/home\/runner\/state/);
  assert.match(entry, /\.runner \.credentials \.credentials_rsaparams/, "o registro é restaurado e guardado");
  assert.match(entry, /docker info/, "espera o Docker interno responder");
});

test("os scripts são estritos, têm os comandos prometidos e passam na checagem de sintaxe do bash", () => {
  for (const [name, text] of [["entrypoint.sh", entry], ["install.sh", install]] as const) {
    assert.match(text, /^set -euo pipefail$/m, name);
    execFileSync("bash", ["-n", DIR + name]);
  }
  for (const command of ["install", "doctor", "status", "logs", "remove"]) assert.match(install, new RegExp(`\\b${command}\\)`), command);
  assert.match(install, /api\.github\.com/);
  assert.match(install, /ghcr\.io/);
  assert.match(install, /Listening for Jobs/, "só diz que deu certo quando o runner conectou");
});

test("a documentação manda aprovar PR de fora antes de trocar os fluxos e avisa que nada foi testado numa VPS", () => {
  const doc = readFileSync("docs/RUNNER_VPS.md", "utf8");
  assert.match(doc, /PÚBLICO/);
  assert.match(doc, /Require approval for all outside collaborators/);
  assert.match(doc, /fromJSON\('\["self-hosted","terrania-vps"\]'\)/, "runs-on condicional: fork no GitHub, confiança na VPS");
  assert.match(doc, /NÃO foi testado/);
  assert.match(readFileSync("docs/adr/0030-runner-na-vps.md", "utf8"), /nunca executado numa VPS/);
});

test("nenhum fluxo usa o runner da VPS ainda (a troca fica para depois da instalação)", () => {
  for (const file of ["ci", "pre-main-suite", "postgres-market", "deploy-vps", "deploy-pages"])
    assert.equal(/self-hosted|terrania-vps/.test(readFileSync(`.github/workflows/${file}.yml`, "utf8")), false, file);
});
