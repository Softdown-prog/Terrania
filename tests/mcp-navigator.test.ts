import assert from "node:assert/strict";
import test from "node:test";
import {spawnSync} from "node:child_process";
import {mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createNavigator} from "../scripts/mcp/navigator.mjs";
import {createDispatcher} from "../scripts/mcp/server.mjs";

const nav = createNavigator();

test("MCP lista catálogo real e não confunde produção com laboratório", () => {
  const all = nav.list_modules();
  assert.equal(all.total, 18);
  assert.equal(all.modules.find(m=>m.id==="npcs")?.status,"active");
  assert.equal(all.modules.find(m => m.id === "monsters")?.status, "active");
  assert.equal(all.modules.find(m => m.id === "node-server")?.status, "active");
  assert.equal(all.modules.find(m => m.id === "go-cluster")?.status, "lab");
  assert.ok(nav.list_modules({status:"lab"}).modules.every(m => m.status === "lab"));
});

test("MCP localiza arquivos sem ler conteúdo arbitrário", () => {
  const result = nav.locate_file({query:"ClassicTileWalker.ts"});
  assert.equal(result.files[0]?.path, "src/engine/movement/ClassicTileWalker.ts");
  assert.equal(result.files[0]?.module_id, "simulation");
  const npc = nav.locate_file({query:"aela.ts"});
  assert.ok(npc.files.some(f=>f.path==="src/npcs/center/aela.ts" && f.module_id==="npcs"));
  const monster = nav.locate_file({query:"dune-rat.ts"});
  assert.ok(monster.files.some(file => file.path === "src/monsters/south/dune-rat.ts" && file.module_id === "monsters"));
  assert.equal(nav.locate_file({query:"arquivo_que_nao_existe_xyz"}).total, 0);
  assert.ok(nav.locate_file({query:"ts", limit:2}).files.length <= 2);
});

test("MCP encontra testes dos módulos por imports e caminho", () => {
  const result = nav.find_tests({module_id:"simulation",query:"classic-tile-walker"});
  assert.ok(result.tests.some(t=>t.path === "tests/classic-tile-walker.test.ts"));
  assert.ok(nav.find_tests({query:"classic-combat"}).total > 0);
});

test("MCP consulta documentos de módulo e ADR sem acessar código-fonte", () => {
  const data = nav.read_module_docs({module_id:"simulation"});
  assert.equal(data.path, "src/engine/README.md");
  assert.match(data.text, /simula|Motor local/i);
  const decisions = nav.find_decisions({query:"MCP"});
  assert.ok(decisions.decisions.some(d=>d.path.endsWith("0002-mcp-navegador-local.md")));
});

test("MCP rejeita IDs maliciosos, argumentos desconhecidos e limites excessivos", () => {
  assert.throws(()=>nav.read_module_docs({module_id:"../../.env"}), /inválido/);
  assert.throws(()=>nav.locate_file({query:"game",limit:99}), /limit/);
  assert.throws(()=>nav.locate_file({query:"/etc/passwd\n"}), /Consulta/);
  assert.throws(()=>nav.list_modules({unexpected:"foo"}), /Argumentos/);
  assert.throws(()=>nav.find_tests({}), /Indique/);
});

test("MCP não permite que documento catalogado escape por symlink", () => {
  const root = mkdtempSync(join(tmpdir(), "terrania-mcp-"));
  try {
    mkdirSync(join(root, "architecture"));
    mkdirSync(join(root, "src", "engine"), {recursive:true});
    writeFileSync(join(root,"architecture","modules.json"),JSON.stringify({
      schemaVersion:1,modules:[{
        id:"demo",name:"Demo",status:"active",layer:"domain",
        roots:["src/engine"],entrypoints:["src/engine/demo.ts"],doc:"src/engine/README.md"
      }]
    }));
    const outside = join(tmpdir(), "terrania-mcp-outside-" + process.pid);
    writeFileSync(outside, "conteúdo externo que nunca pode vazar");
    try {
      symlinkSync(outside, join(root,"src","engine","README.md"));
      assert.throws(()=>createNavigator(root).read_module_docs({module_id:"demo"}), /fora do repositório/);
    } finally { rmSync(outside, {force:true}); }
  } finally { rmSync(root, {recursive:true,force:true}); }
});

test("handshake, ferramentas somente leitura e notificações seguem JSON-RPC", () => {
  const rpc = createDispatcher(nav);
  const probe = rpc({jsonrpc:"2.0",id:1,method:"server/discover"});
  assert.equal(probe.error.code,-32601);
  const noInit = rpc({jsonrpc:"2.0",id:2,method:"tools/list"});
  assert.ok(noInit.error);
  const init = rpc({jsonrpc:"2.0",id:"start",method:"initialize",params:{protocolVersion:"2025-11-25"}});
  assert.equal(init.result.protocolVersion,"2025-11-25");
  assert.equal(rpc({jsonrpc:"2.0",method:"notifications/initialized"}),null);
  const list = rpc({jsonrpc:"2.0",id:3,method:"tools/list"});
  assert.deepEqual(list.result.tools.map(t=>t.name), [
    "list_modules","locate_file","read_module_docs","find_tests","find_decisions"
  ]);
  for(const tool of list.result.tools) {
    assert.equal(tool.annotations.readOnlyHint,true);
    assert.equal(tool.annotations.destructiveHint,false);
    assert.equal(tool.inputSchema.additionalProperties,false);
  }
  const lookup = rpc({jsonrpc:"2.0",id:4,method:"tools/call",
    params:{name:"locate_file",arguments:{query:"ClassicTileWalker.ts"}}});
  assert.equal(lookup.result.isError,false);
  assert.equal(lookup.result.structuredContent.files[0].module_id,"simulation");
  const malicious = rpc({jsonrpc:"2.0",id:5,method:"tools/call",
    params:{name:"read_module_docs",arguments:{module_id:"../.env"}}});
  assert.equal(malicious.result.isError,true);
  assert.equal(rpc({jsonrpc:"2.0",id:6,method:"tools/call",params:{name:"run_shell"}}).error.code,-32602);
  assert.equal(rpc({jsonrpc:"2.0",id:7,method:"ping"}).result.constructor,Object);
});

test("processo MCP em stdio envia somente JSON por linha e não responde a notification", () => {
  const requests=[
    {jsonrpc:"2.0",id:1,method:"initialize",params:{protocolVersion:"2025-11-25"}},
    {jsonrpc:"2.0",method:"notifications/initialized"},
    {jsonrpc:"2.0",id:2,method:"tools/list"},
    {jsonrpc:"2.0",id:3,method:"tools/call",params:{name:"list_modules",arguments:{status:"lab"}}}
  ];
  const run=spawnSync(process.execPath,["scripts/mcp/server.mjs"],{
    cwd:process.cwd(),input:requests.map(x=>JSON.stringify(x)).join("\n")+"\n",
    encoding:"utf8",timeout:10_000,maxBuffer:128_000,
  });
  assert.equal(run.status,0,run.stderr);
  const lines=run.stdout.trim().split("\n").map(x=>JSON.parse(x));
  assert.deepEqual(lines.map(x=>x.id),[1,2,3]);
  assert.equal(lines[2].result.structuredContent.modules[0]?.id,"go-cluster");
});
