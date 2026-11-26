# ADR 0085 — O Mago recupera mana comendo

**Estado:** entregue em 2026-11-26, direto na `main`, por pedido do dono ("a mana hoje se regenera sozinha; o ideal é que também se regenerasse comendo"). Os números abaixo são propostas que o dono ajusta (um número por alimento, no arquivo do alimento).

## Decisões
1. **Cada alimento tem a sua porcentagem da mana máxima** (`manaPercent` na ficha do alimento, um arquivo por alimento): **maçã 8%, pão 15%, carne assada 25%**. A mana volta **na hora** (a vida continua voltando aos poucos, como sempre), arredondada (`foodMana`), e nunca passa do máximo do nível.
2. **Só quem usa mana ganha**: para o Cavaleiro a mana máxima é 0, então a comida dele não muda em nada (nem o texto).
3. **Só se a refeição foi feita**: comer recusado (ritmo de comer de 5 s, estômago cheio, sem o alimento) não dá mana nem gasta o alimento. O ritmo de comer limita o ganho: a carne de cada 5 s rende no máximo 5% da mana por segundo, o dobro da recarga natural, e custa 18 Terrania Gold por refeição.
4. **A refeição vive na simulação** (`OfflineSimulation.eatFood`), que junta a regra da bolsa (vida) com a da mana (`gainMana`, que agora devolve quanto coube); a ação de comer só mostra o resultado.
5. **Texto**: ao Mago, "Refeição feita. Sua vida volta aos poucos e você recupera N de mana na hora."; a descrição do alimento na mochila diz "e 25% da mana na hora" só para quem usa mana.
6. A mana ganha comendo entra no save como qualquer mana.

## Verificação
- `tests/food-mana.test.ts` (7): as porcentagens e o arredondamento (mana inválida vale 0); a refeição do Mago (mana na hora, vida aos poucos, recusar não dá mana nem gasta o pão, a carne dá mais que a maçã); o teto do máximo e o que cabe; o Cavaleiro igual; as mensagens; o save e o nível; a ligação.
- `tests/browser/mage-food.spec.ts` (desktop e Android): a mochila diz "25% da mana na hora", comer a carne mostra a mensagem com 13 de mana e a barra sobe na hora.
- Mutações: **13** estragos de propósito (cada porcentagem, o arredondamento, mana inválida, recusado dando mana, comida sem mana, o teto, o texto, a ligação da ação e da mochila); os 13 foram pegos.

## Limites
- A mana por comida é só para o Mago (hoje a única vocação com mana); o Druida (proposta em `docs/DRUIDA.md`) vai reaproveitar a mesma regra.
- O equilíbrio (8/15/25%) é uma proposta: a comida barata passa a ser uma forma de dobrar a recarga em combate longo. Se ficar forte demais, é só baixar os números ou alongar o ritmo de comer.
- Falta a **poção de mana** (um item próprio) e a mana por **meditar parado**; estão fora desta entrega.
