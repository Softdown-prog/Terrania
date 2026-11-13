# ADR 0046 — Proteção do crescimento, parte 2: orçamentos de custo do chunk e de tamanho do download

**Estado:** entregue em 2026-11-12, direto na `main`. Segunda proteção da rodada pedida pelo dono (ADR 0045). Duas coisas medidas antes de decidir.

## O que foi medido

1. **Tempo para desenhar um chunk** (Chromium, desktop, mediana de 12 chunks de sementes diferentes). Dunas 12–15 ms, lago 13–15 ms, mata 10 ms, vilarejo 13 ms, norte 11–12 ms. **Cidade: 19–26 ms, e a praça 29 ms.** O mapa é desenhado um chunk por vez, de forma síncrona, quando ele aparece: acima de ~16,7 ms é um quadro perdido; num celular, com CPU 3 a 4 vezes mais lenta, uns 100 ms.
2. **O piso novo da cidade (ADR 0042) tinha dobrado o custo da praça**: de 15,3 para 29 ms (12.141 operações de pintura e 510 degradês, contra um chunk de dunas de 2.179 e 3). Medido removendo cada parte: lajes ~8 ms, meio-fio ~5 ms, anéis ~3 ms.
3. **Composição do download.** JS total 2.079 KB (605 KB comprimido). O maior pedaço (1.383 KB) é quase todo o Phaser (1.168 KB, biblioteca); **o código do jogo inteiro tem ~203 KB minificados** (cerca de 60 KB comprimidos).

## Decisões

1. **Otimizar antes de travar.** Não se fixa um orçamento em cima de uma regressão. O piso foi enxugado **sem mudar o visual**: quina de luz e de sombra da laje com três retângulos empilhados (em vez de cinco peças com `globalAlpha`), cores das lajes montadas uma vez (4 tons × 8 níveis de luz, guardadas), juntas calculadas uma vez, o degradê de polimento só em um de cada três tiles, menos areia no meio-fio e o anel traçando só o pedaço do arco que passa pelo tile (com o tracejado alinhado entre tiles, o círculo dividido num número inteiro de blocos). Resultado: a praça foi de 12.141 para ~8.900 operações, de 510 para ~130 degradês e de 29 para ~25 ms. O restante é custo de estrutura (ver "Limites").
2. **Orçamento determinístico de custo** (`tests/chunk-cost-budget.test.ts`, `tests/helpers/chunkCost.ts`): conta operações e degradês por chunk em oito tipos de lugar (cada um com ~20 % de folga) e varre 100+ chunks pelas quatro regiões e pela cidade com um teto para qualquer chunk (10.800 operações, 300 degradês). Exato e igual em qualquer máquina. Também reprova um limite folgado demais (menos da metade usada).
3. **Orçamento de tempo no navegador** (`tests/browser/chunk-time.spec.ts`, desktop e Android emulado): mediana de 9 desenhos por lugar, com um teto absoluto folgado (120 ms) e a **razão contra um chunk de dunas medido na mesma hora** (cidade ≤ 3,5×, lago e mata ≤ 2×), que não depende da velocidade da máquina. Hoje: praça ~2×, lago ~1×, mata ~0,8×.
4. **Orçamento de tamanho** (`scripts/bundle-budget.mjs`, `npm run bundle:check`, passo no `ci.yml` e no `pre-main-suite.yml`, lógica testada em `tests/bundle-budget.test.ts`): JS total ≤ 2.500 KB, comprimido ≤ 740 KB, maior pedaço ≤ 1.700 KB (≈ 20 % de folga). Um build ausente não conta como aprovado.
5. **Carregar região sob demanda: descartado por ora.** Com o código do jogo em ~200 KB (e o Phaser em 1,2 MB), carregar regiões separadas pouparia pouco e custaria complexidade (o desenho é síncrono). Revisitar se `bundle:check` mostrar o código do jogo passando de ~600 KB.

## Defeitos achados pelos próprios testes novos

- Ao otimizar o anel, os fios de luz ficaram com o intervalo invertido nos tiles onde o trecho de luz não passa, o que faria o canvas traçar uma volta quase inteira. Um teste que exige "arco de frente para trás e menor que 1,6 rad" em oito tiles pegou; corrigido (só traça quando o trecho passa pelo tile).
- Uma mutação "ângulo sem normalizar" sobreviveu ao primeiro teste e levou a esse reforço.

## Verificação

- `tests/chunk-cost-budget.test.ts` (4), `tests/bundle-budget.test.ts` (6), `tests/browser/chunk-time.spec.ts` (desktop e Android) e 3 testes novos em `tests/south-city-paving.test.ts` (três retângulos e 32 combinações de cor guardadas, degradê em um de cada três tiles, anel só no pedaço do tile e tracejado alinhado).
- Mutações (todas reprovadas): degradê em todo tile, 64 níveis de cor, laje com retângulos a mais, anel com círculo inteiro, ângulo sem normalizar, período que não fecha a volta, tracejado sem alinhar, areia em todo meio-fio, total bruto não medido, limite exclusivo, build ausente que passa, medição de todos os arquivos, sem compressão e custo sempre zero.
- Captura da praça depois da otimização: idêntica em aparência (lajes, anéis com juntas, meio-fio e sombra).

## Limites

- **O custo estrutural continua:** o chunk é desenhado de uma vez quando aparece. Em celular lento, os chunks da cidade (~25 ms no desktop) ainda podem causar um tranco. O remédio de verdade é desenhar os chunks vizinhos antes de precisarem, um por quadro (próxima entrega desta rodada).
- Os tempos foram medidos no desktop; nunca em Android físico.
- O orçamento de tempo é uma rede de segurança grossa (pega 2 a 3 vezes mais lento), não um medidor fino; o fino é o de custo contado.

**Atualização (ADR 0054):** a medição de tempo passou a ser intercalada, com o quartil inferior das rodadas, e o limite dos chunks da cidade subiu de 3,5× para 4,5× as dunas, com o motivo registrado lá. Também ficou registrado que não se corta arte para aparelho fraco.
