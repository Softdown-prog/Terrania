import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { posix, dirname, resolve } from "node:path";

const root = process.cwd();
const writing = process.argv.includes("--write");
const checking = process.argv.includes("--check") || !writing;
const registry = JSON.parse(readFileSync("architecture/modules.json", "utf8"));
const issues = [];
const readText = (path) => readFileSync(path, "utf8");
const quote = (value) => String.fromCharCode(96) + value + String.fromCharCode(96);
const link = (path, title = path) => "[" + title + "](" + path + ")";
const contains = (path, prefix) => path === prefix || path.startsWith(prefix + "/");
const docsPath = (p) => "../../" + p;
const generatedPrefix = "docs/indexes/";
const skipGenerated = (p) => p === "docs/INDEX.md" || p.startsWith(generatedPrefix);

if (registry.schemaVersion !== 1 || !Array.isArray(registry.modules))
  throw new Error("Unsupported architecture/modules.json schema");
const known = new Set(), roots = new Map(), docSet = new Set();
for (const mod of registry.modules) {
  if (!/^[a-z][a-z0-9-]+$/.test(mod.id) || known.has(mod.id))
    issues.push("Invalid or duplicate module id: " + mod.id);
  known.add(mod.id);
  if (!["active", "experimental", "lab", "reference"].includes(mod.status))
    issues.push("Unknown status for " + mod.id);
  if (!mod.name || !mod.layer || !mod.description)
    issues.push("Missing module details for " + mod.id);
  if (!Array.isArray(mod.roots) || mod.roots.length === 0 ||
      !Array.isArray(mod.entrypoints) || mod.entrypoints.length === 0)
    issues.push("Missing roots/entrypoints for " + mod.id);
  for (const dir of mod.roots || []) {
    if (roots.has(dir) || dir.startsWith("/") || dir.includes("..") || !existsSync(dir))
      issues.push("Duplicate, unsafe or missing module root: " + dir);
    roots.set(dir, mod.id);
  }
  for (const p of [...(mod.entrypoints || []), mod.doc]) {
    if (typeof p !== "string" || p.startsWith("/") || p.includes("..") || !existsSync(p))
      issues.push("Missing or unsafe documented file in " + mod.id + ": " + p);
  }
  docSet.add(mod.doc);
}

const git = spawnSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], {
  encoding: "utf8", maxBuffer: 16 * 1024 * 1024, cwd: root,
});
// Only an explicitly sanitized, Git-free workspace may scan files directly.
// This preserves the architecture checks without shipping Git metadata or
// local credentials into dependency-install and test containers.
const isolated = process.env.TERRANIA_WORKSPACE_SANITIZED === "1" && !existsSync(".git");
const excluded = new Set([".git", "node_modules", ".home", ".npm-cache", ".angular",
  "dist", "test-results", "playwright-report", "out", ".cache"]);
function sanitizedPaths(directory = ".") {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (excluded.has(entry.name)) return [];
    const path = directory === "." ? entry.name : directory + "/" + entry.name;
    if (entry.isDirectory()) return sanitizedPaths(path);
    return entry.isFile() ? [path] : [];
  });
}
if ((git.status !== 0 || git.error) && !isolated)
  throw new Error("git ls-files failed; run inside a Git checkout");
const indexedFiles = git.status === 0 && !git.error
  ? git.stdout.split("\0").filter(Boolean) : sanitizedPaths();
const paths = [...new Set(indexedFiles)]
  .map((p) => p.replace(/\\/g, "/"))
  .filter((p) => existsSync(p) && !skipGenerated(p))
  .sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
const byModule = new Map(registry.modules.map(m => [m.id, []]));
const others = [];
for (const p of paths) {
  const owners = registry.modules.filter(m => m.roots.some(root => contains(p, root)));
  if (owners.length > 1) {
    // No ambiguous ownership: parent/child roots must not be registered twice.
    issues.push("Multiple module owners: " + p + " -> " + owners.map(m => m.id).join(", "));
  }
  if (owners[0]) byModule.get(owners[0].id).push(p);
  else others.push(p);
  if (p.startsWith("src/") && !owners.length &&
      !["src/main.ts", "src/style.css"].includes(p)) {
    issues.push("Unindexed src file (register its folder): " + p);
  }
}

// Enforce the most important architectural boundary with no new dependencies.
for (const p of paths.filter(p => /^src\/(engine|actors|world|monsters|npcs|dungeons)\/.*\.tsx?$/.test(p))) {
  const contents = readText(p);
  const imported = /\bfrom\s*["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']/g;
  for (const match of contents.matchAll(imported)) {
    const imp = match[1] || match[2];
    if (!imp) continue;
    const resolved = imp.startsWith(".") ? posix.normalize(posix.join(dirname(p), imp)) : imp;
    if (/^(@angular(?:\/|$)|phaser(?:\/|$))/.test(imp) ||
        /^(src\/app|src\/game|src\/ui|src\/render|src\/net|src\/storage)(\/|$)/.test(resolved))
      issues.push("Domain imports presentation/network: " + p + " -> " + imp);
  }
}

const out = new Map();
const line = (p) => "- " + link(docsPath(p), quote(p));
let index = "# Terrania — índice de módulos e arquivos\n\n";
index += "> Gerado por " + quote("npm run architecture:index") + ". Não editar à mão. Fonte canônica: " +
  link("../architecture/modules.json", "architecture/modules.json") + ".\n\n";
index += "Este índice informa **onde procurar**. Estado active = módulo utilizado na arquitetura atual; " +
  "experimental/lab não implica serviço em produção nem capacidade validada.\n\n";
index += "| Módulo | Estado | Arquivos | Responsabilidade |\n| --- | --- | ---: | --- |\n";
for (const mod of registry.modules) {
  const files = byModule.get(mod.id);
  if (!files.length) issues.push("Empty registered module: " + mod.id);
  index += "| " + link("indexes/" + mod.id + ".md", mod.name) + " | " + mod.status + " | " +
    files.length + " | " + mod.description.replace(/\|/g, "/") + " |\n";
  let body = "# " + mod.name + "\n\n";
  body += "> Gerado automaticamente a partir de " + quote("architecture/modules.json") +
    ". Estado: **" + mod.status + "** · Camada: **" + mod.layer + "**\n\n";
  body += mod.description + "\n\n";
  body += "**Documentação de manutenção:** " + link(docsPath(mod.doc), quote(mod.doc)) + "\n\n";
  body += "## Pontos de entrada\n\n" + mod.entrypoints.map(line).join("\n") + "\n\n";
  body += "## Todos os arquivos deste módulo (" + files.length + ")\n\n";
  body += files.map(line).join("\n") + "\n";
  out.set(generatedPrefix + mod.id + ".md", body);
}
index += "\n**Outros arquivos:** " + link("indexes/_outros.md", "documentos, configurações e arquivos de entrada") +
  " (" + others.length + ").\n";
index += "\nPara regras de alteração, veja " + link("../AGENTS.md", "AGENTS.md") +
  ", " + link("MANUTENCAO.md", "manutenção") + " e " +
  link("adr/0001-catalogo-e-fronteiras.md", "ADR 0001") + ".\n";
out.set("docs/INDEX.md", index);
out.set(generatedPrefix + "_outros.md", "# Arquivos fora dos módulos de código\n\n" +
  "> Gerado automaticamente. Inclui documentação, entradas raiz e configuração que não possuem um módulo dedicado.\n\n" +
  others.map(line).join("\n") + "\n");
if (existsSync("docs/indexes")) {
  for (const f of readdirSync("docs/indexes")) {
    const path = generatedPrefix + f;
    if (f.endsWith(".md") && !out.has(path))
      issues.push("Stale generated index: " + path);
  }
}
if (issues.length) {
  for (const item of issues) console.error("ARCHITECTURE: " + item);
  process.exitCode = 1;
} else {
  for (const [p, content] of out) {
    if (writing) {
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, content);
    } else if (checking && (!existsSync(p) || readText(p) !== content)) {
      console.error("ARCHITECTURE: outdated index " + p + "; run npm run architecture:index");
      process.exitCode = 1;
    }
  }
  if (!process.exitCode) console.log("Architecture index verified: " +
    registry.modules.length + " modules, " + paths.length + " files, " + out.size + " indexes.");
}
