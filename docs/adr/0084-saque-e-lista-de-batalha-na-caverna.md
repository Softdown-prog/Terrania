# ADR 0084 — Na caverna, o saque cai no chão e a lista de batalha aparece (a regra da superfície)

**Estado:** entregue em 2026-11-26, direto na `main`, por relato do dono ("dentro das cavernas o Battle não funciona e os monstros não deixam loot para trás"). Substitui a decisão do [ADR 0024](0024-drops-de-moedas.md) de que, na masmorra, o dinheiro vai direto para a bolsa.

## Causa (não era defeito, era diferença de desenho)
- **Lista de batalha:** o combate por alvo funcionava na caverna (toque, ESPAÇO), mas a tela escondia a lista de batalha e o painel do alvo de propósito (`!hud.cave()` no modelo da página).
- **Saque:** na superfície o gel e as moedas caem no chão e o herói os recolhe ao chegar perto; na caverna o dinheiro ia direto para a bolsa e o gel só existia na gruta de treino, sem aparecer nada no chão. Parecia que o monstro não deixava nada.

## Decisões
1. **O saque cai no chão da caverna** (`CaveRoom.drops`), no lugar em que a criatura caiu, com a mesma regra da superfície: **gel** se é slime (qualquer slime, não só os da gruta de treino) e **moedas** de toda criatura; o chefe do último andar continua deixando o baú. Quem decide o que cai é `engine/rooms/CaveLoot.ts` (`caveDefeatDrops`); o teto de saque no chão é o do mundo (`MAX_WORLD_DROPS`).
2. **O herói recolhe ao chegar perto**, pela **mesma função da superfície** (`collectDrops` em `engine/character/loot.ts`; a `OfflineSimulation` deixou de ter a sua cópia do laço): ao alcance de `PICKUP_DISTANCE`, gel com a bolsa cheia fica no chão, moedas além do teto da carteira ficam no chão até haver espaço.
3. **Sair da caverna ou trocar de andar recolhe tudo** o que sobrou no chão (com os mesmos limites de bolsa e carteira): ninguém perde saque por ter saído depressa.
4. **O que não muda:** experiência, contagem de abates, missão de Aela (conta por abate) e os materiais da criatura (continuam indo direto para a bolsa, como na superfície).
5. **Desenho:** o saque da caverna é desenhado como o da superfície (cristal de gel e moedas por valor), em profundidade com as criaturas e o herói (`drawCaveView` aceita desenhos extras).
6. **Tela:** a lista de batalha e o painel do alvo aparecem também na caverna (a lista já era alimentada pelo `tickCave` a cada 0,2 s; só o modelo da página a escondia).

## Verificação
- `tests/cave-loot.test.ts` (7): o saque cai onde a criatura caiu (gel e moedas; só moedas se não é slime; o baú do chefe vale mais); o teto; `collectDrops` (alcance exato, tudo ao sair, bolsa e carteira cheias); a caverna de verdade pelo `tickCave` (o saque fica no chão, não vai direto para a bolsa e é recolhido ao pisar); a ligação (superfície e caverna pela mesma função, recolhe ao sair e trocar de andar, desenha o saque, mostra a lista de batalha).
- `tests/coin-drops.test.ts` reescrito (o teste que dizia "dinheiro vai direto para a bolsa" passou a dizer o contrário) e `tests/cave-central-slimes.test.ts` e `tests/browser/cave.spec.ts` e `cave-center.spec.ts` ajustados (a lista de batalha visível na caverna).
- Mutações: **21** estragos de propósito (alcance e limite exato, recolher tudo ao sair, bolsa e carteira cheias, o resto das moedas, quem deixa gel, o baú do chefe, os ids, o teto, o ponto onde cai, o treino de Aela, os materiais, a ligação do `tickCave`, do `Game`, da cena, do desenho e da página, e a superfície). Os 21 foram pegos de primeira.

## Limites
- O saque que ficou no chão não é salvo se o jogo for fechado dentro da caverna (como já acontece com a posição dentro dela); por isso ao sair ou trocar de andar ele é recolhido.
- O gel dos slimes de caverna passa a entrar na economia (troca por poção): é a mesma regra da superfície, mas vale rever o equilíbrio se o jogador farmar cavernas de slimes.
- A lista de batalha na caverna usa a mesma janela de visão da câmera; cavernas maiores e mais povoadas (próximas entregas) vão testar isso melhor.
