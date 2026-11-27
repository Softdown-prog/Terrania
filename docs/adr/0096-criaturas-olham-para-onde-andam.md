# ADR 0096 — As criaturas olham para onde andam

**Estado:** entregue em 2026-11-27, a pedido do dono: "o andar das criaturas não está coerente, elas estão andando de lado".

## O defeito
Nenhuma criatura tinha direção: cada espécie era desenhada sempre olhando para o mesmo lado (a maioria das do Centro olha para a esquerda). Quando andava para o lado contrário, o lobo andava de costas e o rato "de lado".

## O que mudou
1. **`RegionalMonster.facing`** (-1 esquerda, 1 direita, só desenho, sem regra de jogo): vira para o lado em que a criatura anda (se o passo é pelo menos 40 % horizontal; subir ou descer não vira o corpo) e, **parada perto do herói** (menos de 245 de distância e mais de 6 px de lado), encara o herói. Ao fugir olha para onde corre. Começa olhando para a esquerda.
2. **`src/render/creatures/shared/facing.ts`**: a tabela `NATURAL_FACING` diz para que lado cada espécie **de perfil** é desenhada (13 olham para a esquerda: rato, aranha, besouro, cobra-cipó, javali, lobo, Raiz-Viva, Ent, rato das dunas, víbora, abutre, serpente da tempestade e salamandra; 4 para a direita: lobo glacial, grifo, mamute e urso polar). As espécies **de frente ou de cima** (golens, caranguejo, slimes, cogumelo, morcego, os humanoides…) não estão na tabela e nunca viram.
3. **Espelho só no corpo:** as três molduras de criatura (`regionalFrame`, `wave2Frame`, `wave3Frame`) pintam o corpo por `paintFacing`, que espelha quando a criatura olha para o lado contrário ao do desenho. A sombra e a barra de vida ficam de fora (a barra continua enchendo da esquerda para a direita). O espelho entra **dentro** do quadro iluminado, então a luz continua vindo do mesmo lado, e a chave do cache (`facingKey`) ganha o espelhamento: o quadro espelhado é outro quadro, e as espécies de frente continuam dividindo o mesmo.

## Testes e mutações
`tests/creature-facing.test.ts` (8): a tabela (17 espécies, os lados conhecidos); quando se espelha e quando não (direção ausente ou inválida nunca); o desenho espelha uma vez a mais do lado contrário e os de frente saem iguais; sombra antes do espelho e barra igual dos dois lados; o monstro olha para onde anda, encara o herói parado e não balança colado nele; o limiar da diagonal. `tests/lighting.test.ts` ganhou a conferência de que as três molduras usam `facingKey` e `paintFacing`. 19 mutações (lados trocados, espelho ao contrário, chave do cache sem o espelho, moldura sem espelho, limiares, encarar de longe): nenhuma sobrevive (a única "sobrevivente" é uma mutação sem efeito).

## Limite
A tabela foi feita olhando as 42 espécies desenhadas lado a lado; se uma nova espécie de perfil entrar, ela precisa de uma linha em `NATURAL_FACING` (sem a linha ela só não vira, como antes).
