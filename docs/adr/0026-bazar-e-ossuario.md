# ADR 0026 — Bazar das Raridades e Ossuário compram loot

**Estado:** entregue em 2026-11-10, direto na `main` por pedido do dono. Continua os ADRs 0023 a 0025 (moedas). Primeira de três tarefas seguidas no Sul.

## Contexto

O loot das criaturas (saque comum e os dez raros do Sul) só ia para a bolsa, sem uso. As falas de Zinha (Bazar) e do Coletor Marn (Ossuário) diziam que ainda não compravam nada. Com as moedas prontas, faltava transformar o saque em dinheiro.

## Decisões

1. **Duas bancas, dois compradores** (`engine/character/coins/market.ts`): o **Bazar das Raridades** (Zinha Dedos-de-Cobre) compra os **dez raros do Sul**; o **Ossuário** (Coletor Marn) compra o **saque comum** das criaturas. Cada banca recusa o que não é dela, e ninguém compra o que nenhuma criatura deixa cair.
2. **Preço pela chance de queda, em Terrania Gold:** o raro vale cerca de 4 ÷ chance, em passos de 5 (Dente Dourado de Roedor, 3,5%: **115**; Pérola do Ventre do Verme, 1,2%: **335**), então os dez ficam entre 100 e 400 e o mais raro vale mais. O comum vale cerca de 0,6 ÷ chance, no mínimo 1 (de 1 a poucos Terrania Gold por peça). Um raro sempre paga mais que qualquer comum.
3. **Venda atômica na bolsa** (`Inventory.sellMaterial`): só vende o que a banca compra, o que o herói tem e se a carteira comporta o total; pedir mais do que tem vende o que tem; quantidade inválida não vende nada; o item que acaba some da bolsa.
4. **Só ao lado do comprador certo,** com o diálogo aberto e fora de interior (`shopActions.sellMaterial`). A mensagem diz o que foi vendido e quanto entrou, por exemplo "Vendeu 1 × Dente Dourado de Roedor por 1 Cripta Coin e 15 Terrania Gold".
5. **Tela:** o diálogo de Zinha e de Marn lista o que o herói tem e a banca compra, com o preço de cada unidade e os botões "Vender 1" e "Vender todos"; sem nada compravel, diz isso. As falas dos dois foram atualizadas.
6. Sem mudança de save (a bolsa já guardava materiais e moedas), de Go ou de arte.

## Verificação

- `tests/market.test.ts` (6 testes): o Bazar compra os dez raros e o mais raro vale mais; o Ossuário compra todo o saque comum, barato, e nenhuma banca compra item inventado; a venda paga em moedas, tira só o que vendeu e recusa o que a banca não compra ou quantidade inválida; carteira cheia não vende; só se vende ao lado do comprador certo; as ofertas de Zinha e Marn. Mutações conferidas: não tirar o item, qualquer banca comprar tudo, ignorar carteira cheia e mudar o preço reprovam.
- `tests/browser/south-market.spec.ts` (desktop e Android): vender o raro a Zinha (115 moedas, 1 item a menos, o comum não aparece) e vender todo o comum ao Marn (o raro não aparece).

## Limites

- Os preços são um primeiro palpite, sem balanceamento. Não há **compra** de itens nessas bancas (só venda ao comprador).
- O saque de montarias (domar) não tem comprador.
- Não verificado: Android físico.
