# ADR 0117 — Flecha de Ferro, compra por pacotes e escolha da flecha (Arqueiro, lote A3a)

**Estado:** entregue em 2026-11-28, oitava fatia do Arqueiro de [ARQUEIRO.md](../ARQUEIRO.md). O A3 do plano (os tipos de flecha e a compra na Irmandade dos Arqueiros) foi cortado em dois: **A3a (esta)** as regras no motor (o segundo tipo de flecha, comprar, escolher o tipo, a aljava com dois tipos), **A3b** a Irmandade na capital (porta, interior, mestre e a tela de compra) e então a liberação do Arqueiro. Nada muda ainda para o jogador, só o inventário mostra o segundo tipo.

## O que mudou
- **A Flecha de Ferro** (`weapons/arrows/iron.ts`): +3 de dano somado ao do arco (os 8 do Arco de Caça viram 11) e 3 de Terrania Gold cada. A de Junco ganhou o preço, 1 de ouro cada. Números propostos; o dono ajusta nos arquivos das flechas. Os outros seis tipos do plano ficam para lotes seguintes, como se fez com os arcos e cajados. (Por enquanto a flecha de ferro voa e se desenha como a de junco; a ponta de ferro própria fica para quando houver mais tipos.)
- **Comprar** (`Inventory.buyArrows`): um **pacote de 10** do tipo, ou só o que cabe na aljava (máximo de 99 de cada), e cada flecha é cobrada pelo preço dela (10 de junco por 10 de ouro, 10 de ferro por 30). Sem moedas para o que cabe, nada muda; aljava cheia do tipo recusa; herói caído não compra; só o Arqueiro tem aljava.
- **Escolher a flecha em uso** (`Inventory.equipArrow`): só um tipo de que há flechas.
- **A aljava com dois tipos nunca fica "travada":** se o tipo em uso acaba e o outro tem, ela passa sozinha para ele (no gasto, ao comprar quando estava sem flecha nenhuma e ao ler um save). Assim o "Sem flechas" só aparece quando não há flecha de **nenhum** tipo, e o tiro lê sempre o tipo em uso.
- **Mensagens** (`inventoryFeedback.ts`): dez respostas novas (comprou, não é Arqueiro, aljava cheia, sem moedas dizendo os dois preços, longe da Irmandade, caído, trocou, já em uso, sem flechas desse tipo).
- **Inventário:** a lista da aljava mostra os dois tipos ("Flecha de Junco · 30 de 99", "Flecha de Ferro · 0 de 99") sem mudança no código da tela, porque ela já lia o catálogo.

## Testes
`tests/archer-arrows.test.ts` (7): o catálogo e o dano de cada flecha (inclusive a defesa e o bônus em porcentagem); a aljava com dois tipos (a troca automática ao gastar, ao comprar e ao ler o save, e o que **não** troca); escolher a flecha; a compra (pacote, só o que cabe e só o que cabe é cobrado, falta de 1 de ouro, caído, tipo inexistente, outras vocações); a troca pela bolsa e o save; o mundo (o combate fica pronto com flechas de ferro mesmo sem junco); e as mensagens. Ajustado `archer-bow` (as contagens agora têm os dois tipos) e o teste de navegador do inventário. **Mutações:** 17 tentadas; 16 pegas e uma equivalente hoje (a ordem do catálogo na troca automática só importa com três ou mais tipos).

## O que vem depois
**A3b:** a Irmandade dos Arqueiros, na capital: porta, interior, o **mestre arqueiro** (no molde da Academia Arcana) e a tela de compra e de escolha da flecha, com a regra "só entra quem tem função"; **então a liberação** do Arqueiro na tela de escolha. Depois A4 (os dez arcos restantes), A5 (as habilidades) e A6 (os onze conjuntos de roupa).
