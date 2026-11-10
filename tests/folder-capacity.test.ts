import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Capacidade por diretório, sem whitelists rígidas de nomes.
 * Subpastas permitem crescimento por responsabilidade; só arquivos DIRETOS
 * contam para o teto, não todos os descendentes misturados.
 * Código externo gerado (node_modules/dist/target) não é fonte de projeto.
 */
export const MAX_FILES_PER_FOLDER = 200;
export function withinFolderLimit(count: number): boolean {
  return Number.isSafeInteger(count) && count >= 0 && count <= MAX_FILES_PER_FOLDER;
}
const SOURCE_ROOTS = [
  "src", "server/src", "server/tests", "server-go", "rust/spatial-kernel/src",
  "tests", "scripts", ".github/workflows",
] as const;
const IGNORED_GENERATED_DIRS = new Set(["node_modules", "dist", "build", "target", ".cache"]);
function audit(directory: string, checked: string[]): void {
  const entries=readdirSync(directory,{withFileTypes:true});
  const directFiles=entries.filter(entry=>entry.isFile());
  assert.ok(withinFolderLimit(directFiles.length),
    directory+" possui "+directFiles.length+" arquivos; máximo de "+MAX_FILES_PER_FOLDER+
    " por pasta. Organize em subpastas por responsabilidade sem comprimir código.");
  checked.push(directory);
  for (const entry of entries) {
    if(entry.isDirectory() && !IGNORED_GENERATED_DIRS.has(entry.name))
      audit(join(directory,entry.name),checked);
  }
}

test("limite geral: 200 arquivos diretos por pasta, não por módulo inteiro",()=>{
  assert.equal(withinFolderLimit(0),true);
  assert.equal(withinFolderLimit(200),true);
  assert.equal(withinFolderLimit(201),false);
  assert.equal(withinFolderLimit(-1),false);
  assert.equal(withinFolderLimit(1.5),false);
});

test("estrutura geral: nenhuma pasta de fontes ultrapassa 200 arquivos",t=>{
  const checked:string[]=[];
  for(const root of SOURCE_ROOTS) audit(root,checked);
  assert.ok(checked.length>=SOURCE_ROOTS.length);
  t.diagnostic("Diretórios de código auditados: "+checked.length+
    "; limite de "+MAX_FILES_PER_FOLDER+" arquivos diretos em cada pasta");
});
