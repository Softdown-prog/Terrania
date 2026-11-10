# Monstros do Terrania

As 32 espécies têm **uma ficha individual**, classificada pela região de origem.
O arquivo `src/actors/CreatureCatalog.ts` é somente uma reexportação para os
consumidores existentes; **não** contém cópias dos atributos.

| Região | Diretório de fichas | Espécies |
| --- | --- | ---: |
| Centro | [`center/`](./center/index.ts) | 1 |
| Norte | [`north/`](./north/index.ts) | 6 |
| Sul | [`south/`](./south/index.ts) | 17 |
| Leste | [`east/`](./east/index.ts) | 4 |
| Oeste | [`west/`](./west/index.ts) | 4 |

## Nova criatura

1. Crie `src/monsters/<região>/<id>.ts`, exportando uma definição que usa `satisfies CreatureDefinition`.
2. Inclua essa definição no `<região>/index.ts`.
3. Cadastre o ID em `src/monsters/catalog.ts` (nas listas existentes).
4. Reutilize a IA e a geração em `src/actors/RegionalMonster.ts`, e a arte em
   `src/render/`. Não crie outro motor de monstros nem misture Canvas com dados.
5. Atualize testes e rode `npm run architecture:index`, TypeScript, testes e
   auditoria visual antes de integrar.

**Escopo:** apenas redistribuição de fichas. Dano, spawn, colisão, IA e
renderização permanecem como estavam. As criaturas de cavernas do brejo
continuam classificadas no Sul, sem criar uma região nova artificial.
