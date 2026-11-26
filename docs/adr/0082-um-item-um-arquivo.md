# ADR 0082 — Um item, um arquivo: roupas, alimentos e paletas separados por peça

**Estado:** entregue em 2026-11-26, direto na `main`, por pedido do dono: "cada cajado um arquivo, cada roupa um arquivo, cada item que tiver no jogo um arquivo separado, para facilitar a manutenção e a evolução". Não muda nenhum comportamento do jogo: só move dados de lugar.

## O que estava fora da regra
- As **sete peças do conjunto do Aprendiz** e as **sete da Brisa** estavam em um arquivo cada (`apprentice.ts`, `breeze.ts`).
- O **kit inicial do Cavaleiro** (nove peças) estava dentro de `Equipment.ts`, e os **três alimentos** dentro de `Food.ts`.
- A **ficha de cor** de cada conjunto do Mago (`sets/apprentice.ts`, `sets/breeze.ts`) juntava as cores de todas as peças num arquivo só.
- Já estavam certos: os onze **cajados** (`weapons/staves/`), as onze **espadas** (`weapons/swords/`), as moedas, as criaturas e as montarias.

## Decisões
1. **Uma peça de roupa por arquivo**, com o id da peça no nome: `engine/character/knight/gear/` (9), `engine/character/mage/gear/apprentice/` (7) e `.../breeze/` (7). O `index.ts` de cada pasta só reúne (`KNIGHT_GEAR`, `APPRENTICE_GEAR`, `BREEZE_GEAR`), e `Equipment.ts` só junta os três. O que as sete peças de um conjunto têm em comum (a vocação, o nível e o nome do conjunto) fica em `set.ts`, um arquivo só.
2. **Um alimento por arquivo** em `engine/character/foods/`; `Food.ts` os reúne em `FOODS` e continua com as regras de comida.
3. **Uma paleta por peça** (`render/hero/mage/sets/<conjunto>/`: chapéu, túnica com manto, calça, botas, livro, anel e colar, mais o `accent` com o debrum, a gema pequena e o enfeite do conjunto). O `index.ts` da pasta junta as oito na ficha (`MageSetTheme`) que os painters leem. Mexer na bota da Brisa é abrir `sets/breeze/boots.ts` e `mage/gear/breeze/breeze-boots.ts`.
4. **A regra fica travada por teste** (`tests/one-item-per-file.test.ts`): cada pasta de itens (roupas, cajados, espadas, alimentos, paletas) tem um arquivo por item, com o nome do item, cada arquivo exporta uma coisa só, o `index.ts` só reúne e não define peça. Quem juntar dois itens num arquivo reprova.
5. **Daqui em diante**, todo item novo (as roupas dos próximos conjuntos, criaturas, montarias, NPCs) já nasce assim. A regra entrou no `AGENTS.md`.

## Verificação
- Nada mudou no jogo: os 1442 testes unitários anteriores continuam verdes sem alteração de expectativa (inclusive o do desenho do Cavaleiro, que dá o mesmo resumo de 40 poses, e o de cores de cada peça do Mago).
- `tests/one-item-per-file.test.ts` (4): roupas, cajados, espadas, alimentos, paletas e índices. Verificado quebrando de propósito: um item extra num arquivo de peça reprova.

## Limites
- As **criaturas, montarias, NPCs e falas** já seguiam a regra e não foram tocadas. Os catálogos de **moedas e elixires** também já estavam por arquivo.
- `Food.ts` ainda junta as regras de comida (tipos, normalização, nutrição); separá-las por assunto é uma entrega própria, se o dono quiser.
