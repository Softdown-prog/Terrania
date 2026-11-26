# ADR 0083 — As cavernas comuns do Centro deixam de nascer vazias: ganham slimes

**Estado:** entregue em 2026-11-26, direto na `main`, por relato do dono ("pelo menos ali na área central encontrei algumas cavernas que não têm nada dentro: nem missão, nem monstro, nem nada"). É o primeiro conserto da frente das cavernas; tamanho maior, andares subterrâneos, a lista de batalha na caverna, o saque no chão e as missões vêm em entregas próprias.

## Causa
O jogo povoa uma caverna com as **criaturas regionais** do tema dela (`caveMonsterKinds`). O tema do Centro ("verdant", Gruta das Raízes) não tinha nenhuma: o único bicho do Centro é o slime, que não é uma criatura regional. Conferido: Centro 0 criaturas possíveis; Norte 6, Deserto 13, Costa 4, Montanha 4, Pântano 4. Sem criaturas, `populate` saía sem colocar nada, e as cavernas do Centro nasciam vazias.

## Decisões
1. **O povo do Centro são os slimes.** A caverna comum do tema "verdant" que não tem criatura regional nasce com **seis slimes** (`CENTRAL_CAVE_SLIMES`), colocados por `engine/rooms/CaveSlimes.ts` (um assunto, um arquivo; `CaveRoom` só chama).
2. **Posições**: sorteadas pela entrada (sempre as mesmas para a mesma caverna, e diferentes de uma caverna para outra), só em solo transitável, a pelo menos 170 px de quem chega e 92 px uns dos outros; 64 tentativas no máximo (nada de laço aberto) e, se o sorteio só cair em parede, uma varredura das câmaras garante pelo menos três.
3. **Persistência**: o id leva o andar e o número (`<andar>:slime:<n>`); quem já caiu (`defeated`, o save) não volta.
4. **Recompensa**: igual à de qualquer abate de caverna: experiência, contagem de abates e moedas; o **gel é só da gruta de treino** (a do começo do mundo), como já era.
5. **Não mudam**: a gruta de treino (sete encontros), as cavernas dos outros temas e as masmorras do Sul.
6. **Provisório de propósito**: seis slimes é o conserto mínimo para a caverna não ficar vazia. O Centro merece o seu bestiário (ratos, morcegos, aranhas de raiz, cobras...), com uma ficha, um painter e uma entrada de arte por criatura, cada uma no seu arquivo; isso entra em lotes, junto com o das outras regiões.

## Verificação
- `tests/cave-central-slimes.test.ts` (7): toda caverna comum do Centro varrida perto do começo do mundo nasce com seis slimes, em solo transitável, longe do herói e uns dos outros; determinístico e diferente por caverna; quem caiu não volta; a garantia quando o sorteio cai em parede; a gruta de treino e os outros temas intactos; o abate dá experiência e conta sem dar gel; o herói derruba um slime com a espada; a ligação em `CaveRoom`.
- `tests/browser/cave-center.spec.ts` (desktop e Android): entra-se numa caverna comum do Centro pela entrada de verdade, abre sem erro, com o nome "Gruta das Raízes". Captura em `docs/screenshots/caverna-do-centro.png`.
- Mutações: **10** estragos de propósito (a quantidade, as distâncias, a parede, os abatidos, a semente por caverna, os ids, a garantia e a condição do tema). Duas passaram batido na primeira rodada (a semente que repetia a disposição em toda caverna e a garantia nunca exercitada) e foram fechadas com testes novos; as 10 foram pegas.

## Limites
- As cavernas do Centro continuam pequenas (42 × 30 tiles) e de um andar só, sem missão e sem chefe; o painel da lista de batalha segue escondido na caverna, e o saque ainda vai direto para a bolsa (tarefas seguintes).
- Só slimes: sem variedade de criaturas no Centro ainda.
