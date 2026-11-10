# ADR 0016 — Organização de `src/`

**Estado:** em andamento. Sessão 1 (`src/engine` em subpastas) e sessão 3a (ciclo `actors ↔ world`) entregues em 2026-11-10; as demais abaixo.

## Contexto

`src/` cresceu por camadas e por entregas (ondas), e hoje há pastas planas com assuntos misturados, ciclos entre pastas, arquivos que evidenciam como o antigo teto rígido de linhas incentivava compressão e três pastas com cara de "interface". Medi o estado da `main` em `1ad18e8` (imports resolvidos por script, não por impressão). A área dos monstros (`src/monsters`, `src/actors`, `src/render/regional*`) está em trabalho paralelo (plano do bestiário) e **fica fora** destas sessões até esse trabalho terminar.

## Achados medidos

| # | Achado | Evidência | Sessão |
| --- | --- | --- | --- |
| 1 | `src/engine` tinha 21 arquivos soltos de 5 assuntos (combate, movimento, personagem, montaria, salas) | listagem | **1 (feita)** |
| 2 | **Ciclos entre pastas:** `actors ↔ engine` (24 imports num sentido, 5 no outro), `actors ↔ world` (13/1), `npcs ↔ world` (3/2). Entre arquivos não há ciclo | script de dependências | 3 e 4 |
| 3 | `world/npcs.ts` é só uma reexportação de `npcs/` e fecha o ciclo `npcs ↔ world`; `world/mountQuests.ts` importa tipo de `actors/MountCatalog.ts` | leitura | 3 |
| 4 | `src/render` tem 22 arquivos planos (5.500 linhas) misturando herói, mundo, caverna, montaria, efeitos e monstros; `render/terrain.ts` e `world/terrain.ts` têm o mesmo nome | listagem | 5 |
| 5 | `src/ui/` guarda o renderizador de Canvas (`CanvasScene.ts`) e a ponte com o Angular (`GameUi.ts`); `src/app`, `src/game` e `src/ui` se sobrepõem no nome | leitura | 5 |
| 6 | `src/app` mistura as páginas do site (`pages/`, rotas, layout) e a tela do jogo (HUD, ícones, `game-page`); `hud.service.ts` tem 42 sinais e ~20 registradores de callback; `game-page.html` tem 576 linhas | listagem | 6 |
| 7 | `src/site/site.css` tem 2.063 linhas (36 KB) em um arquivo só, com 700 linhas dentro de um único `@media`; o CSS do jogo já foi dividido em `app/styles/` | contagem | 7 |
| 8 | **O antigo teto de linhas incentivava compactação:** o commit `bd8fb08` manteve `regionalWave3.ts` sob o limite rígido juntando instruções numa linha. O código compacto já é comum: 24 arquivos têm linhas com 4 ou mais instruções (`scenery.ts`, 40 linhas) | `git show bd8fb08`, script | 2 |
| 9 | Os testes (`tests/`) **não passam por checagem de tipos**: o `tsconfig.json` só inclui `src` e não há `@types/node` | `tsconfig.json` | 8 |
| 10 | `src/qa/` não é importado pelo aplicativo, mas **deve ficar em `src/`**: é lá que o `typecheck` o cobre, e `scripts/qa-bot.mjs` e o workflow `qa-bot.yml` dependem do caminho | verificado | nenhuma |

## Sessão 1 (feita): `src/engine` em cinco assuntos

| Pasta | Arquivos |
| --- | --- |
| `engine/` (raiz) | `OfflineSimulation.ts`, `Limits.ts` |
| `engine/combat/` | `combat.ts`, `ClassicCombat.ts`, `ClassicPursuit.ts`, `SwordCombat.ts`, `ClassicBattleList.ts` |
| `engine/movement/` | `ClassicTileWalker.ts`, `TapNavigator.ts` |
| `engine/character/` | `Experience.ts`, `Inventory.ts`, `Equipment.ts`, `Food.ts`, `Weapons.ts`, `loot.ts` |
| `engine/mounts/` | `MountStable.ts`, `MountQuestState.ts`, `MountActions.ts` |
| `engine/rooms/` | `CaveRoom.ts`, `InteriorRoom.ts`, `CaveRewards.ts` |

Só se moveu e se reescreveu `import`. **Prova:** das 88 `.ts`/`.mjs` alteradas, a única linha que muda fora de `import` é o caminho esperado no teste do MCP (`tests/mcp-navigator.test.ts`). Os arquivos movidos usaram `git mv` (histórico preservado). Também foram atualizados `architecture/modules.json`, a documentação que cita caminhos, `scripts/art-preview.mjs` e `server-go/scripts/{ts-reference,gameplay-reference}.mjs`; estes dois importavam `combat.ts` e quebrariam o job de paridade do Go (a saída de ambos foi comparada antes e depois: idêntica). O servidor Node (`server/src/db/catalog.ts`) importa quatro arquivos movidos e o `Dockerfile` copia `src/engine` inteiro, então a estrutura nova continua coberta.

## Próximas sessões (cada uma, um PR)

- **Sessão 2 — legibilidade sem teto artificial:** o tamanho passou a ser um diagnóstico não bloqueante: até 400 linhas preferível, 401–800 aviso e acima de 800 revisão recomendada, conforme `tests/file-size-budget.test.ts`. Em vez de tetos por linhas ou bytes, avaliar instruções comprimidas e largura de linha em revisão de legibilidade, sem reprovar o CI apenas por tamanho. Os portões reais de arquitetura, tipagem e testes permanecem.
- **Sessão 3 — ciclos pequenos**, em três partes:
  - **3a (feita):** `actors ↔ world` desfeito. O vocabulário das montarias (`MOUNT_IDS`, `MountId`) foi para `world/mountIds.ts`; `world/mountQuests.ts` importa de lá e `actors/MountCatalog.ts` reexporta os mesmos nomes (nenhum outro arquivo mudou). `tests/layering.test.ts` trava a regra: `world` só importa `world`; `monsters` e `npcs` só importam a si mesmas e `world`.
  - **3b (espera o PR #126):** remover `world/npcs.ts` (reexportação de `npcs/` que fecha `npcs ↔ world`) e apagar a exceção em `tests/layering.test.ts`.
  - **3c (espera o PR #126):** mover `CaveFloor` (geração do mapa) de `engine/rooms/CaveRoom.ts` para `world/` (ADR 0014, sessão 3). 3b e 3c ficam para depois porque o #126 altera `world/npcs.ts`, `npcs/catalog.ts` e `CaveRoom.ts`.
- **Sessão 4 — camada de regras sob os atores:** `Weapons`, `Food`, `Experience`, `Equipment` e as constantes de `combat.ts` são regras puras usadas por `actors/Player.ts`; devem ficar abaixo de `actors`, para que `engine` dependa de `actors` e não o contrário. **Só depois do bestiário**, pois mexe nos imports de `Player`/`RegionalMonster`.
- **Sessão 5 — `render/` e `ui/`:** subpastas (`hero`, `world`, `fx`, `mounts`, `monsters` por último), dividir `render/actors.ts` (585) em herói e slime, e levar `CanvasScene.ts` para `render/`, deixando `ui/` só com a ponte do Angular.
- **Sessão 6 — `app/`:** separar `app/site/` (páginas) de `app/game/` (HUD, ícones, tela do jogo) e dividir `hud.service.ts` por assunto.
- **Sessão 7 — `site.css`:** dividir por seção, com a prova de que a concatenação na mesma ordem reproduz o arquivo atual; só então separar por página.
- **Sessão 8 — checagem de tipos dos testes:** incluir `tests/` no `typecheck` (exige `@types/node`) e corrigir o que aparecer.

Fora de escopo: mudar regra de jogo, balanceamento, protocolo, servidor ou qualquer comportamento. Cada sessão passa também pela suíte de navegador.

## Compatibilidade com a política de tamanho do PR #124

A consolidação com o PR #124 remove o limite rígido de 400 linhas e os tetos dos arquivos antigos. A antiga proposta de adicionar teto de bytes foi substituída por avisos não bloqueantes e revisão por responsabilidade. A sessão 1 continua limitada à reorganização física e à atualização de imports, sem mudar a jogabilidade.


## Adendo — capacidade de pastas e novas categorias (10/11/2026)

Os testes antigos verificavam **listas exatas de nomes** em `engine/character/`, o que reprovava uma subpasta nova de armas apesar de respeitar as fronteiras do domínio. Isso não representava uma limitação de 200 arquivos. A política atual usa **200 arquivos diretos por pasta** (`tests/folder-capacity.test.ts`) para fontes `src`, `server`, Go, Rust, testes, scripts e workflows, sem somar arquivos de todas as subpastas nem bloquear novas categorias de assunto.

`tests/engine-layout.test.ts` continua exigindo entradas canônicas na raiz e os cinco assuntos do motor, mas **aceita novos arquivos e categorias** em subpastas, validando fonte TypeScript, ausência de pastas de código vazias e fichas de espada coerentes com `WEAPON_IDS`. O número de arquivos não substitui regras de imports, tipagem, cobertura de testes e fronteiras do `architecture:check`. A separação `character/weapons/swords/` é reconhecida como categoria de domínio, não ícones Angular.
