# ADR 0054 — Qualidade primeiro: aparelho-alvo definido e orçamento de tempo estável

**Estado:** decidido pelo dono em 2026-11-13 e entregue direto na `main`.

## Contexto

Os orçamentos de custo (ADR 0046) existem para avisar quando uma arte fica pesada. Numa sessão, o teste de tempo de chunk (`tests/browser/chunk-time.spec.ts`) falhou com o mesmo código que passava: a razão da praça e da cidade contra as dunas variava de 2,1 a 3,7 de uma rodada para outra (limite 3,5). Isso levantou a pergunta de se a arte da cidade precisava ficar mais barata para aparelhos fracos.

O dono respondeu com a regra do produto: **jogo é jogo**, celular tem que ser "um pouquinho mais moderno" e computador precisa de placa de vídeo; **piorar o jogo para atender um jogador que talvez nunca venha não compensa**. O dono já testou os jogos dele num celular de **2018, com 4 GB de RAM**, sem nenhum problema.

## Decisões

1. **Aparelho-alvo.** Celular de 2018 com 4 GB de RAM (ou melhor) e computador com placa de vídeo. Abaixo disso o jogo não é obrigado a rodar bem.
2. **Não se corta nem se simplifica arte para aparelho abaixo do alvo.** Nenhuma sessão, de pessoa ou de IA, propõe versão mais pobre de uma peça por causa de máquina fraca.
3. **O que os orçamentos fazem.** Continuam existindo como rede de segurança contra regressão real (uma peça que dobra de custo por descuido), não como pedido de corte. Quando uma arte estoura um limite, a ordem é: (a) otimizar **sem perder visual**; (b) subir o limite escrevendo o motivo em ADR. Nunca em silêncio (ADR 0046 continua valendo).
4. **Medição de tempo estável** (`tests/helpers/chunkTiming.ts`, usada por `chunk-time.spec.ts`). O teste já usava a mediana de 9 medidas, mas media um lugar de cada vez, então a carga da máquina caía mais sobre as dunas ou sobre a cidade conforme o momento. Agora os lugares são medidos **intercalados** (15 rodadas, a ordem gira a cada rodada) e vale o **quartil inferior** das rodadas, porque carga só soma tempo e o lado baixo é o custo de verdade.
5. **Limites.** Teto absoluto de 120 ms e lago e mata até 2× as dunas, como antes. Os chunks da cidade passam de **3,5× para 4,5×** as dunas: o custo verdadeiro medido é de 2,3× a 2,8×, então 4,5× dá folga de cerca de 1,6× e ainda pega um chunk que dobra de custo (5× ou mais). O custo exato por contagem de operações (`tests/chunk-cost-budget.test.ts`) não mudou.

## Verificação

- **Antes** (mesmo código, medição antiga, cinco rodadas): praça de 2,12× a 3,73×, cidade sul de 2,58× a 3,63×, base das dunas de 8,6 a 12,5 ms; uma rodada de teste completa falhou.
- **Depois** (medição nova, cinco rodadas no navegador): praça de 2,30× a 2,42×, cidade sul de 2,56× a 2,76×, lago ~1,0×, mata ~0,65×, base das dunas de 9,2 a 10,7 ms; passou nas cinco.
- `tests/chunk-timing.test.ts` (6): quartil inferior; a medição intercala, gira a ordem, aquece e usa uma semente por rodada; sem carga o tempo medido é o custo; **com carga simulada em 300 máquinas diferentes, o método antigo passaria de 3,5× em 15 ou mais delas e o novo fica abaixo de 4,5× e perto do custo verdadeiro**; um chunk 2× ou 3× mais pesado (cidade) e um lago 2,5× mais pesado continuam sendo pegos; os limites e o uso pelo teste de navegador.
- Mutações (todas reprovadas): limites trocados, menos rodadas, mediana no lugar do quartil, mínimo no lugar do quartil, sem girar a ordem, sem aquecer, mesma semente em toda rodada, teto absoluto alto demais e limite antigo de volta no teste de navegador.

## Limites

- O que está verificado vale para o desktop: nunca foi medido neste projeto num celular de 2018. O dono testou os **outros jogos** dele nesse celular; falta abrir o Terrania lá e olhar duas coisas: andar rápido pela cidade do Poço Negro (engasgo quando aparece terreno novo) e a **primeira entrada numa caverna**, em que o chão do andar (ADR 0051) é montado de uma vez e leva de 25 a 100 ms no desktop, podendo ser várias vezes isso num aparelho lento. Se aparecer pausa, a saída é montar o piso aos poucos, sem perder visual.
- O tempo de chunk é uma rede de segurança grossa: pega 2 a 3 vezes mais lento, não mede com precisão fina.
