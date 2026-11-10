# ADR 0024 — Drops de moedas

**Estado:** fatia 2 do sistema de moedas entregue em 2026-11-10, direto na `main` por pedido do dono. Continua o ADR 0023 (carteira e bolsa). Falta trocar os preços de gel por moedas.

## Contexto

A carteira existia, mas não havia como ganhar dinheiro. O dono pediu que as criaturas deixem moedas (Terrania Gold, Cripta Coin e a terceira), e que elas se unam a cada 100, o que a carteira já faz sozinha.

## Decisões

1. **Toda criatura derrotada deixa moedas.** A quantia (`rollCoinDrop`, em `engine/character/coins/drops.ts`) vem da experiência da espécie, entre 25% e 75% dela, e é **determinística pelo id da criatura**: o mesmo monstro deixa sempre a mesma quantia. Um slime (10 de experiência) deixa de 3 a 8 Terrania Gold; um golem de basalto (240) deixa de 60 a 180.
2. **Na superfície as moedas caem no chão,** ao lado do gel, no ponto onde a criatura caiu, e o herói as recolhe ao chegar perto (a mesma distância do gel). O drop é `{ item: "coin", amount }` com id `<criatura>:coin`, vai e volta do save e só é carregado se a criatura está na lista de derrotadas. A carteira tem teto: o que não couber **fica no chão** até haver espaço.
3. **Nas masmorras o dinheiro vai direto para a bolsa** (como os materiais), em `engine/rooms/CaveRewards.ts`. Os slimes de treino da gruta de Aela seguem dando só gel.
4. **O chefe deixa um baú:** além da quantia normal, de 4 a 6 vezes a experiência da espécie (o Verme da Areia deixa algumas Cripta Coin) e, com **3% de chance** (`BOSS_CROWN_CHANCE`, também por id), **1 Eclipse Crown inteira**. Assim as três moedas podem aparecer.
5. **Arte:** `src/render/coinDrop.ts` desenha um montinho de três moedas com espessura, halo pulsante e reflexo que passa, com a marca de cada moeda (T, arco de cripta, coroa). O montinho é da maior moeda que o valor forma (`coinDropTier`: 100 ou mais é cripta; 10.000 ou mais é coroa). Registrado como `prop` no contrato de arte, uma peça por moeda; a primeira versão da Eclipse Crown tinha 9 cores contra o piso de 10, e **o piso não foi baixado, a peça foi melhorada**.
6. Sem mudança de Go. `LootDrop` virou `GelDrop | CoinDrop`; o gel segue igual.

## Verificação

- `tests/coin-drops.test.ts` (9 testes): faixas de quantia por espécie e determinismo; baú do chefe e a coroa rara; moeda do desenho; ida e volta do save e dados sujos; slime deixa gel e moedas e andar até lá recolhe os dois; criatura regional só deixa moedas e longe a moeda espera; sobrevive ao recarregar (e é descartada sem a criatura derrotada); carteira cheia deixa o resto no chão; masmorra premia direto, o chefe com o baú, uma vez só, e o treino só dá gel. Mutações conferidas: sem drop, sem recolher, sem restaurar do save, sumir com o resto, chefe sem baú e masmorra sem moeda reprovam.
- `tests/browser/coin-drops.spec.ts` (desktop e Android): o mundo carrega as moedas do save, o herói anda até elas, a carteira chega a 250 e a bolsa mostra 2 Cripta Coin e 50 Terrania Gold.
- Capturas no jogo real: os três montinhos e o gel no chão.

## Limites

- **Ainda ninguém cobra em moeda:** poção, comida, espada, estábulo e o descanso de Madame Víbora continuam em gel (próxima fatia). Hoje o jogador junta moedas sem poder gastá-las.
- Não há aviso na tela do tipo "+12 Terrania Gold" ao recolher; a quantia aparece na bolsa.
- As quantias (25% a 75% da experiência; baú de 4 a 6 vezes) são um primeiro número, sem balanceamento medido contra os preços futuros.
- Em masmorra o dinheiro não aparece no chão, só entra na bolsa.
- Não verificado: Android físico.

## Próximas fatias

1. **Preços em moeda:** poção, comida, espada, estábulo e o descanso passam a cobrar em moedas; o gel fica só para troca por itens.
2. **Bazar e Ossuário:** compra e venda de loot raro em moedas.
