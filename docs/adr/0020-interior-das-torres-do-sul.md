# ADR 0020 — Interior das torres dos Ermos do Sul

**Estado:** fatia 3b entregue em 2026-11-10. Depende dos andares múltiplos (ADR 0018) e das torres por fora (ADR 0019), já na `main`.

## Contexto

As três torres do Sul apareciam no deserto e bloqueavam o herói, mas a porta não levava a lugar nenhum. O motor de andares das cavernas (escadas, chefe, derrotados por andar, volta pela mesma entrada) já existe. O dono pediu o interior das torres, com 2 a 3 andares, e que cada coisa fique no seu arquivo, por região.

## Decisões

1. **A porta da torre é uma entrada de masmorra.** `src/world/towers/entrance.ts` monta um `CaveEntrance` a partir da torre colocada (id da torre, nome, porta como posição, tema `desert`, campo opcional `tower`). O jogo entra, troca de andar e volta pelo motor das cavernas, sem um segundo motor. `src/world/entrances.ts` junta as duas buscas (`dungeonEntranceNear`: caverna primeiro, depois torre); `Game` e `surfaceMode` passam a usá-la.
2. **Uma masmorra por torre, um arquivo por torre,** na pasta da região: `src/dungeons/south/torre-vigia-caida.ts`, `torre-miragem.ts`, `torre-sol-negro.ts`. `DungeonDefinition` ganha o campo opcional `tower`; `dungeonFor` usa a ficha da torre quando a porta é de torre e, para caverna comum, ignora as masmorras de torre. Os andares vêm da ficha (2, 3 e 3), só o último tem chefe.
   - Vigia Caída: Guarita dos Vigias → Topo Quebrado (Troll de Barro Seco).
   - Miragem: Salão dos Espelhos → Escadaria de Vidro → Sob a Cúpula (Escorpião das Dunas).
   - Sol Negro: Átrio de Basalto → Galeria dos Braseiros → Câmara do Disco Negro (Verme da Areia Carniceiro).
3. **Planta de salão reto** (`src/world/towers/floorLayout.ts`): salão da entrada, passagem e salão do topo, com pilares quadrados sorteados por semente, em vez das galerias ovais da caverna. As escadas e o chefe ficam nos mesmos lugares de sempre. `CaveFloor` só decide entre a planta de caverna (intacta, travada pelas impressões digitais de `tests/cave-floor.test.ts`) e a de torre.
4. **Rótulos:** a tela diz "EXPLORAÇÃO · TORRE" e "Torre · X · Y" (e "Você entrou em ..."), no lugar de "Subsolo".
5. O Go não espelha torres nem andares; a paridade não muda.

## Verificação

- `tests/south-tower-interior.test.ts` (4 testes): uma masmorra por torre com os andares da ficha e só o último com chefe; porta no chão livre, achada de pé na porta e não longe dela, e a entrada de caverna segue valendo; planta com saída e câmara do fundo ligadas por chão em todo andar, determinística e diferente da de caverna; entrar, descer, subir pelo motor com nome de andar e chefe corretos.
- Mutações conferidas: `dungeonFor` ignorando a torre, planta sempre de caverna, sem a porta de torre e passagem cortada reprovam.
- `tests/browser/tower-interior.spec.ts` (desktop e Android): entra pela porta, vê "Andar 1 de 3 · ...", título e aviso da torre, volta pela escada de saída e chega exatamente na porta.
- `tests/dungeons.test.ts` foi ajustado, não enfraquecido: "um tema, uma masmorra" vale para cavernas e há a regra "uma torre, uma masmorra".

## Limites

- **A arte do interior ainda é a de caverna do deserto** (rocha e pedra de areia), só que em salões retos. Tijolo, piso de laje, janelas e braseiros por torre são uma fatia de arte à parte.
- A jogabilidade contra as criaturas nos andares das torres não foi medida; o teste de navegador as dá como derrotadas.
- Chefes das torres são espécies que já existem (Troll de Barro Seco, Escorpião das Dunas, Verme da Areia Carniceiro); não há chefes ou loot novos.
- Não verificado: Android físico, desempenho no aparelho.
