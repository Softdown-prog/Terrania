# ADR 0013 — Decomposição do `Game.ts`

**Estado:** em andamento. Sessões 1, 2 e 3 concluídas em 2026-11-09; falta a sessão 4 abaixo.

## Problema

`src/game/Game.ts` chegou a **663 linhas** reunindo coisas sem relação: textos de aviso, regras de montaria, recompensas de caverna, compra e venda, decisão de "o que a tecla E faz" (escrita duas vezes) e o laço de três modos de jogo. O próprio README do módulo manda "registrar novos adaptadores em vez de colocar regras adicionais em Game.ts", e o arquivo já descumpria isso: **regras de jogo estavam num orquestrador**, onde só um navegador consegue testá-las. Cada nova mecânica (a de caverna e a de montaria chegaram juntas) somava ~100 linhas no mesmo lugar.

## Mapa do arquivo original

| Bloco | Linhas | Natureza | Destino | Estado |
| --- | ---: | --- | --- | --- |
| Textos da bolsa/loja (`INVENTORY_FEEDBACK`) | 27 | dados | `src/game/messages/inventoryFeedback.ts` | feito |
| Textos das montarias | 25 | dados | `src/game/messages/mountMessages.ts` | feito |
| `mountAction` (compra, domar, devolver, montar) | 55 | **regra** | `src/engine/MountActions.ts` | feito |
| Vitórias de caverna → XP e saque | 10 | **regra** | `src/engine/CaveRewards.ts` | feito |
| Loja e bolsa (7 métodos) | 75 | regra + efeitos | `src/game/actions/shopActions.ts` | feito |
| "O que a tecla E faz" e rótulo do HUD | 40 | decisão pura (duplicada) | `src/game/interactions.ts` | feito |
| Reinício de movimento/combate repetido em 7 lugares | ~35 | estado | `src/game/TravelState.ts` | feito (sessão 2) |
| `update()`: superfície, caverna e interior | ~210 | laço | `src/game/modes/surfaceMode.ts`, `caveMode.ts`, `interiorMode.ts` | feito (sessões 2 e 3) |
| 16 argumentos soltos de `scene.render` | ~20 | adaptação | `SurfaceFrame` (objeto nomeado) | feito (sessão 3) |
| Projeção para o HUD e lista de batalha | ~40 | adaptação | `HudProjection` | sessão 4 |
| Transições (entrar/sair de caverna e interior, novo mundo, renascer) | ~90 | orquestração | `transitions.ts` | sessão 4 |

Resultado da sessão 1: **663 → 510 linhas**, com **15 testes novos** sobre o motor real (antes, nada disso era testável sem navegador) e 3 do teto de tamanho.

## Regras (valem para todo autor, humano ou IA)

1. **Direção das dependências:** `Game` → `game/actions`, `game/interactions`, `game/messages` → `engine`. `engine` nunca importa `game`, `ui` nem `render`.
2. **Regra no motor, efeito no orquestrador.** Uma regra de jogo (o que uma ação faz e se muda a bolsa) vive em `src/engine/` ou em função pura que devolve um resultado (`{ result, persist, stopMovement }`, `{ message, changed }`). Salvar, atualizar o HUD e parar o movimento são efeitos e ficam em `Game`.
3. **Textos são dados** em `src/game/messages/`, com `Record<Resultado, string>`: o compilador obriga a cobrir todo resultado novo.
4. **Cada extração traz testes que exercitam o motor real** (`OfflineSimulation`), não *mocks*, e é validada por **mutação**: quebrar a regra de propósito precisa reprovar o teste. (Na sessão 1 isso pegou um teste fraco: uma recusa por menu fechado também era recusada por distância, com a mesma mensagem.)
5. **Teto de tamanho:** `tests/file-size-budget.test.ts` reprova arquivo `.ts` novo acima de 400 linhas e qualquer crescimento dos arquivos já grandes. Ao dividir um deles, baixe a linha dele na tabela para travar o ganho.
6. **Comportamento idêntico.** A decomposição não muda gameplay. A ordem dos efeitos (parar movimento → salvar → atualizar HUD) foi preservada e a suíte de navegador roda antes de cada PR.

## Sessão 2 (concluída): o que foi feito e o que foi decidido não fazer

- **`TravelState`** reúne `navigator`, `combat`, `pursuit`, `walker` e `autoFollow`, com **uma função por intenção**: `stopSteps`, `stopMotion` e `stopAll`. Os "reinícios repetidos" **não eram iguais**: `combat.reset()` zera a recarga do golpe e `combat.cancel()` a preserva. A porta de interior usa `cancel()` de propósito (o README manda preservar a recarga ao entrar numa casa); juntar tudo numa função só daria recarga zerada ao entrar numa casa, um bug silencioso. Por isso `stopMotion` nunca mexe no combate e a porta continua explícita.
- **`update()` foi separado em métodos** (`tickCave`, `tickInterior`, `tickSurface`) **dentro de `Game.ts`**, por movimento puro de código: comparando as linhas antes e depois, nenhuma linha de lógica mudou. `tickCave` e `tickInterior` devolvem `true` ("o quadro terminou aqui") ou `false` ("o herói saiu: a superfície ainda roda NESTE quadro"). Sair da caverna (escada ou queda) não termina o quadro, e um `return` ingênuo deixaria a tela um quadro sem desenhar.
- **`InteriorMode` como classe: descartado.** O interior tem 13 linhas no laço; uma classe com todas as dependências ligadas por interface criaria mais ligação do que o trecho que isola.
- **Tamanho:** `Game.ts` foi de 510 para 508 linhas. Esta sessão reorganizou mais do que encolheu: a economia do `TravelState` foi consumida pelo andaime dos métodos. O ganho real vem na sessão 3, quando os métodos saírem para os seus arquivos. O teto foi baixado para 508.

## Sessão 3 (concluída): modos em arquivos próprios

- **`modes/types.ts`** define `Frame` (o que o início do quadro decidiu), `FrameTimers` (os quatro relógios do jogo, passados por referência) e **`ModeHost`**: a lista fechada do que um modo pode usar do jogo (`sim`, `world`, `input`, `travel`, `hud`, `scene`, `camera`, `effects`, `timers` e as ações `save`, `updateHud`, `hudBattleRows`, `leaveCave`, `leaveInterior`). Se um modo precisar de algo novo, aparece ali, à vista, em vez de alcançar o `Game` inteiro. `sim` e `world` são trocados a cada mundo novo; por isso a `host` expõe getters e os modos leem sempre dela, nunca guardam uma cópia.
- **Um arquivo por modo:** `interiorMode.ts` (21 linhas), `caveMode.ts` (50) e `surfaceMode.ts` (98), cada um uma função `tickX(host, ..., frame)`. O contrato de retorno foi mantido: `true` = o quadro terminou; `false` = o herói saiu e a superfície ainda roda NESTE quadro.
- **`SurfaceFrame`** substitui os 16 argumentos posicionais de `scene.render` por um objeto com campos nomeados. Quatro deles eram booleanos em sequência (`wildHorse`, `stableBuilt`, `tracksVisible`, `leadingHorse`), onde trocar dois passaria no compilador sem ninguém notar.
- **Provas de equivalência (uma por commit):** em cada movimento, o corpo antigo (com `this.` trocado por `host.`) foi comparado linha a linha com o novo. Nenhuma linha de lógica mudou, exceto uma, deliberada: em `tickInterior`, a guarda `if (this.interior)` após `leaveInterior()` virou o retorno antecipado `if (room.reachedExit) { host.leaveInterior(); return false; }`. É equivalente porque `leaveInterior()` sempre zera `this.interior` e o despachante só chama o modo com o próprio `this.interior`. Para o `SurfaceFrame`, as 16 expressões do chamador antigo foram conferidas, por posição, com os campos nomeados.
- **Tamanho:** `Game.ts` foi de **510 para 358 linhas** (663 no começo) e **saiu da tabela de arquivos grandes**, porque passou a caber no limite padrão de 400.
- **Erro de processo achado e corrigido:** um commit local saiu com o teste de tamanho vermelho, porque o encadeamento `npm test | grep` devolve o código de saída do `grep`, não o do teste. O commit ainda não tinha sido enviado e foi corrigido; daí em diante o código de saída real é conferido.

## Estrutura alvo de `src/game/`

```
Game.ts                ligação e ciclo de vida (alvo ≤ 250 linhas)
PhaserGame.ts          laço e cena (já pequeno)
messages/              textos (dados)
actions/               ações do jogador sobre a simulação (loja, montaria)
interactions.ts        decisões puras de proximidade e oferta
modes/                 SurfaceMode, CaveMode, InteriorMode (sessões 2–3)
hud/                   HudProjection (sessão 3)
```

## Sessões restantes

- **Sessão 4:** `HudProjection` (`updateHud`, `hudBattleRows`) e `transitions.ts` (entrar/sair de caverna e interior, novo mundo, renascer; exige `cave` e `interior` no `ModeHost` ou num objeto de estado de modo), levando o `Game.ts` a só ligação (alvo ≤ 250 linhas). Depois, o mesmo método nos outros arquivos da tabela de tamanho: `render/actors.ts`, `render/terrain.ts`, `render/regionalWave3.ts` e `render/scenery.ts` (divisão por criatura/peça, mantendo `tests/helpers/artAssets.ts` em dia).

Fora deste ADR, mas na mesma linha: `src/style.css` (mais de mil linhas globais) merece divisão por tela.

## Como retomar

1. Ler este ADR e `src/game/README.md`; não é preciso ler o projeto.
2. Escolher **uma** linha da tabela; extrair; escrever testes com o motor real; fazer a checagem de mutação.
3. Rodar `architecture:check`, `typecheck`, `npm test`, `build` e o Playwright dos fluxos tocados.
4. Baixar o teto em `tests/file-size-budget.test.ts` e atualizar a tabela acima.

## Limites

Os testes novos cobrem as regras extraídas. Não cobrem o laço de `update()` nem a ordem dos efeitos dentro dele: isso continua dependendo da suíte de navegador, e ela não prova que o jogo "continua bom de jogar".
