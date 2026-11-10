# ADR 0029 — Tempo de volta (respawn) dos monstros

**Estado:** entregue em 2026-11-10, direto na `main` por pedido do dono.

## Contexto

Até aqui **nenhum monstro derrotado voltava**: o id ia para a lista de derrotados do save e ficava lá para sempre, então o mundo só se esvaziava e as masmorras, depois de limpas, ficavam vazias. Isso não combina com um jogo de caçar (e de juntar moedas e loot raro).

## Decisões

1. **Relógio da aventura em segundos de jogo** (`OfflineSimulation.time`), que só anda enquanto se joga: na superfície, e também dentro das masmorras (`advanceClock`). Não usa relógio de parede (o motor segue determinístico, sem `Date.now`) e ficar com o jogo fechado não faz ninguém voltar. O relógio vai e volta do save (`time`).
2. **Cada derrota marca a hora de volta** (`respawnAt`, também no save), em `engine/combat/respawn.ts`: a espécie mais forte demora mais. **Prazo = 60 s + 1,5 × experiência da espécie**, entre 60 s e 10 min (um slime volta em 75 s; o Golem de Basalto em 7 min; o mamute da tundra em 9 min 30 s). **O chefe de uma masmorra volta em 30 min.** Os **slimes de treino da gruta de Aela nunca voltam**: a missão depende dos abates.
3. **Na superfície, o monstro só volta quando o herói está a mais de 700 px dele** (fora da tela): o prazo vencido não faz ninguém aparecer na cara do jogador. A cada 5 s, se alguém já pode voltar, o povoamento do entorno é refeito.
4. **Nas masmorras, quem já pode voltar volta ao entrar e a cada troca de andar** (`expireDefeats`), então a masmorra limpa se repovoa depois do prazo, sem nascer monstro com o herói dentro.
5. **Quando um monstro volta, o que ele tinha deixado no chão some** (gel e moedas), para a carteira e o chão não acumularem.
6. **Saves antigos** (sem hora de volta) ganham um prazo único de 10 min contados do carregamento, menos os slimes de treino. Valores sujos no save (relógio ou hora de volta inválidos) são descartados, e um prazo absurdo é cortado em 2 h.
7. Sem mudança de Go, de arte ou da interface.

## Verificação

- `tests/respawn.test.ts` (7 testes): a tabela de prazos (slime 75 s, crescente com a força, entre 60 s e 10 min, chefe 30 min, treino nunca); só volta depois do prazo e o que deixou no chão some junto; o monstro do mundo só volta com o herói longe; a hora de volta vai e volta do save, save antigo ganha prazo (menos o treino) e dados sujos são limpos; na masmorra a vitória marca a volta e a masmorra repovoa; o relógio só anda com valores válidos; matar de verdade na superfície marca a volta certa. Mutações conferidas: não anotar a volta (superfície e masmorra), voltar na cara do herói, deixar a moeda no chão, treino voltando, chefe voltando como comum e não salvar o relógio reprovam.
- Nenhum teste existente precisou mudar.

## Limites

- **Os números são um primeiro palpite** (75 s para um slime pode ser curto demais ou longo demais): sem medição de jogo.
- Quem fica parado na mesma região esperando vê os monstros voltarem só quando se afasta (fora da tela) e a cada 5 s no máximo.
- Os monstros dos lagos e das ruínas voltam como os demais (têm id estável), mas a ruína não tem um "ponto de nascimento" próprio: voltam no lugar de sempre.
- Dentro de uma masmorra, quem vence o monstro não o vê voltar enquanto estiver lá; só depois de sair e entrar de novo (ou de trocar de andar).
- O saque em dinheiro e em material continua o de sempre a cada vitória (não há limite diário).
- Não verificado: Android físico e o custo do repovoamento a cada 5 s no aparelho.
