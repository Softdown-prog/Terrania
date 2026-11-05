import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { parseInputs, invokeMcp, formatSummary, runAction } from "../scripts/mcp/actions-query.mjs";

const env = (tool, options = {}) => ({
  TERRANIA_MCP_TOOL: tool, ...options,
});

test("GitHub Actions: allowlist and per-tool arguments prohibit remote commands", () => {
  assert.deepEqual(parseInputs(env("list_modules")), {name:"list_modules",arguments:{}});
  assert.deepEqual(parseInputs(env("list_modules",{TERRANIA_MCP_STATUS:"lab"})),
    {name:"list_modules",arguments:{status:"lab"}});
  assert.deepEqual(parseInputs(env("locate_file",{
    TERRANIA_MCP_QUERY:"ClassicTileWalker",TERRANIA_MCP_LIMIT:"3",
  })), {name:"locate_file",arguments:{query:"ClassicTileWalker",limit:3}});
  assert.throws(()=>parseInputs(env("run_shell")), /não autorizada/);
  assert.throws(()=>parseInputs(env("locate_file")), /exige query/);
  assert.throws(()=>parseInputs(env("list_modules",{TERRANIA_MCP_STATUS:"production"})), /status inválido/);
  assert.throws(()=>parseInputs(env("find_tests")), /exige query ou module_id/);
  assert.throws(()=>parseInputs(env("read_module_docs",{TERRANIA_MCP_MODULE_ID:"../../.env"})), /válido/);
  assert.throws(()=>parseInputs(env("locate_file",{TERRANIA_MCP_QUERY:"\n"})), /imprimíveis/);
  assert.throws(()=>parseInputs(env("locate_file",{
    TERRANIA_MCP_QUERY:"any",TERRANIA_MCP_LIMIT:"200",
  })), /entre 1 e 20/);
  assert.throws(()=>parseInputs(env("locate_file",{
    TERRANIA_MCP_QUERY:"any",TERRANIA_MCP_MODULE_ID:"simulation",
  })), /não permitido/);
  assert.throws(()=>parseInputs(env("list_modules",{TERRANIA_MCP_QUERY:"\$(touch /tmp/danger)"})),
    /não permitido/);
});

test("GitHub Actions: real MCP stdio process returns checked, structured results", () => {
  const modules = invokeMcp(parseInputs(env("list_modules")));
  assert.equal(modules.total, 16);
  assert.ok(modules.modules.find(m=>m.id==="simulation"));
  const files = invokeMcp(parseInputs(env("locate_file",{
    TERRANIA_MCP_QUERY:"ClassicTileWalker.ts",TERRANIA_MCP_LIMIT:"5",
  })));
  assert.equal(files.files[0]?.path,"src/engine/ClassicTileWalker.ts");
  const docs = invokeMcp(parseInputs(env("read_module_docs",{
    TERRANIA_MCP_MODULE_ID:"simulation",
  })));
  assert.equal(docs.path,"src/engine/README.md");
  const decisions = invokeMcp(parseInputs(env("find_decisions",{
    TERRANIA_MCP_QUERY:"registro",
  })));
  assert.ok(decisions.decisions.some(d=>d.path.startsWith("docs/adr/")));
});

test("GitHub Actions: safely encodes repo text in summary; never renders raw HTML", () => {
  const summary = formatSummary({name:"find_decisions"},{
    decisions:[{excerpt:"</pre><script>alert(1)</script>& hello\n~~~"}],
  },"0123456789abcdef0123456789abcdef01234567");
  assert.match(summary, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(summary, /<script>/);
  assert.match(summary, /0123456789abcdef0123456789abcdef01234567/);
  assert.doesNotMatch(summary, /<\/pre><script>/);
});

test("GitHub Actions: CLI produces a job summary without opening a listener", () => {
  const scratch = mkdtempSync(join(tmpdir(),"terrania-actions-mcp-"));
  const summary = join(scratch,"summary.md");
  try {
    const run = spawnSync(process.execPath, ["scripts/mcp/actions-query.mjs"],{
      cwd:process.cwd(),encoding:"utf8",timeout:12_000,
      env:{...process.env, ...env("locate_file", {
        TERRANIA_MCP_QUERY:"ClassicPursuit.ts",
      }), GITHUB_STEP_SUMMARY:summary},
    });
    assert.equal(run.status,0,run.stderr);
    assert.match(run.stdout,/MCP read-only query OK: locate_file/);
    const text=readFileSync(summary,"utf8");
    assert.match(text,/ClassicPursuit\.ts/);
    assert.match(text,/somente leitura/);
    const byFunction=runAction({...env("list_modules")});
    assert.equal(byFunction.result.total,16);
  } finally {rmSync(scratch,{recursive:true,force:true});}
});

test("GitHub Actions: workflow has read-only permission and no arbitrary command input", () => {
  const yaml = readFileSync(".github/workflows/mcp-navigator.yml","utf8");
  assert.match(yaml,/workflow_dispatch:/);
  assert.match(yaml,/contents: read/);
  assert.match(yaml,/persist-credentials: false/);
  assert.match(yaml,/run: node scripts\/mcp\/actions-query\.mjs/);
  assert.doesNotMatch(yaml, /\beval\b|\bssh\b|\bGITHUB_TOKEN\b|contents: write/);
  const flow = yaml.slice(yaml.indexOf("jobs:"));
  assert.doesNotMatch(flow,/run:\s*\$\{\{/);
});
