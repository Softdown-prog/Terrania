# ADR 0042 — Acabamento visual, fatia 8 (parte 1): piso e praça da cidade do Poço Negro

**Estado:** entregue em 2026-11-12, direto na `main` por pedido do dono ("vamos continuar na cidade"). Oitava fatia da campanha ([docs/QUALIDADE_VISUAL.md](../QUALIDADE_VISUAL.md)); a cidade é grande e foi dividida: esta entrega cuida do **chão** (piso das ruas, praça e bordas); os prédios e os detalhes ficam para as próximas.

## Contexto

O piso da cidade era uma grade de tijolinhos roxos, todos do mesmo tamanho, repetida igual em cada tile (um quadriculado visível), sem relevo, sem borda onde encosta na areia e sem nada que marcasse a praça em volta do poço. A areia da cidade era lisa, de um corte seco contra a pedra.

## Decisões

1. **Lajes em fiadas globais** (`src/render/south/city/paving/slabs.ts`). Cada tile tem três fiadas; as juntas, os tons e o sorteio de cada laje saem de funções globais da posição no mundo (a fiada vem de `ty * 3 + linha`, a junta de `k * 15 + meia laje nas fiadas ímpares ± 4 px`). Uma laje que atravessa a emenda de dois tiles sai igual nos dois: **sem quadriculado**. Larguras de 7 a 23 px, quatro tons de pedra roxa e uma variação própria de cada laje (±6 % de luz, `slabColor`).
2. **Pintura** (`paving.ts`, o desenhador `paintCityPaving`): argamassa escura, laje com quina de luz a noroeste e sombra a sudeste só nas bordas reais, rachaduras, lascas, areia nas juntas e uma mancha de sujeira por tile. Cada tile tem ainda uma **laje de destaque** (polida pelo uso, rachada em duas curvas e com a quina gasta).
3. **Meio-fio e sombra** (`curb.ts`, `CityCurb`): nas bordas do piso que encostam na areia, pedras claras e maiores com juntas globais e areia por cima; do lado da areia, uma sombra suave de 7 px que o piso lança. O terreno descobre os lados olhando os vizinhos.
4. **Praça** (`src/world/south/cityPlaza.ts` e `ring.ts`): os 13 × 13 tiles em volta do poço ganham **dois anéis de bronze embutidos** (raios de 96 e 164 px, centrados no poço), cada um com contorno, blocos separados por juntas, fio de luz e brilho. O anel é desenhado por tile, recortado no tile, com o centro do mundo; os pedaços se encaixam. Geometria do mundo (centro e raios) fica em `world`; o desenho, em `render`.
5. **O que não mudou:** terreno, colisão, estradas e as peças da cidade (`southCityArt.ts` perdeu só o piso antigo). O piso fora dos muros continua pelo desenho de estradas (ADR 0034).
6. **Contrato de arte:** `paintCityPaving` é um desenhador exportado, registrado em `tests/helpers/artAssets.ts` em três variantes (lajes, meio-fio, praça). Para **qualquer tile** passar sozinho como `prop` (varridos 169 tiles da cidade: todos passam) foi preciso enriquecer a peça (variação de cor por laje, laje de destaque, mancha de sujeira); nenhum piso foi baixado.

## Verificação

- `tests/south-city-paving.test.ts` (14 testes): um arquivo por assunto e o piso antigo removido; a praça (13 × 13, centro igual ao do poço, anéis a 1 no meio e 0 na borda, valores inválidos); lajes que cobrem o tile em três fiadas sem buracos; **emenda entre tiles** (a laje que cruza sai igual nos dois lados); juntas limitadas, fiadas alternadas, semente e sorteio por laje, desenho que muda de linha em linha; cor da laje (inclusive com valores inválidos); o piso (argamassa em todo o tile, rachaduras contadas, laje de destaque, deslocamento no canvas, estável); meio-fio só nos lados marcados; juntas globais do meio-fio; sombra da areia por lado; anéis (só onde passam, recortados, com o raio e o centro do mundo, juntas de bloco); e o chunk real do poço pintando os anéis e a sombra, contra um chunk do deserto que não pinta nenhum.
- Mutações conferidas (todas reprovadas): fiadas sem deslocamento, bordas sempre reais, laje sem sorteio, um só tom, fiada local (quadriculado), sem argamassa, cor sem variação, praça sem anéis, anéis fora da praça, sem meio-fio, rachadura de uma curva só, sem laje de destaque, meio-fio nos lados trocados, juntas do meio-fio sem variação, sombra sem lado oeste e com lado leste errado, anel sem recorte, centro fixo no canvas, anel sem juntas, um anel a menos, areia sem sombra, terreno que nunca marca a praça e cor com valor inválido.
- Contrato de arte: as três variantes passam; o determinismo continua exato.
- Capturas antes e depois da praça e das ruas no jogo real.

## Limites

- A **areia** dentro dos muros segue lisa (só ganhou a sombra do piso): relevo, pegadas e terra batida ficam para a próxima parte, junto com os prédios.
- Os prédios, o poço, as tendas e os demais objetos da cidade (`southCityArt.ts`, ainda feitos de retângulos) **não foram tocados** nesta entrega.
- Android físico não foi testado; a fumaça de navegador cobre o perfil Android emulado.
