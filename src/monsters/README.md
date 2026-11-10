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

## Identidade de movimento de cada monstro

`behavior.ts` define explicitamente uma estratégia por espécie (locomoção, perseguição, cadência e desvio lateral). `RegionalMonster.ts` usa essa estratégia no deslocamento real por `moveBody` e `monsterMotion.ts` vincula o passo real à animação procedural. Slime permanece com sua rotina exclusiva. Golpes especiais, veneno, magia e recompensas continuam no código existente. Os perfis não simulam voo atravessando paredes ou projéteis reais: são tarefas separadas que exigem novas regras e testes.

## Dez loots raros da Região Sul

`rareLoot.ts` é a fonte canônica dos dez itens autorais na mesma ordem da cartela de referência (5×2). Cada ficha de espécie contém seu drop raro com probabilidade determinística baixa (1,2% a 3,5%), sem substituir o saque comum. As recompensas entram no `Inventory.addMaterial` da aventura solo, tanto na superfície quanto em cavernas, e sobrevivem ao save.

Os desenhos procedurais são caminhos SVG em `src/app/item-icon.component.ts`; o aplicativo **não carrega a imagem raster como textura**. Mochila e `/mercado/` reutilizam os ícones pelos IDs estáveis. O catálogo PostgreSQL marca `rarity='rare'` e `trade_enabled=false`: não existem compra, resgate, posse online ou troca autenticada implementados por esta entrega.
