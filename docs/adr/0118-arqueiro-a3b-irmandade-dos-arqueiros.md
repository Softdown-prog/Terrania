# ADR 0118 — A Irmandade dos Arqueiros ganha função (Arqueiro, lote A3b)

**Estado:** entregue em 2026-11-28, nona fatia do Arqueiro de [ARQUEIRO.md](../ARQUEIRO.md). Fecha o A3: a compra de flechas, que o A3a deixou pronta no motor, agora tem lugar no jogo. Segue a regra do dono, "só entra quem tem função", no mesmo molde da Academia Arcana ([ADR 0074](0074-academia-arcana.md)). O Arqueiro continua bloqueado na tela de escolha; a liberação é a próxima fatia.

## O que mudou
- **A porta:** `arqueiros` entra em `CAPITAL_ENTERABLE`; a porta `capital-arqueiros` fica à frente do prédio (y + 29) e abre o salão. O Quartel, o Conselho e a Ordem dos Cavaleiros seguem como fachada.
- **O salão** (`InteriorRoom`, `capital-arqueiros`): duas estantes e a mesa do mestre, mobília que bloqueia; o herói nasce na porta e sai por ela.
- **O mestre** (`src/npcs/center/capital/archerMaster.ts`, um NPC por arquivo): **Mestre Orlan**, "Mestre da Irmandade dos Arqueiros", na rua perto da porta, com aparência própria (túnica verde-musgo, barba cinza) e três falas que explicam os preços.
- **A oferta** (`npcOffer`): só o Arqueiro recebe o painel `archery`; Cavaleiro e Mago apenas conversam.
- **A compra e a troca** (`shopActions.buyArrows` / `equipArrow`): perto do mestre, fora das casas, com o painel aberto; preço, pacote de 10 e aljava cheia são da bolsa (ADR 0117). Trocar a flecha em uso vale em qualquer lugar.
- **O painel** (`game-page.html`, `hud.service.arrowRows`): uma linha por flecha com nome, dano extra, preço, quantidade, "Comprar 10 por …" e "Usar / Em uso". Botões `buy-arrows-<id>` e `use-arrows-<id>`; desligados com a aljava cheia, sem moedas ou sem flechas daquele tipo.
- **Preços (propostos, o dono ajusta):** só as flechas de **Junco** (1 de ouro cada, 10 por 10) e de **Ferro** (3 cada, 10 por 30). As raras saem de monstros e missões nos lotes seguintes.

## Testes
`tests/center-capital-archers.test.ts` (7): porta e salão; o mestre (id, nome, posição, registro, aparência, falas, fora da rota do Tomé); mobília e saída; a oferta por vocação; a compra (perto/longe, casa, painel fechado, sem moedas, outras vocações, caído, aljava cheia); a troca com o save; e a ligação Game/GameUi/HUD/tela. `tests/browser/capital-archers.spec.ts` (3 × desktop e Android): a porta abre e fecha o salão; o Arqueiro compra ferro e junco, o save confere as moedas e a aljava e a flecha de ferro entra em uso; o Cavaleiro só conversa. Ajustados os testes da hospedaria e da academia (agora cinco portas). **Mutações:** 13 tentadas, todas pegas (a primeira, a trava de vocação em `buyArrows`, só se via com o Cavaleiro longe do mestre; ganhou o caso).

## O que vem depois
**Liberar o Arqueiro** na tela de escolha (`playable: true`), depois A4 (os dez arcos), A5 (as habilidades) e A6 (os onze conjuntos de roupa).
