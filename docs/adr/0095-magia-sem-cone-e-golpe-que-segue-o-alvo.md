# ADR 0095 — A magia vai no alvo escolhido, mesmo de costas, e o golpe da caverna segue o alvo

**Estado:** entregue em 2026-11-27, a pedido do dono: "o mago só lança projétil de frente, o que atrapalha entre correr do monstro e atacar".

## O defeito
O Mago escolhe o monstro e a magia sai uns 0,1 a 0,2 s depois (o preparo do cajado). Nesse meio tempo o herói continua andando, e andar vira o corpo para onde se anda. Quem **foge do monstro** olha para longe dele; no instante em que a magia sai, `spellStrikeTargets` conferia o "cone" de `canStrike` (o alvo precisava estar à frente do herói, até uns 95 graus) e a magia **falhava**: gastava a mana e a recarga e não ferrava ninguém. A superfície já escondia isso porque mantém o golpe em andamento virado para o alvo; a **caverna não**, só virava o herói depois de o golpe já ter sido validado.

## O que mudou
1. **A magia não exige mais o alvo à frente** (`SpellCombat.ts`, `ANY_DIRECTION`): o alvo foi escolhido pelo jogador, então o que vale é o alcance (6 tiles), o alvo vivo e a linha de visão. A espada continua com o cone dela (golpe corpo a corpo olha para onde bate).
2. **A caverna segue o alvo como a superfície** (`CaveRoom.update`): enquanto o golpe está em andamento (`attackTime > 0`), o herói fica virado para o alvo escolhido, mesmo andando para o outro lado. Acabado o golpe, volta a olhar para onde anda. Sem alvo escolhido o herói não vira para ninguém.

Não mexi em `ClassicCombat.tick`: ele já vira o herói para o alvo antes de conferir o cone, então ali o cone nunca barrou nada.

## Testes e mutações
`tests/mage-combat.test.ts` (o teste "de costas não acerta" virou o contrário: virado para quatro direções diferentes a magia ainda vai no alvo) e `tests/cave-flee-strike.test.ts` (3): o Mago corre para longe do alvo, a magia sai e fere; durante o golpe o herói fica virado para o alvo, com outro monstro de isca na frente da fila, e depois volta a olhar para onde anda; sem alvo escolhido não vira. 5 mutações (voltar a exigir a frente, cone de 90 graus, tirar a trava de direção, virar sempre, alvo errado): nenhuma sobrevive.
