import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { test } from 'node:test';
import { resolve } from 'node:path';

test('MCP stdio aceita handshake, descobre 5 ferramentas e chama find_files', async t => {
  const child = spawn(process.execPath, ['--experimental-strip-types',
    resolve('tools/mcp-navigation/src/server.mts')], {
    cwd: resolve('.'), stdio: ['pipe','pipe','pipe'], env: process.env,
  });
  t.after(() => child.kill());
  let lineBuffer = '';
  let stderr = '';
  const messages: Array<Record<string,unknown>> = [];
  let signal: (() => void) | undefined;
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', chunk => { stderr += String(chunk); });
  child.stdout.on('data', chunk => {
    lineBuffer += String(chunk);
    let idx: number;
    while ((idx = lineBuffer.indexOf('\n')) >= 0) {
      const line=lineBuffer.slice(0,idx).trim();lineBuffer=lineBuffer.slice(idx+1);
      if (line) messages.push(JSON.parse(line) as Record<string,unknown>);
    }
    signal?.();
  });
  async function response(id: number, method: string, params: Record<string,unknown>) {
    child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');
    const end=Date.now()+18000;
    while (Date.now()<end) {
      const found=messages.find(m=>m.id===id);
      if (found) return found;
      if (child.exitCode!==null) throw new Error('MCP exited: '+stderr);
      await new Promise<void>((resolveWait,reject) => {
        const wait=setTimeout(()=>{signal=undefined;resolveWait();},200);
        signal=()=>{clearTimeout(wait);signal=undefined;resolveWait();};
        child.once('error',reject);
      });
    }
    throw new Error('MCP timeout: '+stderr);
  }
  const hello=await response(1,'initialize',{
    protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'terrania-ci',version:'1.0.0'},
  });
  assert.ok(hello.result,JSON.stringify(hello));
  child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
  const listed=await response(2,'tools/list',{});
  const names=((listed.result as {tools?:Array<{name:string}>})?.tools??[]).map(x=>x.name);
  assert.deepEqual(names.sort(),[
    'audit_modules','find_files','get_module_guide','read_source_lines','search_symbols',
  ]);
  const found=await response(3,'tools/call',{name:'find_files',
    arguments:{query:'PhaserGame',scope:'src',limit:3}});
  const text=(found.result as {content?:Array<{text:string}>})?.content?.[0]?.text??'';
  assert.equal(JSON.parse(text).files[0],'src/game/PhaserGame.ts');
  const rejected=await response(4,'tools/call',{name:'read_source_lines',
    arguments:{path:'../.env',maxLines:100}});
  assert.equal((rejected.result as {isError?:boolean})?.isError,true);
});
