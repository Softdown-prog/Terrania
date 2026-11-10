# ADR 0023 — Moedas e carteira

**Estado:** fatia 1 entregue em 2026-11-10, direto na `main` por pedido do dono. Os drops de moeda vieram na fatia 2 ([ADR 0024](0024-drops-de-moedas.md)); falta a troca dos preços de gel por moedas (ver "Próximas fatias").

## Contexto

Até aqui o gel pagava tudo (poção, comida, espada, descanso). O dono definiu o desenho certo: o **gel é material de troca**; as **compras são em moedas**, que se unem sozinhas a cada 100 numa moeda maior, para o jogador não ter que organizar o dinheiro. Ele escolheu os dois primeiros nomes (Terrania Gold e Cripta Coin) e deixou o terceiro e a aparência de todos para nós, com a regra de não usar nomes de pedra preciosa ou metal comum (cristal, platina...).

## Decisões

1. **Três moedas, cada uma no seu arquivo,** em `src/engine/character/coins/`: **Terrania Gold** (a unidade básica, ouro), **Cripta Coin** (vale 100 Terrania Gold, violeta, com um arco de pedra) e **Eclipse Crown** (vale 100 Cripta Coin, negra com um anel dourado e uma coroa, como o Sol Negro). `index.ts` só agrega (`COIN_TIERS`). O nome "Eclipse Crown" é nosso e pode mudar.
2. **O dinheiro é um único inteiro, em Terrania Gold** (`Inventory.coins`, `InventoryState.coins`). As moedas maiores **não são guardadas à parte**: `coinBreakdown(total)` as calcula, então 99 + 1 vira 1 Cripta Coin e 100 Cripta Coin viram 1 Eclipse Crown **sempre, sozinho**, na tela e no save. Pagar dá o troco sozinho (pagar 1 com uma Cripta Coin devolve 99 Terrania Gold). Não existe moeda "solta" para o jogador juntar.
3. **Teto:** 9.999 Eclipse Crown, 99 Cripta Coin e 99 Terrania Gold (`MAX_COINS` = 99.999.999). `addCoins` devolve quantas couberam; `spendCoins` é atômico e recusa valor inválido ou maior que a carteira.
4. **Save:** `coins` só é gravado quando é maior que zero, e normalizado (inteiro seguro de 0 ao teto) no carregamento; save antigo sem o campo carrega com zero.
5. **Bolsa:** cada moeda que o total forma aparece como uma célula (a Terrania Gold fica sempre, mesmo zerada), com ícone próprio. Moeda não se usa nem se equipa. O gel continua à parte, como material.
6. Sem mudança de Go, de colisão, de monstros ou de preço.

## Verificação

- `tests/coins.test.ts` (5 testes): um arquivo por moeda, em ordem de valor, e nenhum nome proibido; junção a cada 100 (99/100/101, 9.999, 10.000, 10.250, teto) e as moedas somam o total; normalização de número sujo; a bolsa ganha, paga com troco e nunca fica negativa, com teto; ida e volta pelo save, save antigo e save sujo. Mutações conferidas: junção a cada 10, sem teto, pagar sem ter, não salvar e não carregar reprovam.
- `tests/browser/coins.spec.ts` (desktop e Android): 10.250 aparece como 1 Eclipse Crown, 2 Cripta Coin e 50 Terrania Gold com os três ícones; o gel segue à parte; moeda não tem botão de ação; sem moedas só a Terrania Gold zerada; 100 Terrania Gold já são 1 Cripta Coin.
- Capturas da bolsa no jogo real (Chromium desktop).

## Limites (e por que "devagar")

- **Ainda não há como ganhar moedas** (sem drops) e **ninguém cobra em moeda**: os preços continuam em gel. Esta fatia só põe a carteira, a regra de junção, o save e a bolsa.
- Os ícones são SVG simples de 32 × 32 (como os outros da bolsa); não há moeda desenhada em Canvas, no chão ou nas mãos do herói.
- Não verificado: Android físico.

## Próximas fatias

1. **Drops de moeda:** monstros deixam Terrania Gold no chão (e Cripta Coin e Eclipse Crown de masmorras e chefes), com coleta como a do gel.
2. **Preços em moeda:** poção, comida, espada, estábulo e o descanso da Hospedaria do Poço Negro passam a cobrar em moedas; o gel fica só para troca por itens.
3. **Bazar e Ossuário:** compra e venda de loot raro em moedas.
