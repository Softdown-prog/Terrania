# ADR 0097 — Os monstros da caverna voltam dentro do andar

**Estado:** entregue em 2026-11-27, a pedido do dono: "tem que ver se os respawns estão funcionando nas cavernas".

## O defeito
O prazo de volta existe desde o [ADR 0029](0029-tempo-de-volta-dos-monstros.md) e corre dentro das cavernas, mas só era **aplicado ao entrar** na caverna ou **trocar de andar** (`expireDefeats`). Quem ficava no mesmo andar limpava tudo e nunca via ninguém voltar.

## O que mudou
`CaveRoom.respawnTick(dt, release)`, chamado em cada quadro de `tickCave` depois de os abates serem anotados:
- A caverna passa a **guardar de onde cada criatura nasce** (o elenco inteiro do andar, inclusive quem já tinha caído no save: o povoamento sorteia todos e tira os derrotados logo depois; o sorteio não depende de quem caiu).
- A cada segundo `release` (`sim.expireDefeats`) devolve ao mundo quem já pode voltar, e a criatura **reaparece onde nasceu**, nova (vida cheia), **sem o que deixou no chão** (gel e moeda).
- Só reaparece com o herói a **170 px ou mais** do lugar (a mesma distância da primeira povoação): ninguém surge em cima dele; se ele estiver perto, a criatura espera.
- Quem está vivo não é refeito. O prazo é o de sempre (60 s + 1,5 × experiência, entre 1 e 10 minutos; o chefe, 30 minutos; os slimes de treino da Aela nunca voltam).

## Testes e mutações
`tests/cave-respawn.test.ts` (9, rodando o `tickCave` de verdade): volta no lugar, com a vida cheia, só depois do prazo; não surge perto do herói (169 px ainda não); some a moeda do chão; quem já estava caído ao entrar também volta; a caverna de treinamento nunca devolve os slimes; o chefe só volta aos 30 minutos; quem está vivo não é refeito; o slime volta como slime; a conferência é de segundo em segundo e `dt` inválido não faz nada. 17 mutações: nenhuma sobrevive. O helper `caveHost` dos testes passou a usar o conjunto de derrotados da simulação, como o jogo.
