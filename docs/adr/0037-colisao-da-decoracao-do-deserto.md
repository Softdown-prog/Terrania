# ADR 0037 — Colisão da decoração do deserto

**Estado:** entregue em 2026-11-11, direto na `main` por pedido do dono. Completa o ADR 0036.

## Contexto

A decoração do deserto (ADR 0036) era só visual: o herói passava por cima de cactos e arbustos, o que parece errado. O dono pediu o sistema de colisão antes de continuar a campanha visual. Havia dois cuidados: o `canMoveOnSeed` também serve à **geração** do mundo (as entradas de caverna são escolhidas com ele), então a decoração não podia entrar nele; e o monstro não pode nascer preso dentro de um cacto.

## Decisões

1. **Colocação e colisão no mundo, sistema próprio** (`src/world/south/decor/`, um assunto por arquivo): `types.ts`, `placement.ts` (que peça cada tile tem; saiu do `render`, que não pode ser a fonte da colisão), `shape.ts` (o formato 0 a 3 a partir da variação: uma conta só, usada pelo desenho e pela colisão), `footprints.ts` (a base de cada peça), `eligibility.ts` (areia livre, sem pedra nem árvore, fora da cidade e longe de ruínas e torres) e `blocks.ts` (o bloqueio). `Tile` não ganhou nenhum campo. O Go não espelha ruínas, torres nem esta decoração.
2. **O que bloqueia:** o **cacto** (os quatro formatos, bases de 4,5 a 9 px) e o **arbusto lenhoso** (três formatos, 5 a 7 px). O capim seco, os ossos, a terra rachada e a bola de espinhos que o vento rola (formato 3 do arbusto) ficam livres. A base é um círculo no ponto onde a peça é desenhada, somado ao corpo de 7 px que anda.
3. **Barato:** um hash descarta cerca de 91 % dos tiles antes de consultar o terreno (`mayHaveDecor`), e o bloqueio olha só os tiles ao redor.
4. **Geração intacta:** nasce `canWalkOnSeed` = `canMoveOnSeed` + decoração. O `SeedCollision.canMove` (movimento do herói e dos monstros) e a escolha do lugar onde monstros nascem (`RegionalMonster` e `southSiteSpawns`) usam a nova; o `canMoveOnSeed` continua sendo o da geração, e `caves.ts` não o toca. As entradas de caverna do Sul não mudam de lugar (as impressões digitais das cavernas do deserto continuam passando).
5. **Ninguém fica preso:** monstros nunca nascem dentro de uma peça que bloqueia (testado sobre dezenas de chunks reais). Um save antigo que deixou o herói no meio de um cacto passa por `freeSpotNear` (o ponto livre mais próximo, até 64 px, em anéis e direções fixos); isso vale só quando o terreno, os marcos e a cidade estão livres e só a decoração bloqueia, e um save sobre outro obstáculo volta ao ponto inicial como sempre (o teste existente desse comportamento continua passando).
6. A decoração não nasce no corpo de uma torre nem junto dele, nem em ruínas (com 14 px de folga).

## Verificação

- `tests/south-decor-world.test.ts` (12 testes): um assunto por arquivo; colocação (determinística, só no deserto, densidade e pesos, sorteio barato que nunca descarta uma peça); formato por uma conta só; bases (livres e bloqueantes); a peça só em chão livre, fora da cidade e longe de ruínas e torres, e cada regra é necessária (centenas de tiles recusados pela cidade, pela pedra, pela ruína e pela torre); o bloqueio como círculo (dentro bloqueia, fora liberta, nas quatro direções) e o que é livre nunca bloqueia; `canWalkOnSeed` e o `SeedCollision` bloqueiam e concordam com `canMoveOnSeed` em todo o resto (só a decoração explica a diferença), e `caves.ts` não depende dela; um corpo andando para no cacto; monstros não nascem presos; `freeSpotNear`; o save no meio do cacto, sobre pedra e já livre; e quem importa a decoração (só a colisão do mundo e o desenho).
- Mutações conferidas (todas reprovadas, menos uma equivalente na regra de chão): raio, base zero, alcance de vizinhos, cacto ignorado, bases trocadas, cidade, pedra e árvore, ruína e torre, formato, `canWalkOnSeed` sem a decoração, o `SeedCollision` sem ela, raio do corpo, `freeSpotNear` (ponto livre e alcance), spawn pelo `canMoveOnSeed` e o save sem a regra "só a decoração bloqueia". Um mutante sobreviveu à primeira amostra do deserto (tirar a regra das torres) e ganhou um teste com todas as torres de uma área grande.
- `tests/browser/south-decor-collision.spec.ts` (desktop e Android): o herói andando para a direita para diante de um cacto e, num trecho livre, segue (o spec falha sem a colisão).

## Limites

- A decoração pode ser desenhada sobre a entrada de uma caverna (não há exclusão por entrada, para não acoplar a decoração à geração das cavernas); a entrada continua alcançável por outros lados.
- Só o Sul: neve, vulcânico, mar e brejo ainda não têm decoração própria.
- Não verificado: Android físico.
