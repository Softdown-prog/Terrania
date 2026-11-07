#!/usr/bin/env node
/**
 * Read-only SAC audit of an immutable Terrania revision.
 * Runs trusted SAC analyzers; never imports game modules or reports runtime approval.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { lstat, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanProceduralCanvasWorkspace } from '../../.sac-tool/packages/sac-multistack/src/procedural-canvas-stream.mjs';
import { analyzeImportGraph } from '../../.sac-tool/packages/angular-precompiler/src/dependency-graph.mjs';
import { analyzeAngularComponentWiring } from '../../.sac-tool/packages/angular-precompiler/src/component-wiring.mjs';
import { verifyWorkspace } from '../../.sac-tool/packages/angular-precompiler/src/index.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TARGET = path.join(ROOT, '.sac-target/terrania');
const SAC = path.join(ROOT, '.sac-tool');
const TARGET_SHA = '65eab09b37a58e71023aa68c106d7ee78d2569f8';
const SAC_SHA = '98ca6986b79fa81f6a1595fb8a6d4950c757fe86';
const git = dir => execFileSync('git', ['-C', dir, 'rev-parse', 'HEAD'], {
  encoding: 'utf8', timeout: 10000, stdio: ['ignore','pipe','pipe'],
}).trim();
assert.equal(git(TARGET), TARGET_SHA, 'unreviewed-terrania-source');
assert.equal(git(SAC), SAC_SHA, 'unreviewed-sac-source');
const require = createRequire(path.join(SAC, 'packages/angular-postcompiler/smoke/package.json'));
const ts = require('typescript');

const files = [];
let dirs = 0, bytes = 0;
async function visit(dir) {
  assert.ok(++dirs <= 256, 'source-directory-budget');
  const children = (await readdir(dir, { withFileTypes:true }))
    .sort((a,b) => a.name.localeCompare(b.name));
  for (const child of children) {
    assert.ok(!child.isSymbolicLink(), 'source-symlink');
    const absolute = path.join(dir,child.name);
    if (child.isDirectory()) { await visit(absolute); continue; }
    assert.ok(child.isFile(), 'source-not-file');
    if (!/\.tsx?$/.test(child.name)) continue;
    const info = await lstat(absolute);
    assert.ok(info.isFile() && info.size <= 512 * 1024, 'source-file-budget');
    const source = await readFile(absolute,'utf8');
    bytes += Buffer.byteLength(source);
    assert.ok(files.length < 128 && bytes <= 2 * 1024 * 1024, 'source-total-budget');
    files.push({path:path.relative(TARGET,absolute).split(path.sep).join('/'),source});
  }
}
await visit(path.join(TARGET,'src'));
const tsconfig = await readFile(path.join(TARGET,'tsconfig.json'),'utf8');
const graphPolicy = { layers:[],allowImports:{},external:['@angular/','rxjs','phaser','phaser/'] };
const config = {path:'tsconfig.json',text:tsconfig};
const generatedFiles = [{path:'src/app/runtime-config.ts',generator:'scripts/write-runtime-config.mjs'}];
const graph = analyzeImportGraph({
  files, policy:graphPolicy,typescript:ts,tsconfig:config,generatedFiles,
});
const graphRepeat = analyzeImportGraph({
  files:[...files].reverse(),policy:graphPolicy,typescript:ts,
  tsconfig:config,generatedFiles,
});
assert.deepEqual(graphRepeat,graph,'sac-pre002-nondeterministic');
const wiring = analyzeAngularComponentWiring({files,typescript:ts});
assert.deepEqual(analyzeAngularComponentWiring({files:[...files].reverse(),typescript:ts}),
  wiring,'sac-pre003-nondeterministic');
const preflight = await verifyWorkspace({
  workspace:TARGET,angularVersion:'22.2.4',
});
const canvas = await scanProceduralCanvasWorkspace({
  workspace:TARGET,sourceRoot:'.',typescript:ts,
});
const codes = findings => Object.fromEntries(
  [...new Set(findings.map(f=>f.code))].sort().map(code =>
    [code,findings.filter(f=>f.code===code).length])
);
const report = {
  schema_version:1,kind:'terrania-snapshot-new-sac-audit',
  target:{repository:'Softdown-prog/Terrania',revision:TARGET_SHA,git_revision_verified:true},
  sac:{repository:'Softdown-prog/Data_libray',revision:SAC_SHA,git_revision_verified:true},
  angular_pre001:{
    status:preflight.status,
    assertion_counts:Object.fromEntries(['pass','fail','unverified','infra-error'].map(v=>
      [v,preflight.evidence.filter(e=>e.status===v).length])),
    evidence:preflight.evidence.map(e=>({assertion:e.assertion,status:e.status,code:e.code})),
  },
  angular_pre002:{
    status:graph.status,typescript_source_files:files.length,
    nodes:graph.nodes.length,edges:graph.edges.length,
    finding_count:graph.findings.length,finding_codes:codes(graph.findings),
    findings:graph.findings.slice(0,20).map(f=>({
      code:f.code,file:f.file??null,target:f.target??null,
    })),
    repeat_order_deterministic:true,
  },
  angular_pre003:{
    status:wiring.status,components_checked:wiring.components_checked,
    component_metadata_observed:wiring.component_metadata_observed,
    import_entries_checked:wiring.import_entries_checked,
    finding_count:wiring.findings.length,finding_codes:codes(wiring.findings),
    findings:wiring.findings.slice(0,20),repeat_order_deterministic:true,
  },
  procedural_canvas:{
    status:canvas.status,scan_completed:canvas.scan_completed,
    inventory:canvas.inventory,signals:canvas.signals,findings:canvas.findings,
    candidate_paths:canvas.candidate_paths,
    source_snapshot_sha256:canvas.snapshot_sha256,
    compile_verified:false,determinism_verified:false,canvas_pixels_verified:false,
  },
  source_scanned_only:true,game_runtime_verified:false,
  game_canvas_pixels_verified:false,go_rust_covered_by_sac:false,
  deployment_authorized:false,
};
console.log(JSON.stringify(report,null,2));
if (!canvas.scan_completed || canvas.inventory.parse_error_files ||
    preflight.status==='fail' || preflight.status==='infra-error' ||
    graph.status==='fail' || wiring.status==='fail') process.exitCode=1;
