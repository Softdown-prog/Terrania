# ADR 0025 — Preços em moedas

**Estado:** fatia 3 do sistema de moedas entregue em 2026-11-10, direto na `main` por pedido do dono. Continua os ADRs 0023 (carteira) e 0024 (drops).

## Contexto

O dono definiu que o **gel é material de troca** e que as **compras são em moedas**. Até esta fatia o gel ainda pagava a espada, a comida, o descanso da Hospedaria do Poço Negro e o estábulo, e as moedas que as criaturas deixam não compravam nada.

## Decisões

1. **O que passa a custar moedas (Terrania Gold, com troco automático):**
   | Compra | Antes | Agora |
   | --- | --- | --- |
   | Espada de Toren | 5 de gel | 30 Terrania Gold |
   | Maçã / Pão / Carne assada (Lina) | 1 / 2 / 3 de gel | 6 / 12 / 18 Terrania Gold |
   | Descanso de Madame Víbora | 4 de gel | 24 Terrania Gold |
   | Cercado do estábulo (I) / ampliação (II e III) | 12 / 25 / 40 de gel | 72 / 150 / 240 Terrania Gold |
   Cada preço vive no arquivo do seu assunto (`Weapons.ts`, `Food.ts`, `Inventory.ts`, `MountCatalog.ts`). A conversão foi de cerca de **6 Terrania Gold por gel**, que é o que um slime deixa em média (3 a 8), então cada compra pede aproximadamente os mesmos abates de antes. Os preços mais altos passam de 100 e aparecem em Cripta Coin na tela.
2. **O que continua em gel (decisão minha, fácil de mudar):** a **poção da Lina** ("trocar 3 de gel por 1 poção") é uma troca de material por item, então segue em gel; o **cabresto** da missão do Cavalo de Batalha (3 de gel) é material de fabricação. O gel de slime continua caindo no chão como sempre.
3. **Regras:** só moeda paga as compras (gel de sobra não compra espada, comida, descanso nem cercado); recusa por falta de dinheiro não cobra nada nem muda a vida; o troco volta sozinho (pagar 24 com uma Cripta Coin devolve 76 Terrania Gold). Resultados novos: `insufficient-sword-coins`, `insufficient-food-coins`, `insufficient-rest-coins` e `no-coins` (estábulo), com mensagens que falam de moeda; `no-gel` ficou só para o cabresto.
4. **Tela:** os botões mostram o preço em moedas (`describeCoins`: "1 Cripta Coin e 50 Terrania Gold"), ficam desabilitados sem dinheiro suficiente e o diálogo mostra quanto o herói tem. Toren e Madame Víbora dizem o preço nas falas.
5. `Inventory.tradeGelForFood` virou `buyFood`; `FOODS[id].gelPrice` virou `price`; `STABLE_UPGRADE_GEL` virou `STABLE_UPGRADE_PRICE`; `INN_REST_GEL_PRICE` virou `INN_REST_PRICE`. Sem mudança de save (a bolsa já guardava as moedas) nem de Go.

## Verificação

- `tests/coin-prices.test.ts` (7 testes): a tabela de preços; equilíbrio (um slime deixa em média entre 3 e 8; a espada custa de 3 a 12 slimes, a comida mais barata cerca de um); só moedas compram e gel de sobra não; a poção segue em gel e não toca nas moedas; troco automático; texto dos valores; mensagens sem a palavra gel. Mutações conferidas: espada, comida, descanso ou estábulo pagos em gel, e poção paga em moedas reprovam.
- Testes antigos de loja, bolsa e montaria foram **atualizados para moedas, não enfraquecidos** (cada um passou a conferir também que o gel não foi tocado).
- Navegador (desktop e Android): `coin-shop.spec.ts` (comida por moedas, botão desabilitado sem dinheiro mesmo com gel, poção por gel), e os de Toren, estábulo e hospedaria atualizados.

## Limites

- Os números (30, 24, 6/12/18, 72/150/240) são um primeiro palpite, sem balanceamento medido com jogadores. Os drops de montaria, de masmorra e dos chefes não foram recalibrados.
- Quem tem save antigo com gel e sem moedas **não consegue mais comprar com o gel**: precisa derrotar criaturas para juntar moedas (o gel continua servindo para as poções).
- O Bazar e o Ossuário ainda não compram nem vendem; o loot raro continua só na bolsa.
- Não verificado: Android físico.

## Próximas fatias

Bazar e Ossuário: compra e venda de loot raro em moedas (Cripta Coin e Eclipse Crown fazem sentido aí).
