# ADR 0074 — A Academia Arcana com função

**Estado:** entregue em 2026-11-25, direto na `main`, por pedido do dono (G1b: segunda metade do lote 1 dos cajados, [ADR 0073](0073-cajados-elementais-lote-1.md)). Segue a regra do dono de que **só entra quem tem função** (`docs/CAPITAL_EDIFICIOS.md`): a Academia Arcana, que era só fachada, passa a abrir porque vende ao Mago o primeiro cajado elemental.

## Decisões

1. **Porta e salão:** `academia-arcana` entra em `CAPITAL_ENTERABLE`; a porta cai à frente do edifício (na rua, como as outras da capital) e o salão se chama "Academia Arcana". O salão (molde de guilda) tem **duas estantes altas de grimórios** e a **mesa de estudo** no meio, com a mobília bloqueando e a saída pela porta de baixo.
2. **A mestra:** **Mestra Ilvana** (nome de trabalho; o dono ajusta em `npcs/center/capital/mageMaster.ts`), mora na rua ao lado da porta, de manto violeta e cajado, como a hospedeira, o banqueiro e a sacerdotisa. A fala diz que a Academia é dos magos, que o primeiro cajado elemental (Brisa) custa trinta Terrania Gold e que os outros se merecem ao crescer.
3. **A oferta só existe para o Mago** (`npcOffer(npc, vocação)`): o Cavaleiro conversa com a mestra, que o manda à Ordem dos Cavaleiros, sem painel de venda.
4. **A compra:** `buyStaff` (ação de loja) exige o Mago, **estar perto da mestra**, fora das casas e com o painel aberto; o preço, a posse e a recusa de quem não tem moedas são da bolsa (`Inventory.buyStaff`, ADR 0073). Comprar não exige nível (como a espada de Toren): o cajado só se usa a partir do nível dele (10 para a Brisa). A compra vai para o save.
5. **O painel da mestra** lista os cajados à venda (os que têm preço; hoje só a Brisa) com ícone, nível, dano, mana e efeito em palavras, e o botão "Comprar por 30 Terrania Gold", desligado se o Mago já tem o cajado ou não tem moedas ("Já possui"). Os outros cajados continuam liberando sozinhos pelo nível.
6. Com isso a Brisa, que o inventário mostrava como "Comprar na Academia" sem que a Academia abrisse, passa a ser alcançável.

## Verificação

- `tests/center-capital-academy.test.ts` (7): a porta, a mestra (posição na rua, registrada, falas e aparência), o salão, a oferta por vocação, a compra (perto, longe, dentro de casa, menu fechado, sem moedas, Cavaleiro, cajado que não é vendido, herói caído, duas vezes), a Brisa só se usando no nível 10 e a ligação jogo → HUD → tela. `center-capital-inn.test.ts` atualizado para as quatro portas.
- `tests/browser/capital-academy.spec.ts` (desktop e Android): a porta abre o salão e a saída volta à rua; a Mestra Ilvana vende a Brisa ao Mago (30 Terrania Gold, save conferido, "Já possui", troca no inventário e o efeito dela); sem moedas o botão fica desligado; o Cavaleiro só conversa.
- Mutações: **29** estragos de propósito (a porta, a identidade e o lugar da mestra, o registro, o salão, a oferta por vocação, cada condição da compra, a ligação com o jogo e o HUD, e o botão): todos pegos na primeira rodada.
- Capturas: `docs/screenshots/academia-arcana-salao.png` e `docs/screenshots/academia-arcana-painel.png`.

## Limites

- O salão usa os móveis que já existem (estantes e mesa); um desenho próprio de guilda arcana (círculo no chão, esfera de cristal) fica para quando houver outros serviços lá.
- A Academia vende só a Brisa: os outros cajados do lote 2 e seguintes liberam por nível (e se algum passar a ser vendido, basta ter preço na ficha).
- Equilíbrio e preço (30 Terrania Gold) são propostas do dono; sem medição em jogo real. Android físico não foi testado.
