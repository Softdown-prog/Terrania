import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { WEAPON_IDS } from "../src/engine/character/Weapons.ts";

/**
 * O motor organiza códigos por responsabilidade, não por um manifesto fechado
 * de arquivos. Novas categorias e subpastas são permitidas quando coesas.
 * A capacidade geral por diretório é validada em folder-capacity.test.ts.
 */
const ENGINE = "src/engine";
const REQUIRED_ROOT_FILES = ["Limits.ts", "OfflineSimulation.ts"];
const REQUIRED_TOPICS = ["character", "combat", "mounts", "movement", "rooms"];
const list = (dir: string): string[] => readdirSync(dir).sort();
const isFolder = (dir: string): boolean => statSync(dir).isDirectory();
const sourceCount = (dir: string): number => list(dir).reduce((count, name) => {
  const path = join(dir, name);
  return count + (isFolder(path) ? sourceCount(path) : name.endsWith(".ts") ? 1 : 0);
}, 0);

test("engine: a raiz reserva os pontos de entrada; regras novas ficam em subpastas", () => {
  const files = list(ENGINE).filter(name => !isFolder(join(ENGINE,name)));
  assert.deepEqual(files, [...REQUIRED_ROOT_FILES,"README.md"].sort(),
    "raiz do motor só mantém simulação/limites; regras novas pertencem aos assuntos");
});

test("engine: assuntos obrigatórios existem, sem limitar novos assuntos", () => {
  const folders=list(ENGINE).filter(name=>isFolder(join(ENGINE,name)));
  for (const required of REQUIRED_TOPICS)
    assert.ok(folders.includes(required),"assunto essencial ausente: "+required);
  for (const folder of folders) {
    assert.match(folder,/^[a-z][a-z0-9-]*$/,"nome de assunto inválido");
    assert.ok(sourceCount(join(ENGINE,folder))>0,"assunto sem fonte TypeScript: "+folder);
  }
});

test("engine: subpastas de domínio admitem novos módulos sem nomes pré-aprovados", () => {
  for(const topic of REQUIRED_TOPICS) {
    const directory=join(ENGINE,topic);
    for(const name of list(directory)) {
      const path=join(directory,name);
      if(isFolder(path)) {
        assert.match(name,/^[a-z][a-z0-9-]*$/,"subpasta de assunto inválida: "+name);
        assert.ok(sourceCount(path)>0,"subpasta vazia: "+path);
      } else {
        assert.match(name,/^(?:[A-Za-z][A-Za-z0-9-]*\.(?:ts|json)|README\.md)$/,
          "arquivo de domínio fora dos formatos esperados: "+path);
      }
    }
  }
});

test("engine: weapons/swords tem uma ficha real por ID de espada do catálogo", () => {
  const folder=join(ENGINE,"character","weapons","swords");
  assert.ok(isFolder(folder),"caminho weapons/swords ausente");
  const files=list(folder).filter(name=>name.endsWith(".ts"));
  assert.deepEqual(files,WEAPON_IDS.map(id=>id+".ts").sort(),
    "toda espada do catálogo exige arquivo individual; nenhuma ficha órfã");
  assert.equal(WEAPON_IDS.length,11,"progressão atual das onze espadas (a Espada Comum de Ferro, nível 15, entrou no PR #143)");
});
