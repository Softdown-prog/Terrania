# Monstros do Terrania

As 32 espécies têm **um arquivo TypeScript próprio de ficha**, organizado por **região → categoria biológica/linhagem → espécie**. As categorias não são níveis de combate: goblins, orcs, trolls, ratos e demônios ficam separados mesmo quando estão no mesmo bioma.
O arquivo `src/actors/CreatureCatalog.ts` é somente uma reexportação para os
consumidores existentes; **não** contém cópias dos atributos.

| Região | Diretório de fichas | Espécies |
| --- | --- | ---: |
| Centro | [`center/`](./center/index.ts) | 1 |
| Norte | [`north/`](./north/index.ts) | 6 |
| Sul | [`south/`](./south/index.ts) | 17 |
| Leste | [`east/`](./east/index.ts) | 4 |
| Oeste | [`west/`](./west/index.ts) | 4 |

## Catálogo de famílias — 32 criaturas

### Centro

- [`center/slimes/slime.ts`](./center/slimes/slime.ts)

### Norte

- [`north/yetis/boreal-yeti.ts`](./north/yetis/boreal-yeti.ts)
- [`north/wolves/glacial-wolf.ts`](./north/wolves/glacial-wolf.ts)
- [`north/spirits/frost-spirit.ts`](./north/spirits/frost-spirit.ts)
- [`north/mammoths/tundra-mammoth.ts`](./north/mammoths/tundra-mammoth.ts)
- [`north/banshees/frost-banshee.ts`](./north/banshees/frost-banshee.ts)
- [`north/bears/runic-polar-bear.ts`](./north/bears/runic-polar-bear.ts)

### Sul

- [`south/hydras/mire-hydra.ts`](./south/hydras/mire-hydra.ts)
- [`south/scorpions/dune-scorpion.ts`](./south/scorpions/dune-scorpion.ts)
- [`south/beetles/solar-scarab.ts`](./south/beetles/solar-scarab.ts)
- [`south/ents/rotten-marsh-ent.ts`](./south/ents/rotten-marsh-ent.ts)
- [`south/toads/poison-scout-toad.ts`](./south/toads/poison-scout-toad.ts)
- [`south/worms/carrion-sandworm.ts`](./south/worms/carrion-sandworm.ts)
- [`south/beetles/sand-beetle.ts`](./south/beetles/sand-beetle.ts)
- [`south/rats/dune-rat.ts`](./south/rats/dune-rat.ts)
- [`south/goblins/sand-goblin.ts`](./south/goblins/sand-goblin.ts)
- [`south/orcs/desert-orc.ts`](./south/orcs/desert-orc.ts)
- [`south/trolls/clay-troll.ts`](./south/trolls/clay-troll.ts)
- [`south/smallfolk/dune-scout.ts`](./south/smallfolk/dune-scout.ts)
- [`south/elves/oasis-elf.ts`](./south/elves/oasis-elf.ts)
- [`south/demons/mirage-imp.ts`](./south/demons/mirage-imp.ts)
- [`south/snakes/horned-viper.ts`](./south/snakes/horned-viper.ts)
- [`south/vultures/carrion-vulture.ts`](./south/vultures/carrion-vulture.ts)
- [`south/plants/cactus-sprout.ts`](./south/plants/cactus-sprout.ts)

### Leste

- [`east/crabs/coral-crab.ts`](./east/crabs/coral-crab.ts)
- [`east/serpents/storm-serpent.ts`](./east/serpents/storm-serpent.ts)
- [`east/octopuses/abyssal-octopus.ts`](./east/octopuses/abyssal-octopus.ts)
- [`east/tritons/tide-hunter-triton.ts`](./east/tritons/tide-hunter-triton.ts)

### Oeste

- [`west/golems/basalt-golem.ts`](./west/golems/basalt-golem.ts)
- [`west/draconids/cliff-draconid.ts`](./west/draconids/cliff-draconid.ts)
- [`west/griffins/summit-griffin.ts`](./west/griffins/summit-griffin.ts)
- [`west/salamanders/magma-salamander.ts`](./west/salamanders/magma-salamander.ts)

**Por que `.ts`, e não `.txt`?** São arquivos executáveis de definição que o motor importa e valida; nomes como `troll.txt` foram usados como exemplos de separação, mas trocar a extensão quebraria o carregamento do jogo. A documentação humana fica junto do código.

**Limite desta reorganização:** anatomia Canvas continua em `src/render/creatures/`, IA e combate em `src/actors/` e `src/engine/`. Não significa que 500 linhas de comportamento exclusivo tenham sido implementadas para cada espécie; isso é uma etapa adicional e testável.

## Nova criatura

1. Crie `src/monsters/<região>/<categoria>/<id>.ts`, exportando uma definição que usa `satisfies CreatureDefinition`. Ex.: `south/trolls/clay-troll.ts` ou `south/rats/dune-rat.ts`.
2. Inclua essa definição no `<região>/index.ts` usando o caminho da categoria; nenhuma ficha pode ficar solta diretamente na pasta da região.
3. Cadastre o ID em `src/monsters/catalog.ts` (nas listas existentes).
4. Reutilize a IA e a geração em `src/actors/RegionalMonster.ts`, e a arte em
   `src/render/`. Não crie outro motor de monstros nem misture Canvas com dados.
5. Atualize testes e rode `npm run architecture:index`, TypeScript, testes e
   auditoria visual antes de integrar.

**Escopo desta etapa:** redistribuição das fichas por famílias, preservando cada definição e seus atributos. Dano, spawn, colisão, IA e
renderização permanecem como estavam. As criaturas de cavernas do brejo
continuam classificadas no Sul, sem criar uma região nova artificial.

## Identidade de movimento de cada monstro

`behavior.ts` define explicitamente uma estratégia por espécie (locomoção, perseguição, cadência e desvio lateral). `RegionalMonster.ts` usa essa estratégia no deslocamento real por `moveBody` e `monsterMotion.ts` vincula o passo real à animação procedural. Slime permanece com sua rotina exclusiva. Golpes especiais, veneno, magia e recompensas continuam no código existente. Os perfis não simulam voo atravessando paredes ou projéteis reais: são tarefas separadas que exigem novas regras e testes.

## Dez loots raros da Região Sul

`rareLoot.ts` é a fonte canônica dos dez itens autorais na mesma ordem da cartela de referência (5×2). Cada ficha de espécie contém seu drop raro com probabilidade determinística baixa (1,2% a 3,5%), sem substituir o saque comum. As recompensas entram no `Inventory.addMaterial` da aventura solo, tanto na superfície quanto em cavernas, e sobrevivem ao save.

Os desenhos procedurais são caminhos SVG em `src/app/item-icon.component.ts`; o aplicativo **não carrega a imagem raster como textura**. Mochila e `/mercado/` reutilizam os ícones pelos IDs estáveis. O catálogo PostgreSQL marca `rarity='rare'` e `trade_enabled=false`: não existem compra, resgate, posse online ou troca autenticada implementados por esta entrega.
