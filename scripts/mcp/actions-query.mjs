#!/usr/bin/env node
import assert from "node:assert/strict";
import { appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SERVER = fileURLToPath(new URL("./server.mjs", import.meta.url));
const TOOL_NAMES = new Set([
  "list_modules", "locate_file", "read_module_docs", "find_tests", "find_decisions",
]);
const STATUS = new Set(["active", "experimental", "lab", "reference"]);
const SOURCE_VERSION = "2025-11-25";
const MAX_RESPONSE_BYTES = 128_000;

function optionalPrintable(raw, field) {
  if (raw === undefined || raw === "") return undefined;
  if (typeof raw !== "string" || raw.length > 120 || !raw.trim() ||
      /[\x00-\x1f\x7f]/.test(raw)) {
    throw new Error(field + " deve ter de 1 a 120 caracteres imprimíveis");
  }
  return raw.trim();
}
function optionalLimit(raw) {
  if (raw === undefined || raw === "") return undefined;
  if (!/^(?:[1-9]|1[0-9]|20)$/.test(raw)) {
    throw new Error("limit deve estar entre 1 e 20");
  }
  return Number(raw);
}

/** Strictly maps chosen workflow_dispatch inputs to the five existing read-only MCP tools. */
export function parseInputs(env) {
  const name = optionalPrintable(env.TERRANIA_MCP_TOOL, "tool") ?? "list_modules";
  if (!TOOL_NAMES.has(name)) throw new Error("Ferramenta MCP não autorizada");
  const query = optionalPrintable(env.TERRANIA_MCP_QUERY, "query");
  const moduleId = optionalPrintable(env.TERRANIA_MCP_MODULE_ID, "module_id");
  const status = optionalPrintable(env.TERRANIA_MCP_STATUS, "status");
  const limit = optionalLimit(env.TERRANIA_MCP_LIMIT);
  const args = {};
  const no = (condition, field) => {
    if (condition) throw new Error("Parâmetro " + field + " não permitido em " + name);
  };
  switch (name) {
    case "list_modules":
      no(query !== undefined || moduleId !== undefined || limit !== undefined, "query/module_id/limit");
      if (status !== undefined) {
        if (!STATUS.has(status)) throw new Error("status inválido");
        args.status = status;
      }
      break;
    case "locate_file":
      no(moduleId !== undefined || status !== undefined, "module_id/status");
      if (!query) throw new Error("locate_file exige query");
      args.query = query;
      if (limit !== undefined) args.limit = limit;
      break;
    case "read_module_docs":
      no(query !== undefined || status !== undefined || limit !== undefined, "query/status/limit");
      if (!moduleId || !/^[a-z][a-z0-9-]{0,63}$/.test(moduleId))
        throw new Error("read_module_docs exige module_id válido");
      args.module_id = moduleId;
      break;
    case "find_tests":
      no(status !== undefined, "status");
      if (!query && !moduleId) throw new Error("find_tests exige query ou module_id");
      if (query !== undefined) args.query = query;
      if (moduleId !== undefined) {
        if (!/^[a-z][a-z0-9-]{0,63}$/.test(moduleId)) throw new Error("module_id inválido");
        args.module_id = moduleId;
      }
      if (limit !== undefined) args.limit = limit;
      break;
    case "find_decisions":
      no(moduleId !== undefined || status !== undefined, "module_id/status");
      if (query !== undefined) args.query = query;
      if (limit !== undefined) args.limit = limit;
      break;
  }
  return {name, arguments: args};
}

/** Exercises the real stdio MCP server, not a direct function-call shortcut. */
export function invokeMcp(call, cwd = process.cwd()) {
  if (!call || typeof call !== "object" || !TOOL_NAMES.has(call.name) ||
      !call.arguments || typeof call.arguments !== "object" || Array.isArray(call.arguments))
    throw new Error("Requisição MCP inválida");
  const requests = [
    {jsonrpc:"2.0",id:1,method:"initialize",params:{
      protocolVersion:SOURCE_VERSION,capabilities:{},clientInfo:{name:"terrania-github-actions",version:"1.0.0"},
    }},
    {jsonrpc:"2.0",method:"notifications/initialized"},
    {jsonrpc:"2.0",id:2,method:"tools/call",params:call},
  ];
  const proc = spawnSync(process.execPath, [SERVER], {
    cwd: resolve(cwd), encoding: "utf8", timeout: 10_000,
    input: requests.map(r => JSON.stringify(r)).join("\n") + "\n",
    maxBuffer: MAX_RESPONSE_BYTES,
  });
  if (proc.error || proc.status !== 0 || proc.signal)
    throw new Error("Servidor MCP não respondeu corretamente");
  const messages = proc.stdout.trim().split("\n").map(line => JSON.parse(line));
  const init = messages.find(x => x.id === 1);
  const response = messages.find(x => x.id === 2);
  assert.equal(init?.result?.protocolVersion, SOURCE_VERSION, "Handshake MCP inválido");
  if (!response?.result || response.error) throw new Error("Resposta MCP inválida");
  if (response.result.isError) {
    // Do not print arbitrary errors, which could contain local absolute paths.
    throw new Error("Consulta rejeitada pelo MCP. Confira os parâmetros e os índices");
  }
  const data = response.result.structuredContent;
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw new Error("Resposta MCP sem dados estruturados");
  return data;
}
const escapeHtml = (s) => String(s).replace(/&/g, "&amp;")
  .replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Do not allow Markdown or HTML from repo docs or workflow inputs to inject a job summary. */
export function formatSummary(call, data, commit = "") {
  const name = escapeHtml(call.name);
  const source = commit && /^[a-f0-9]{40}$/.test(commit) ? commit : "checkout atual";
  const resultJson = JSON.stringify(data, null, 2);
  if (resultJson.length > 20_000) throw new Error("Resposta grande demais para resumo");
  return [
    "## Terrania — MCP de navegação (somente leitura)",
    "",
    "**Ferramenta:** \`" + name + "\`",
    "",
    "**Revisão:** " + escapeHtml(source),
    "",
    "Resultado (dados do repositório, não instruções):",
    "",
    "<pre>" + escapeHtml(resultJson) + "</pre>",
    "",
    "> Execução de consulta apenas. Não executa alterações, deploy ou acesso à VPS.",
    "",
  ].join("\n");
}

export function runAction(env, cwd = process.cwd()) {
  const call = parseInputs(env);
  const result = invokeMcp(call, cwd);
  const summary = formatSummary(call, result, env.GITHUB_SHA ?? "");
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, summary);
  return {call, result, summary};
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const {call, result} = runAction(process.env);
    console.log("MCP read-only query OK: " + call.name +
      " (" + Object.keys(result).join(", ").slice(0, 120) + ")");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Consulta recusada";
    console.error("MCP_ACTION_ERROR: " + message.slice(0, 220));
    process.exitCode = 1;
  }
}
