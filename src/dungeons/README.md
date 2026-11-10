# Masmorras do Terrania

Uma **masmorra** é uma caverna de vários andares. Aqui ficam só os **dados**: o nome de cada andar, quem mora nele e o chefe. A planta do andar mora em [`src/world/caveFloor.ts`](../world/caveFloor.ts) e quem povoa e atualiza o andar é [`src/engine/rooms/CaveRoom.ts`](../engine/rooms/CaveRoom.ts).

**Regra de organização:** uma pasta por região e **um arquivo por masmorra**. Nada de duas masmorras no mesmo arquivo.

| Região | Pasta | Masmorras |
| --- | --- | --- |
| Sul | [`south/`](./south/index.ts) | Cripta das Dunas (3 andares, ou 2 na versão curta), Masmorra do Brejo (2 andares) |
| Norte, Leste, Oeste, Centro | _(ainda sem masmorras de vários andares)_ | |

## Nova masmorra

1. Crie `src/dungeons/<região>/<id>.ts` com `satisfies DungeonDefinition` ([`types.ts`](./types.ts)).
2. Inclua-a em `<região>/index.ts` (crie a pasta e o `index.ts` na primeira masmorra da região) e em [`index.ts`](./index.ts).
3. As espécies de cada andar precisam morar no tema da caverna (`caveThemes` da ficha em `src/monsters`); `tests/dungeons.test.ts` confere.
4. Só o último andar tem `boss`. Escadas, andares e chefe são tratados pelo motor sem código novo.

Limites: cavernas sem masmorra têm um andar só e o comportamento de sempre. A arte da escada para baixo está em `src/render/caveStairsDownArt.ts`.
