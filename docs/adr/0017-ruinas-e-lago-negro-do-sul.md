# ADR 0017 — Ruínas abandonadas e lago negro nos Ermos do Sul

**Estado:** fatia 1 entregue em 2026-11-10. Projeto completo do Sul (cavernas e torres de vários andares, masmorras, cidade): ver "Próximas fatias".

## Contexto

O Sul tinha só dunas, oásis, o Obelisco Soterrado e cavernas de um andar. O dono pediu mais lugares na região. Esta fatia entrega o que tem **mais arte e não depende do motor de cavernas**: ruínas que se veem e se atravessam no deserto e lagos de água negra. Ficou fora de propósito o que o PR #126 (vila e gruta) altera (`CaveRoom.ts`, `caves.ts`).

## Decisões

1. **Ruínas são um sistema próprio** (`src/world/southRuins.ts`), não um novo tipo de marco regional. `regionalLandmarks.ts` é espelhado pelo Go e comparado nos scripts de paridade (`ts-reference.mjs`); mexer nele quebraria a paridade.
2. **Colisão e arte vêm das mesmas peças** (`RUIN_PIECES`: colunas, paredes, pilares, forno, degraus...). O que se vê é o que bloqueia. Peças baixas (degraus, tambores, potes) não bloqueiam.
3. **Quatro modelos:** Colunata Quebrada, Templo Desabado (arco quebrado e estandarte vinho), Torre Caída (anel de pedra e piso de lajes) e Muralha do Povoado (tijolo de barro, forno, potes). Cada ruína tem uma célula de 160 tiles, ~19% das células do Sul têm uma; a pegada é chão livre (sem água, via, árvore ou rocha), longe de marco regional e dentro da margem de 4 tiles do bloco desenhado.
4. **Duas camadas de profundidade** (`back` e `front`): o herói passa entre o fundo e a frente (confirmado no jogo, dentro do Templo). Ver `ruinLayerOf`.
5. **Lago negro é um bioma de água** (`black-lake`), decidido em `getTile` por `isBlackLake` (ruído de duas escalas, limiar 0,82, só com influência do Sul ≥ 0,62, nunca sobre as vias). Deixa ~2,4% do Sul alagado, em lagos de 1 a ~1.600 tiles. A água usa a regra de colisão que já existe (`water` não é caminhável). Arte própria: tinta escura com raso turvo, lama na margem, juncos secos, brilho oleoso raro, fio roxo no lugar da espuma branca e ondas arroxeadas.
6. **O Go não espelha** as ruínas nem o lago. As amostras de paridade (7 tiles e 8 células de marco, todas fora do Sul aberto, exceto o obelisco) continuam idênticas e `tests/south-sites.test.ts` as trava com valores literais. Espelhar os dois no Go fica para quando o Go sair do laboratório.
7. O atlas "próximo" marca as ruínas (cor terracota).

## Verificação

- `tests/south-sites.test.ts` (7 testes): paridade intacta, lago só no Sul e sem passagem, lago nunca no centro/Norte/Leste/Oeste nem na via, ruínas determinísticas e só no Sul, pegada livre, nenhuma caverna dentro da pegada, e cada modelo bloqueia nas peças sólidas e tem **interior alcançável a pé** (varredura em grade com o raio do herói). Mutações conferidas: lago em todo lugar, ruína sem colisão, pegada sempre livre e sem margem de bloco reprovam.
- As quatro ruínas estão registradas como `structure` em `tests/helpers/artAssets.ts` e passam no contrato de arte (a primeira versão da Colunata tinha 13 cores contra o piso de 15; **o piso não foi baixado, a peça foi melhorada**).
- Fotografadas no jogo real (Chromium desktop) em seis pontos.

## Limites

- As ruínas **não têm interior, monstros próprios nem loot**. São cenário atravessável.
- Há 3 Slimes por perto na captura do Sul: o Slime nasce em qualquer região (`slimeSpawns` não filtra região). É da área dos monstros, não desta fatia.
- Não verificado: Android físico, desempenho no aparelho, o espelho no Go.

## Próximas fatias (projeto do Sul)

1. **Andares múltiplos no motor** (escadas, estado por andar), depois do PR #126.
2. **Torres de 2 a 3 andares** (reaproveitam os andares) e **cavernas profundas**: Cripta das Dunas, Ninho do Escaravelho Solar, Mina dos Trolls, Gruta dos Lodos.
3. **Masmorras nomeadas** com chefe, tabela de monstros e loot raro.
4. **Monstros nos lagos e nas ruínas** (Hidra de Lodo, Ent, Sapo Batedor perto dos lagos; Diabrete e Elfo nas ruínas) e **a cidade do Sul**.
