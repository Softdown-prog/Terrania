# ADR 0065 — O herói Mago: decisões e fundação (vocação e mana)

**Estado:** a fundação foi entregue em 2026-11-23, direto na `main`, por pedido do dono ("vamos começar agora a criar o personagem mago e depois os cajados dele, as animações de ataque..."). Esta entrega **não muda nada para o jogador**: o Mago ainda não pode ser escolhido. Ele só será liberado na fatia F, quando estiver jogável de ponta a ponta.

O [ROADMAP](../ROADMAP.md) dizia para concluir o Cavaleiro antes das outras vocações. O dono decidiu começar o Mago agora, então a nota do roadmap foi atualizada (o Cavaleiro continua como a vocação de referência e de partida).

## Decisões do dono

1. **Como vira mago:** escolhe-se **Cavaleiro ou Mago ao criar um mundo novo**. A vocação é do mundo e não muda. Saves antigos continuam Cavaleiro.
2. **Como o mago ataca:** **projétil mágico à distância que gasta mana** (barra de mana que recarrega com o tempo). O Cavaleiro continua com a espada de perto e sem mana.
3. **Cajados:** **11, espelhando as 11 espadas** (mesmos níveis e temas de elemento: gelo, magma, veneno, tempestade, astral...), feitos **em lotes**.

## O que esta entrega faz (fatia A)

- **Vocação do herói** (`engine/character/classes/`, um arquivo por assunto): `HeroClassId` = `knight | mage`; o que não é vocação conhecida vira Cavaleiro; a vocação é lida do save só se for do mesmo mundo.
- **Ficha por vocação** (`knight.ts`, `mage.ts`): o Cavaleiro nunca tem mana; o Mago tem **50 de mana no nível 1, mais 10 por nível**, e a barra **enche inteira em 20 s de jogo** em qualquer nível. **Números propostos**: o dono ajusta em `mage.ts`.
- **Mana no motor** (`OfflineSimulation`): `mana`, `maxMana`, `usesMana`, `spendMana(custo)` (tudo ou nada). A mana recupera com o tempo de jogo, na superfície e fora dela (`advanceClock`, usado na caverna); o máximo acompanha o nível; **renascer devolve a mana cheia**; o Mago novo começa de mana cheia.
- **Save:** `heroClass` e `mana` só existem para o Mago (o save do Cavaleiro fica igual ao de antes); tudo é normalizado ao carregar (mana de 0 ao máximo do nível, com duas casas).

## O plano em fatias (cada uma é uma entrega com teste)

| Fatia | O quê | Estado |
| --- | --- | --- |
| A | Fundação: vocação e mana no motor e no save | **feita (esta)** |
| B | Corpo do herói mago: mistura de túnica azul-violeta, manto escuro e chapéu pontudo, desenhado por vocação, no contrato de arte | **feita** ([ADR 0067](0067-corpo-do-heroi-mago.md)) |
| C | Cajados: ficha, desenho e o primeiro cajado (Aprendiz) | **feita** ([ADR 0068](0068-cajados-do-mago.md)) |
| D | Combate à distância: projétil com mana, na superfície **e na caverna** (mesma fórmula de defesa e alvos), mana sincronizada na caverna, descanso devolve mana | **feita** ([ADR 0069](0069-combate-a-distancia-do-mago.md)) |
| E1 | Animação de conjurar, projétil e impacto, na superfície **e na caverna** | **feita** ([ADR 0070](0070-conjuracao-do-mago.md)) |
| E2 | A barra de mana na tela | **feita** ([ADR 0071](0071-barra-de-mana.md)) |
| F1 | Tela de escolha do herói ao criar o mundo, com o Mago bloqueado ("Em breve") | **feita** ([ADR 0066](0066-tela-de-escolha-do-heroi.md)) |
| F2 | Mago jogável: **liberado** (`playable`), inventário do Mago (cajado, sem armadura), ferreiro sem espada para ele, Mago desenhado nas casas. A loja de cajados e a Academia Arcana com função esperam o 2º cajado (G) | **feita** ([ADR 0072](0072-mago-jogavel.md)) |
| G | Cajados 2 a 11, em lotes ([lista](../MAGO_CAJADOS.md)). Lote 1: Brisa, Rocha Viva e Marés ([ADR 0073](0073-cajados-elementais-lote-1.md)) e a Academia Arcana | G1a **feita**; G1b **feita** ([ADR 0074](0074-academia-arcana.md)); lotes 2 e 3 **feitos** ([ADR 0075](0075-cajados-elementais-lote-2.md), [ADR 0076](0076-cajados-elementais-lote-3.md)); lote 4 a fazer |

Perguntas que ficam para as fatias seguintes: a vida do Mago (hoje a mesma do Cavaleiro; talvez menor), o custo de mana e o alcance de cada cajado, e como o Mago consegue cajados (loja da Academia Arcana? loot?).

## Verificação

- `tests/hero-classes.test.ts` (8): as vocações e o que vira Cavaleiro; a mana por nível e a recarga de 20 s; mana do save e regeneração; o Cavaleiro sem mana e com save igual ao de antes; o Mago gastando tudo ou nada e recuperando (superfície e fora dela); máximo por nível e renascimento; a vocação no save e outro mundo; o save do navegador com normalização.
- Mutações: 18 estragos de propósito (vocação sem normalizar, padrão virando mago, Cavaleiro com mana, os três números da mana, tetos e dados inválidos, regeneração, renascimento, gasto sem mana, vocação fora do save e herdada por outro mundo); os testes pegaram todos.

## Limites

- Nada disto aparece no jogo ainda; é preparação.
- A mana na caverna (a simulação da superfície e a da caverna têm o herói em objetos separados) é ligada na fatia D, junto do combate.
- Android físico não foi testado.
