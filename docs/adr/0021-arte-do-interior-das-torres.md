# ADR 0021 — Arte do interior das torres do Sul

**Estado:** entregue em 2026-11-10, direto na `main` por pedido do dono. Continua o ADR 0020 (interior das torres), que deixou a arte como a de caverna do deserto.

## Contexto

Por dentro, as torres reaproveitavam a rocha de caverna em salões retos. O dono pediu que cada coisa fique no seu arquivo, por região. Esta fatia dá ao interior cara de torre: piso de laje, parede de tijolo, frestas de janela e lampiões, com um estilo próprio por torre.

## Decisões

1. **Um estilo por torre, um arquivo por torre** em `src/render/south/towers/interior/` (`vigia-caida.ts`, `miragem.ts`, `sol-negro.ts`): cores do piso e do tijolo, luz e chama, e a frequência de janelas e lampiões. `types.ts` define o formato e `index.ts` só agrega (`TOWER_INTERIOR_STYLES`, registro exaustivo por id). Norte, Leste e Oeste ganham pastas próprias depois.
   - Vigia Caída: arenito claro, luz quente. Miragem: pedra pálida, tijolo arroxeado, luz violeta, mais janelas. Sol Negro: basalto escuro, chama violeta, mais lampiões e poucas janelas.
2. **Três peças físicas, cada uma no seu arquivo,** registradas como `prop` no contrato de arte, por torre (`tests/helpers/artAssets.ts`): `wallFace.ts` (face de tijolo na base da parede, sul e leste), `window.ts` (fresta de janela em arco, com luz) e `sconce.ts` (lampião de ferro com chama). Nenhum piso do contrato foi baixado: as 18 peças novas passaram de primeira.
3. **O andar é pintado por `floor.ts`** (`paintTowerFloor`): laje de 16 px em aparelho deslocado com rejunte e reflexo, tijolo escuro nas paredes, luz das janelas e dos lampiões sobre o piso e as mesmas escadas das cavernas. `render/cave.ts` só escolhe: entrada de torre usa este pintor; o resto segue como era. O resultado é cacheado por andar.
4. Janela só em parede grossa (fundo do salão), nunca na face de um pilar de 2 tiles.
5. Sem mudança de colisão, planta, motor, save ou Go.

## Verificação

- `tests/south-tower-interior-art.test.ts` (3 testes): um arquivo de estilo por torre; cores válidas, probabilidades de 0 a 1 e estilos diferentes entre as torres; o desenho do andar de torre usa as cores do estilo da sua torre e a caverna comum não usa. Mutações conferidas: sem a escolha do pintor em `cave.ts`, luz repetida entre torres e estilo sempre da Vigia reprovam.
- Contrato de arte: 172 testes, 0 falhas.
- Capturas no jogo real (Chromium desktop) dos três interiores, em vários pontos.

## Limites

- Os lampiões e as janelas são parte da imagem cacheada: **não tremem nem pulsam** (a chama é estática).
- A luz sobre o piso é uma mancha suave por lampião/janela, sem sombra projetada pelos pilares.
- As escadas continuam as das cavernas (pedra de arenito do deserto), sem tijolo.
- Não verificado: Android físico, desempenho do primeiro desenho do andar no aparelho (a pintura roda uma vez por andar).
