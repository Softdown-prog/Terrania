# ADR 0036 — Acabamento visual, fatia 4: decoração do deserto e pastas por região

**Estado:** entregue em 2026-11-11, direto na `main` por pedido do dono. Quarta fatia da campanha ([docs/QUALIDADE_VISUAL.md](../QUALIDADE_VISUAL.md)).

> **Atualização (ADR 0037):** a colocação (`types.ts`, `placement.ts`) foi para `src/world/south/decor/` e a decoração ganhou colisão (cacto e arbusto lenhoso bloqueiam). O que está dito abaixo sobre "sem colisão" vale para a entrega original.

## Contexto

Depois do relevo das dunas (ADR 0033), das estradas (0034) e das pedras (0035), o deserto ainda só tinha pedras: nenhuma vida, nenhum sinal de que algo passou ali. Junto, o dono reforçou uma regra de organização: **tudo em arquivo separado e em pastas com o nome de cada região onde o item aparece**.

## Decisões

1. **Cinco peças de decoração, cada uma no seu arquivo, na pasta do Sul** (`src/render/south/decor/`, o `index.ts` só reexporta): `dryGrass.ts` (touceira de capim seco), `desertShrub.ts` (arbusto de salva, galhada seca e a bola de espinhos que o vento rola), `bones.ts` (caveira de animal, costelas, ossos cruzados e vértebras), `cactus.ts` (barril com flor, palma com frutos, cacto alto com braços e grupo) e `crackedEarth.ts` (placas de lama seca, com rachaduras que se ramificam). Cada uma tem quatro formatos, todas na luz de noroeste, com contorno, volume e reflexo.
2. **Colocação pura e testável** (`placement.ts`): densidade e pesos por bioma, posição dentro do tile, tudo por hash da posição e da semente, igual em qualquer chunk. As dunas ficam com capim, arbusto e cacto; a terra batida das ruínas ficam com terra rachada e ossos. `prop.ts` só aceita areia livre (sem pedra, sem árvore, sem estrada, sem água) **fora da cidade do Poço Negro**.
3. **Só visual:** a decoração não entra nos dados do mundo (`Tile` não ganha campo nenhum), não tem colisão e nenhum arquivo de `world`, `engine`, `actors`, `monsters`, `npcs` ou `dungeons` a importa (conferido por teste). Por isso o Go e o servidor não mudam. O cacto é baixo o bastante para o herói passar por cima sem parecer errado; uma colisão própria exigiria mexer no mundo e na paridade com o Go e fica como decisão futura.
4. **Integração:** o renderizador de mundo pergunta `southDecorProp` por tile e o cenário pinta cada tipo e formato num sprite próprio, pintado uma vez (20 sprites). Um cenário `south-decor` sem tipo não desenha nada (o `else` final do cenário desenhava uma fogueira, risco que o teste achou).
5. **Contrato de arte:** os quatro formatos de cada tipo estão registrados como `prop` (20 peças). Seis delas ficaram abaixo do piso de cores (e as vértebras, sem nenhum traço), então melhorei as peças (placas de lama, rachaduras e lascas nos ossos, folhas e espinhos na bola de galhos, medula ligando as vértebras) em vez de mexer em qualquer piso.
6. **Reorganização por região, feita junto:** o que só aparece no Sul e estava em pastas genéricas foi para pastas `south/` (só mudou de lugar, sem alterar comportamento): a alquimia (`src/engine/character/south/alchemy/`), as ações de loja dela (`src/game/actions/south/alchemyActions.ts`), as falas da missão do poço (`src/game/messages/south/well/`) e a pedra de arenito (`src/render/south/rocks/`). A regra entrou no `AGENTS.md` e os ADRs 0030, 0031 e 0035 foram atualizados com os novos caminhos.

## Verificação

- `tests/south-decor.test.ts` (8 testes): um assunto por arquivo; colocação determinística, só nos biomas de deserto, com densidade, pesos e posição no tile, e a semente mudando **onde** há decoração; só em areia livre e fora da cidade (a regra da cidade é necessária: centenas de tiles dela teriam decoração); sem importação em nenhuma camada de regras e sem campo novo no tile; o renderizador de mundo põe decoração no deserto, nunca sobre pedra e nunca na mata; os cinco pintores com quatro formatos diferentes, estáveis, equilibrados, tolerantes a valores inválidos e diferentes entre si; e o cenário com um sprite por tipo e formato, uma vez só, sem desenhar nada quando falta o tipo.
- Mutações conferidas (todas reprovadas, menos uma equivalente): densidade, pesos, semente, posição, cidade, pedra e árvore, tipo de chão, posição do cenário, pintor trocado, formato sem limite, estado não equilibrado, tipo ausente, chave de sprite sem formato e o mundo sem pedir a decoração. A mutação "acrescentar `oasis` à densidade" é equivalente (sem pesos, devolve nada).
- `tests/browser/south-decor.spec.ts` (desktop e Android): deserto, ruína e oeste abrem e desenham sem erro (fumaça).
- Capturas antes e depois no jogo real (deserto e ruína).

## Limites

- **Rastros** (pegadas, marcas de arrasto) ficaram de fora desta fatia: precisam de continuidade ao longo de um caminho e merecem uma entrega própria.
- A decoração é sem colisão e só aparece no deserto (`dunes` e `ruins`); neve, mar, vulcânico e brejo seguem pendentes na campanha.
- Não verificado: Android físico.
