# ADR 0056 — Capital dos povos humanos, parte 2: muralha, Grandes Portões e torres

**Estado:** entregue em 2026-11-14, direto na `main`, por pedido do dono ("ok, podemos prosseguir"). Segunda parte da capital (ADR 0055): arte e colisão da muralha entram juntas, para não haver parede invisível.

## Decisões

1. **Peças no mundo** (`src/world/center/capital/`): `towers.ts` (as 8 torres, base de 2 × 2 tiles) e `props.ts` (as 134 peças: 64 trechos de muralha de frente, 60 de lado, 2 portões e 8 torres), todas com a base na borda de baixo do tile. Os muros norte e sul levam trechos de 2 tiles (64 px): à esquerda 16, à direita 15 inteiros e **meio trecho** (32 px, variações 4 a 7) para fechar o tile que sobra, porque a planta tem 80 tiles e não é simétrica. Os muros oeste e leste levam 30 trechos de lado cada. O vão do portão (9 tiles) fica livre, com uma torre de cada lado.
2. **Colisão ligada.** `capitalWallBlocks` (muralha e bases das torres) entra em `collision.ts`, em uma linha. `capitalBlocks` (que inclui também os terrenos dos edifícios e o monumento) continua sem ligação: esses ainda não são desenhados.
3. **Arte própria da região central** (`src/render/center/`, uma peça por arquivo): `kit/` (cores do calcário, do granito, da ardósia, o azul e o dourado da capital, `StoneBrush` e `Banner`) e `capital/props/` (`wall.ts`, `wallSide.ts`, `tower.ts`, `gate.ts`, `index.ts` com o cadastro e o tamanho de cada sprite). O kit é da região, no mesmo padrão do Sul (ADR 0045), e não importa nada de outra região.
   - **Muralha de frente:** calcário em fiadas de 8 px com juntas alternadas a cada 16 px, soco de granito, cornija sobre mísulas e arcos, ameias de pedra a cada 16 px. Quatro desgastes: musgo e líquen (0), remendo e rachadura (1), fresta de arqueiro (2), hera (3). Os trechos se encostam: o que atravessa a emenda tem período fixo e não há contorno nas pontas.
   - **Muro de lado** (oeste e leste): o adarve visto de cima, lajes com emendas a cada 8 px entre duas fileiras de ameias a cada 16 px, a sombra caindo para o leste e, no pé, a ponta de alvenaria. Sem linha escura entre um trecho e o seguinte.
   - **Torres redondas:** o corpo de calcário em fiadas curvas, soco de granito, três frestas e a faixa de pedra. A de **canto** leva telhado cônico de ardósia e pendão azul; a **do portão**, coroa de ameias sobre mísulas e o estandarte da capital.
   - **Grande Portão** (vão de 9 tiles): face de alvenaria com o arco de aduelas e a chave, a grade erguida (22 barras), duas lanternas, o brasão do sol dourado, dois estandartes e as mesmas ameias da muralha (período de 16 px, no mesmo compasso).
4. **Cenário.** Um tipo novo, `center-capital`, cadastrado em `props/registry.ts` com uma linha (ADR 0048); o corpo de cada peça vai para o cache de sprites, uma entrada por variação. `WorldRenderer.objects` só entrega as peças a quem está perto da cidade (custo fixo). Nada é animado nesta parte.
5. **Contrato de arte:** as peças (8 muralhas, 2 muros de lado, o portão e 2 torres) estão registradas como `structure` e passam sem baixar nenhum piso. A muralha e o muro de lado precisaram ganhar mais curvas e cores (arcos sob a cornija, líquen, ferrugem, realce nas ameias) para chegar lá, em vez de afrouxar o contrato.

## Verificação

- `tests/center-capital-walls.test.ts` (11): contagem e ids das 134 peças; cobertura sem buraco nem sobreposição dos muros norte e sul (37 peças por muro) e dos muros oeste e leste (32); portões no meio do vão e torres coladas; posição e variação de cada torre; 32 tiles de base fora das ruas e dos terrenos; colisão pela função real do jogo (266 tiles de muralha e 12 de torre bloqueiam, portões e ruas livres); entrada só pelos portões (com os dois fechados a praça é inalcançável); edifícios e monumento ainda livres; o desenho recebe as peças perto da capital e nenhuma longe.
- `tests/center-capital-art.test.ts` (7): um arquivo por peça e sem nada de outra região; muralha com oito variações estáveis, ameias, fiadas e juntas de período fixo, arcos, meio trecho recortado e sem contorno nas pontas; o desgaste de cada variação; muro de lado (ameias a cada 16, lajes a cada 8, contorno só nos lados); torres (fiadas curvas, frestas, telhado só no canto, ameias e estandarte só no portão); portão (curva do arco, 22 barras, 18 ameias no compasso da muralha, lanternas, brasão); e o cenário com cache por variação.
- `tests/browser/center-capital.spec.ts` (desktop e Android, 6 testes): o portão aparece pintado (672 pixels azul-real contra 0 sem as peças); o herói andando para o sul **para diante do muro** e **passa pelo portão**.
- Mutações (todas reprovadas, 47 de código e 3 de navegador): posição, tamanho e alinhamento de torres, trechos e portões, meio trecho, colisão (muralha, torres e a ligação em `collision.ts`), entrega ao desenho (lista, proximidade, tipo), período, posição e tamanho das ameias, arcos, recorte do meio trecho, desgaste de cada variação, contorno nas pontas, período e bordas do muro de lado, tamanho do corpo e do telhado, ameias e estandarte das torres, curva do arco, barras, brasão, lanternas, estandartes, cache, cadastro do cenário e o portão fechado.

## Limites

- Os muros leste e oeste são vistos de cima (a câmera não mostra a face lateral); parecem uma faixa de pedra com ameias, enquanto os muros norte e sul mostram a face de frente.
- Ainda não há edifícios, monumento, moradores nem interiores; os terrenos dos edifícios não bloqueiam. Sem tochas ou fogo animado nesta parte.
- Android físico não foi testado.
