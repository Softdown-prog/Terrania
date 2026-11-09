# ADR 0013 — Decomposição do `Game.ts`

**Estado:** em andamento. Sessões 1 e 2 concluídas em 2026-11-09; faltam as sessões 3 e 4 abaixo.

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
| `update()`: superfície, caverna e interior | ~210 | laço | separado em `tickCave`, `tickInterior` e `tickSurface` | métodos feitos (sessão 2); cada um para o seu arquivo na sessão 3 |
| Projeção para o HUD, lista de batalha, 15 argumentos de `scene.render` | ~60 | adaptação | `HudProjection`, `SurfaceFrame` | sessão 3 |
| Transições (entrar/sair de caverna e interior, novo mundo, renascer) | ~70 | orquestração | `transitions.ts` | sessão 3 |

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

- **Sessão 3:** mover `tickCave` e `tickSurface` para `modes/CaveMode.ts` e `modes/SurfaceMode.ts`, ligados ao jogo por uma interface estreita (`ModeHost`: simulação, HUD, cena, `TravelState`, câmera, salvar). `Frame` vira tipo compartilhado. Junto: `SurfaceFrame` tipado no lugar dos 15 argumentos posicionais de `scene.render`, `HudProjection` e `transitions.ts` (entrar/sair de caverna e interior, novo mundo, renascer). Risco alto e o mais valioso: aqui o arquivo encolhe de verdade. Manter a regra de que a caverna pode terminar o quadro com `false`.
- **Sessão 4:** `Game.ts` só com ligação (≤ 250 linhas) e teto rebaixado. Depois, o mesmo método nos outros arquivos da tabela de tamanho: `render/actors.ts` (669), `render/terrain.ts`, `render/regionalWave3.ts` e `render/scenery.ts` (divisão por criatura/peça, mantendo `tests/helpers/artAssets.ts` em dia).

Fora deste ADR, mas na mesma linha: `src/style.css` (mais de mil linhas globais) merece divisão por tela.

## Como retomar

1. Ler este ADR e `src/game/README.md`; não é preciso ler o projeto.
2. Escolher **uma** linha da tabela; extrair; escrever testes com o motor real; fazer a checagem de mutação.
3. Rodar `architecture:check`, `typecheck`, `npm test`, `build` e o Playwright dos fluxos tocados.
4. Baixar o teto em `tests/file-size-budget.test.ts` e atualizar a tabela acima.

## Limites

Os testes novos cobrem as regras extraídas. Não cobrem o laço de `update()` nem a ordem dos efeitos dentro dele: isso continua dependendo da suíte de navegador, e ela não prova que o jogo "continua bom de jogar".
