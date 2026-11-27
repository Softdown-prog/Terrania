# ADR 0101 — Toda gruta verde do Centro é a Masmorra das Raízes, de cinco andares

**Estado:** fatia L5a entregue em 2026-11-27, a pedido do dono: "aumentar a gruta das raízes na região central: mais andares, mais criaturas, mais opções para andar, explorar e fazer coisas dentro da gruta". As fatias seguintes (L5b câmaras laterais e mais caminhos, L5c baús e coleta que voltam, L5d um objetivo ou missão dentro da gruta) ficam para os próximos lotes.

## O que mudou
- Antes, só 40 % das grutas verdes eram a [Masmorra das Raízes](0094-masmorra-das-raizes-lote-4.md) (3 andares); as outras eram uma sala só, com seis criaturas sorteadas por `CaveCentral.ts`. Agora **toda gruta verde** é a masmorra, menos a **gruta de treinamento da Aela** (`isStarterCave`), que continua simples para o jogador novo.
- A masmorra passou de 3 para **5 andares**: *Raízes Rasas* (4 encontros), *Galeria dos Cipós* (5; aparece a Raiz-Viva), *Jardim dos Fungos* (5), *Túneis Retorcidos* (6, com a Raiz-Viva e mais gente) e *Coração da Gruta* (5, com o **Ent Ancião**). São 25 encontros contra 11 antes. A **versão curta** (que cada entrada sorteia, como no Sul) tem 3 andares: Raízes Rasas, Galeria dos Cipós e Coração da Gruta.
- A masmorra não tem mais `share`: o sorteio de 40 % acabou. `dungeonFor` devolve a masmorra para qualquer gruta verde comum.
- `CaveCentral.ts` (as seis posições sorteadas) e o ramo "gruta verde sem masmorra" do `CaveRoom` foram **removidos**: o povo da gruta vem do andar da masmorra, como nas outras regiões. O respawn por andar do [ADR 0097](0097-respawn-dentro-do-andar.md) vale em todos os andares.

## Endurecimento do teste `cave-floors`
O teste de navegador `cave-floors` (masmorra de 3 andares do Sul) estourou o limite de 5 minutos duas vezes na CI porque dava **um toque de tecla por tile**, e cada ida e volta ao navegador custa caro lá. Agora a tecla fica **pressionada ao longo de todo o trecho reto** do caminho seguro e o caminho é refeito de onde o herói parou: o mesmo percurso com cerca de quatro vezes menos idas e voltas.

## Testes e mutações
`tests/center-dungeon.test.ts` (registro sem `share`, os cinco nomes e os encontros por andar, toda gruta verde comum é masmorra e a de treinamento nunca, versão curta, Ent só no último andar e Raiz-Viva só do segundo para baixo, moradores do tema verde), `tests/center-dungeon-creatures.test.ts` (o povo de cada andar), `tests/dungeons.test.ts`, `tests/cave-central-monsters.test.ts` e `tests/qa-caves.test.ts` ajustados; `tests/cave-respawn.test.ts` ganhou o slime que volta num andar de masmorra; `tests/browser/cave-center.spec.ts` entra numa gruta verde de verdade e confere "Andar 1 de 3 ou 5 · Raízes Rasas" e a lista de batalha. 8 mutações nos dados da masmorra (elite no primeiro andar, `share` de volta, versão curta sem a galeria, encontros, chefe errado, nome de andar, só 4 andares, bicho de outro tema): nenhuma sobrevive.

## Limites
Os andares ainda têm a **planta e o tamanho de sempre** (a planta é uma constante `CAVE_WIDTH/HEIGHT` usada em dezenas de pontos): câmaras laterais, plantas maiores, baús e uma missão na gruta são as fatias L5b a L5d.
