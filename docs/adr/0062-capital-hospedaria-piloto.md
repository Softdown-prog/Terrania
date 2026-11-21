# ADR 0062 — Capital: função e interior dos edifícios, piloto da Hospedaria dos Viajantes

**Estado:** entregue em 2026-11-21, direto na `main`, por pedido do dono ("se vai existir um edifício, ele vai servir pra quê? E quais o jogador pode entrar?"). Decisão do dono: **só entra quem tem função de jogo** (14 dos 21 terrenos abrem, 7 são fachada) e o próximo passo é dar função e interior às fachadas prontas. Esta entrega é o piloto: **uma** porta, **um** interior e **um** serviço, para provar o caminho antes de repeti-lo.

## Decisões

1. **Quais abrem** fica registrado em [CAPITAL_EDIFICIOS.md](../CAPITAL_EDIFICIOS.md) e, no código, em `CAPITAL_ENTERABLE` (`world/center/capital/buildings.ts`). Hoje só a Hospedaria; um terreno novo entra na lista junto com o seu interior.
2. **Porta como a do Poço Negro:** uma entrada de NPC `kind: "door"` (`capital-hospedaria`) 29 px à frente do centro da fachada; o herói precisa estar a 25 px de lado e 28 de fundo. `CAPITAL_DOORS` é gerada da lista e falha se o terreno ainda não foi construído. `Game.interact` abre o interior com a nova `hasInterior(id)`, que reconhece a Vila, o Poço Negro e a capital.
3. **Interior:** o molde da estalagem (duas camas e o balcão), paleta própria da capital (parede de pedra azulada, piso de lajes claras, madeira de carvalho). O painel agora diz o lugar certo: **Interior · Concórdia** (antes dizia sempre "Vila da Travessia"; o Poço Negro também ficou certo).
4. **Serviço:** **Dona Brígida** (hospedeira) fica a menos de 82 px da porta e cura como a Madame Víbora: mesmo preço (`INN_REST_PRICE`, 24 Terrania Gold), mesmo efeito (vida cheia, sem veneno nem queimadura), mesma recusa se o herói já está descansado ou longe. Só a fala muda ("Dona Brígida serviu o descanso…"), num arquivo próprio (`game/messages/capitalInn.ts`).
5. **Sem mexer no que existe:** a regra de descanso é a mesma função (`restAtInn`); a Madame Víbora continua igual (coberta por teste).

## Verificação

- `tests/center-capital-inn.test.ts` (7): lista e geometria da porta; `hasInterior`; alcance da porta; sala, móveis, colisão, saída e paleta; Dona Brígida (posição, oferta e fala); serviço de descanso (e Madame inalterada); lugar do painel.
- `tests/npc-regions.test.ts` passou a contar os moradores e as portas da capital.
- `tests/browser/capital-inn.spec.ts` (desktop e Android): entrar pela porta, ver "Interior · Concórdia" e sair; pagar o descanso a Dona Brígida e conferir vida e moedas no save.
- Mutações: 11 estragos de propósito (lista vazia, porta fora do lugar, `hasInterior` sem a capital, lugar errado, paleta, oferta, distância, fala, painel, porta que não abre, fala sem catálogo); os testes pegaram todos.

## Limites

- Só uma porta abre; as outras sete da capital seguem fechadas até terem função e interior.
- O interior é um molde sem animação; chamas e fumaça são fixas.
- Android físico não foi testado.
