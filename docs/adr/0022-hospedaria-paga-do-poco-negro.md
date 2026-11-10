# ADR 0022 — Descanso pago na Hospedaria do Poço Negro

**Estado:** entregue em 2026-11-10, direto na `main` por pedido do dono. O preço passou de 4 de gel para 24 Terrania Gold no [ADR 0025](0025-precos-em-moedas.md). Primeira fatia de economia da cidade do Sul (`docs/POCO_NEGRO.md`).

## Contexto

O Poço Negro tinha muros, quatro bairros, doze moradores e três interiores, mas nenhum serviço: Madame Víbora só dizia que o descanso pago viria "quando a hospedaria tiver uma economia real". A moeda do jogo já existe: o **gel** (Lina vende poções e comida, Toren vende a espada).

## Decisões

1. **Descansar custa 4 de gel** (`INN_REST_GEL_PRICE`, em `engine/character/Inventory.ts`) e dá **vida completa e remove todos os status** (veneno, queimadura, gelo, lentidão, infecção...). O novo `Player.cleanse()` limpa status e temporizadores, sem tocar em nutrição.
2. **Não cobra quem não precisa:** vida cheia e sem status devolve "já está descansado" e o gel fica. Sem gel suficiente, a vida não muda. Herói caído não descansa (só volta por `respawn()`, invariante do motor).
3. **Mesmo mecanismo das outras lojas:** `npcOffer("south-madame")` devolve `{ item: "rest" }`, o diálogo mostra "Descansar na hospedaria · 4 de gel" (desabilitado sem gel) e a ação é `restAtInn` em `game/actions/shopActions.ts`, que exige diálogo aberto, fora de interior e **ao lado de Madame Víbora**.
4. Texto de Madame atualizado para dizer o preço. O Bazar, a Casa de Venenos, o Ossuário, a Fornalha, o Estábulo e a Arena continuam sem serviço.
5. Sem mudança de save, de Go ou de arte.

## Verificação

- `tests/shop-actions.test.ts` (+2): o descanso só funciona perto de Madame, com menu aberto e fora de interior; as recusas não cobram; cobra 4, cura tudo e limpa os status; sem gel não cura; vida cheia e sem status não cobra; só o veneno já justifica; herói caído continua caído. `tests/interactions.test.ts`: a oferta de Madame e a ausência de oferta no Bazar.
- Mutações conferidas: sem cobrança, sem limpar os status, cobrar com vida cheia e não checar a distância de Madame reprovam.
- `tests/browser/south-inn.spec.ts` (desktop e Android): conversa com Madame, paga, a vida sobe, o gel da bolsa salva cai de 8 para 4, e um segundo descanso não cobra.

## Limites

- O descanso é instantâneo e não tem cena nem quarto: Madame cura no próprio diálogo. A Hospedaria interior continua só visitável.
- Cura também na caverna ou nos andares não existe: só no Poço Negro.
- O preço (4 de gel) é um primeiro número, sem balanceamento medido.
- Não verificado: Android físico.

## Próximas fatias (cidade do Sul)

Venda e compra de loot raro no Bazar e no Ossuário, alquimia na Casa de Venenos, montarias do Estábulo, missões do poço.
