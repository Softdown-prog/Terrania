import { readFileSync, realpathSync, lstatSync, statSync } from "node:fs";
import { resolve, sep, basename } from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const MAX_FILE_BYTES = 2_000_000;
const MAX_TEST_INSPECT = 300;
const STATUS = new Set(["active", "experimental", "lab", "reference"]);
const safeId = (id) => typeof id === "string" && /^[a-z][a-z0-9-]{0,63}$/.test(id);
const isObject = (obj) => obj !== null && typeof obj === "object" && !Array.isArray(obj);
const limitNumber = (n, fallback = 15, max = 20) => {
  if (n === undefined) return fallback;
  if (!Number.isInteger(n) || n < 1 || n > max) throw new Error("limit deve ser inteiro entre 1 e " + max);
  return n;
};
const queryText = (value, required = true) => {
  if (value === undefined && !required) return "";
  if (typeof value !== "string" || !value.trim() || value.length > 120 ||
      /[\x00-\x1f\x7f]/.test(value)) throw new Error("Consulta deve ter entre 1 e 120 caracteres imprimíveis");
  return value.trim().toLowerCase();
};
const relIn = (path, dir) => path === dir || path.startsWith(dir + "/");
const cleanPath = (path) =>
  typeof path === "string" && path.length > 0 && path.length <= 255 &&
  !path.startsWith("/") && !path.includes("\\") &&
  !path.split("/").some(part => part === "" || part === "." || part === "..") &&
  /^[a-zA-Z0-9._/-]+$/.test(path);

/** Constructed only with a local repository root. Never executes a shell or network call. */
export function createNavigator(root = DEFAULT_ROOT) {
  const canonical = realpathSync(root);
  function safeRead(path, maxBytes = MAX_FILE_BYTES) {
    if (!cleanPath(path)) throw new Error("Caminho inválido");
    const resolved = resolve(canonical, path);
    const actual = realpathSync(resolved);
    if (!actual.startsWith(canonical + sep) ||
        lstatSync(resolved).isSymbolicLink()) throw new Error("Arquivo fora do repositório ou link simbólico");
    const info = statSync(resolved);
    if (!info.isFile() || info.size > maxBytes) throw new Error("Arquivo ausente, inválido ou muito grande");
    return readFileSync(actual, "utf8");
  }
  function catalog() {
    const data = JSON.parse(safeRead("architecture/modules.json", 128_000));
    if (data.schemaVersion !== 1 || !Array.isArray(data.modules)) throw new Error("Catálogo inválido");
    for (const m of data.modules) {
      if (!safeId(m.id) || !STATUS.has(m.status) || !cleanPath(m.doc) ||
          !Array.isArray(m.roots) || !m.roots.every(cleanPath) ||
          !Array.isArray(m.entrypoints) || !m.entrypoints.every(cleanPath))
        throw new Error("Registro de módulos inválido");
    }
    return data.modules;
  }
  function inventory(mods) {
    const fileMap = new Map();
    for (const m of [...mods, {id: "_outros"}]) {
      const content = safeRead("docs/indexes/" + m.id + ".md");
      for (const row of content.split("\n")) {
        // Parse only file links emitted by scripts/index-project.mjs.
        const found = /^- \[\x60([^\x60]+)\x60\]\(\.\.\/\.\.\/([^)]+)\)$/.exec(row);
        if (!found || found[1] !== found[2] || !cleanPath(found[1])) continue;
        const path = found[1];
        if (fileMap.has(path)) throw new Error("Arquivo duplicado em índices: " + path);
        fileMap.set(path, m.id === "_outros" ? null : m.id);
      }
    }
    return fileMap;
  }
  const owning = (path, mods, map) => mods.find(m => m.id === map.get(path))?.id ?? null;
  const validate = (args, keys) => {
    if (args === undefined) return {};
    if (!isObject(args) || Object.keys(args).some(k => !keys.includes(k)))
      throw new Error("Argumentos inválidos ou desconhecidos");
    return args;
  };
  const summary = (m) => ({
    id: m.id, name: m.name, layer: m.layer, status: m.status,
    description: m.description, entrypoints: m.entrypoints, doc: m.doc,
  });
  function listModules(raw = {}) {
    const args = validate(raw, ["status"]);
    if (args.status !== undefined && !STATUS.has(args.status)) throw new Error("status inválido");
    const modules = catalog().filter(m => args.status === undefined || m.status === args.status);
    return {total: modules.length, modules: modules.map(summary)};
  }
  function locateFile(raw = {}) {
    const {query, limit} = validate(raw, ["query", "limit"]);
    const q = queryText(query), max = limitNumber(limit);
    const mods = catalog(), paths = inventory(mods);
    const rows = [...paths].map(([path, owner]) => ({
      path, module_id: owner, score: path.toLowerCase() === q ? 0 :
        basename(path).toLowerCase() === q ? 1 :
        basename(path).toLowerCase().includes(q) ? 2 :
        path.toLowerCase().includes(q) ? 3 : 4,
    })).filter(r => r.score < 4).sort((a,b) => a.score - b.score || a.path.localeCompare(b.path));
    return {query, total: rows.length, files: rows.slice(0, max).map(({score, ...r}) => r),
      truncated: rows.length > max};
  }
  function readModuleDocs(raw = {}) {
    const {module_id, max_chars} = validate(raw, ["module_id", "max_chars"]);
    if (!safeId(module_id)) throw new Error("module_id inválido");
    const mod = catalog().find(m => m.id === module_id);
    if (!mod) throw new Error("Módulo não encontrado");
    const max = limitNumber(max_chars, 10_000, 16_000);
    if (max < 1000) throw new Error("max_chars deve estar entre 1000 e 16000");
    const content = safeRead(mod.doc, 128_000);
    return {module: summary(mod), path: mod.doc,
      text: content.slice(0, max), truncated: content.length > max};
  }
  function findTests(raw = {}) {
    const {module_id, query, limit} = validate(raw, ["module_id", "query", "limit"]);
    const mods = catalog(), pathMap = inventory(mods), max = limitNumber(limit);
    const mod = module_id === undefined ? null : mods.find(m => m.id === module_id);
    if (module_id !== undefined && !mod) throw new Error("Módulo não encontrado");
    const q = queryText(query, false);
    if (module_id === undefined && !q) throw new Error("Indique query ou module_id");
    const tests = [...pathMap.keys()].filter(p =>
      /(?:\.test\.ts|\.spec\.ts|_test\.go|_test\.rs)$/.test(p)).sort();
    let inspected = 0;
    const found = [];
    for (const path of tests) {
      if (inspected >= MAX_TEST_INSPECT) break;
      inspected++;
      const nameMatch = !q || path.toLowerCase().includes(q);
      const direct = mod && mod.roots.some(r => relIn(path, r));
      const contentNeeded = (!!mod && !direct) || (!!q && !nameMatch);
      let content = "";
      if (contentNeeded) {
        try { content = safeRead(path, 48_000).toLowerCase(); } catch { continue; }
      }
      const moduleMatch = !mod || direct || mod.roots.some(r =>
        content.includes(r + "/") || content.includes(r.replace(/^src\//, "../src/") + "/"));
      const queryMatch = !q || nameMatch || content.includes(q);
      if (moduleMatch && queryMatch) found.push({path, module_id: owning(path, mods, pathMap)});
    }
    return {query: query ?? null, module_id: module_id ?? null,
      total: found.length, tests: found.slice(0, max),
      truncated: found.length > max || tests.length > MAX_TEST_INSPECT};
  }
  function findDecisions(raw = {}) {
    const {query, limit} = validate(raw, ["query", "limit"]);
    const q = queryText(query, false), max = limitNumber(limit, 10, 20);
    const map = inventory(catalog());
    const adrPaths = [...map.keys()].filter(p => /^docs\/adr\/[a-zA-Z0-9._-]+\.md$/.test(p)).sort().slice(0, 150);
    const results = [];
    for (const path of adrPaths) {
      let contents;
      try { contents = safeRead(path, 64_000); } catch { continue; }
      const title = contents.split("\n").find(s => s.startsWith("# "))?.replace(/^# /, "") ?? basename(path);
      const at = q ? contents.toLowerCase().indexOf(q) : 0;
      if (at < 0 && !path.toLowerCase().includes(q)) continue;
      const offset = Math.max(0, at < 0 ? 0 : at - 55);
      results.push({path, title, excerpt: contents.slice(offset, offset + 280).replace(/\s+/g, " ").trim()});
    }
    return {query: query ?? null, total: results.length, decisions: results.slice(0, max),
      truncated: results.length > max || [...map.keys()].filter(p=>p.startsWith("docs/adr/")).length > 150};
  }
  return Object.freeze({list_modules: listModules, locate_file: locateFile,
    read_module_docs: readModuleDocs, find_tests: findTests, find_decisions: findDecisions});
}
