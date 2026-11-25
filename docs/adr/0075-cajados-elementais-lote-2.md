# ADR 0075 — Os cajados elementais, lote 2 (Brasa Rubra, Espinheiro e Geada Boreal)

**Estado:** entregue em 2026-11-25, direto na `main`, por pedido do dono (lote 2 da lista aprovada em `docs/MAGO_CAJADOS.md`, [ADR 0073](0073-cajados-elementais-lote-1.md) é o lote 1). Três cajados de elementos novos, com os efeitos ao longo do tempo.

## Decisões

1. **Três cajados**, cada um num arquivo, seguindo a regra do documento (nível e dano da espada que espelham; intervalo = o da espada + 0,2 s; mana = intervalo × mana máxima do nível ÷ 10; preparo = o da espada + 0,05 s):
   - **Cajado de Brasa Rubra** (fogo, nível 30, 38 de dano, 1,55 s, 53 de mana, preparo 0,21 s): queima o alvo, **4 de dano por segundo durante 3 s** (12 no total).
   - **Cajado do Espinheiro** (natureza, nível 45, 52 de dano, 1,35 s, 66 de mana): **veneno que acumula até 3 vezes**: cada acúmulo causa 3 por segundo durante 4 s; um novo acerto renova o tempo (com 3 acúmulos são 9 por segundo, 36 no total).
   - **Cajado da Geada Boreal** (gelo, nível 60, 68 de dano, 1,3 s, 83 de mana): deixa o alvo **40% mais lento por 3 s** (a Rocha Viva dá 30% por 2 s; vale a lentidão mais forte).
   Os três liberam sozinhos no nível (sem compra), como as espadas.
2. **Os efeitos ao longo do tempo** são do monstro (`Slime`): a queimadura (`applySpellBurn`) e o veneno (`applySpellPoison`) são estados de dano por segundo que **não passam pela defesa** do alvo (como o fogo e o veneno das espadas), renovam o tempo ao novo acerto e **nunca pegam quem já caiu**. A queimadura não soma dano ao renovar; o veneno soma um acúmulo até o teto do cajado. Os dois passam por um só passo de tempo exato (`tickSpellDot`): **o último tique de cada efeito não se perde por arredondamento** (3 s de queimadura são sempre 3 tiques, em qualquer tamanho de passo), um passo grande nunca passa do fim do efeito, e ao renovar o relógio de tiques continua de onde estava.
3. **Quem morre de queimadura ou veneno conta como derrota** na superfície e na caverna (experiência, saque e remoção), como já acontecia com o fogo e o veneno das espadas.
4. **O desenho**: três matérias novas por cima da haste e do engaste (`render/staves/motifs/`, um arquivo por matéria): **brasa** (madeira carbonizada riscada de brasa, três línguas de chamas atrás da gema que balançam, calor em volta, fumaça e fagulhas que sobem), **espinho** (galho verde com folhas grandes que abraçam a gema, espinhos alternados, trepadeira, botão de flor rosa, orvalho e pétalas que descem) e **cristal** (haste de cristal azul-pálido com quatro estilhaços de gelo em leque atrás da gema, cristais de geada, gavinhas de névoa, halo frio e faíscas de gelo que piscam). Cada gema tem a cor do elemento (laranja, verde, ciano) e o projétil e o estouro saem dessa cor. Capturas: `docs/screenshots/cajados-lote-2.png` (os sete cajados) e `docs/screenshots/cajados-lote-2-inventario.png`.
5. **No inventário**, os sete cajados aparecem na ordem do catálogo, cada um como em mãos / disponível / à venda / bloqueado, e o efeito do cajado em mãos é dito em palavras ("queima o alvo: 4 de dano por segundo durante 3 s", "envenena: 3 de dano por segundo durante 4 s, e acumula até 3 vezes").

## Contrato de arte

As três matérias estão registradas em `tests/helpers/artAssets.ts` (peças pequenas), **sem baixar piso e sem exceção**: a fumaça, a cinza e os cristais da haste (brasa), o orvalho, o botão e o broto (espinho) e as gavinhas e o anel de névoa (gelo) foram acrescentados para cumprir o piso de cores e de curvas. O Cavaleiro, o mago com o Aprendiz e os cajados do lote 1 não mudaram.

## Verificação

- `tests/staff-lote-2.test.ts` (9): a lista contra o documento, a regra de espelhar as espadas, a queimadura (12 no total, renovar sem somar, quem caiu), o veneno (acúmulos, teto, renovar, 36 no total, entradas inválidas), a Geada contra a Rocha Viva, o tempo exato do efeito (passos de 0,1 s, passo gigante, relógio que continua ao renovar), o abate por queimadura e veneno na superfície e na caverna, a liberação por nível e o texto do efeito.
- `tests/staff-motifs.test.ts` (11): as seis matérias atrás e na frente da gema, o que se mexe com o relógio (altura das fagulhas e das pétalas, tamanho das faíscas de gelo), o brilho de dano em tudo e o cajado inteiro como soma das peças.
- `tests/browser/mage-staves.spec.ts` (desktop e Android): sete cartas no inventário; no nível 60 todos disponíveis (menos a Brisa, à venda), trocar por cada um mostra o nome, a mana e o efeito, e o último fica no save.
- Mutações: **42** estragos de propósito (cada número das fichas, as validações e o relógio dos efeitos, os acúmulos, os casos do resolvedor, os textos, o despachante e cada movimento do desenho). Oito sobreviveram na primeira rodada, revelando testes fracos (o relógio que continua ao renovar, o último tique, o passo gigante, a altura das fagulhas e das pétalas, o piscar do gelo); sete foram fechados. Sobrevive um: o degradê de cada chama (um teste só de imagem pegaria; os testes de desenho conferem as cores e as chamadas, não os pixels).

## Limites

- Queimadura e veneno não têm animação própria no monstro (ele pisca ao levar o dano, como com o fogo das espadas); o projétil e o estouro já têm a cor do cajado.
- Os números (dano, mana, 4 por segundo, 3 por acúmulo, 40%) são propostas do dono, sem medição em jogo real. Android físico não foi testado.
- Faltam o lote 3 (Sol Nascente, Lua Negra e Tempestade) e o lote 4 (Astral).
