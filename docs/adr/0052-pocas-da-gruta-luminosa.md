# ADR 0052 — Acabamento visual, fatia 9 (parte 2): poças da Gruta Luminosa sem repetição

**Estado:** entregue em 2026-11-13, direto na `main` por pedido do dono ("ok, vamos lá"). Segunda parte das cavernas; esta tira a repetição das poças da Gruta Luminosa. As formações comuns (cristais, raízes, pedras) ficam para a parte 3.

## Contexto

A Gruta Luminosa (ADR 0032) tinha um só tipo de poça, um tapete de musgo pintado sempre **no centro exato do tile** e quase do mesmo tamanho: no jogo, uma grade de "vitórias-régias" idênticas. O ADR 0032 já listava isso como limite.

## Decisões

1. **Três tipos de peça de chão**, cada um no seu arquivo (`src/render/caveStyles/luminous/`): o **tapete de musgo** (`glowPool.ts`, o que já existia, agora com forma própria), a **poça de água** (`glowPuddle.ts`: espelho de água com margem molhada, três ondas, risco de reflexo e três seixos na beirada) e o **círculo de cogumelos** (`fairyRing.ts`: roda de 8 a 11 cogumelinhos brilhantes em volta de um chão de musgo apagado, com esporos no ar).
2. **Forma por variação** (`poolShape.ts`): `poolParams(variação)` devolve tamanho (0,7 a 1,6), achatamento, giro e o raio de cada um dos nove pontos do contorno, tudo por `hash2` da própria variação. `blobPath` desenha o contorno suave e fechado, com o mesmo caminho para recorte, preenchimento e borda. Variações diferentes dão poças diferentes; a mesma dá sempre a mesma.
3. **Luz comum** (`poolHalo.ts`): o círculo de luz de 2 a 26 px sobe de qualquer poça; a força muda por tipo (musgo 100%, círculo 70%, água 55%).
4. **Colocação** (`placement.ts`): as peças de chão ficam só em tiles **cercados de chão aberto** (a poça maior passa do tile e não pode invadir a parede), em **qualquer ponto do miolo do tile**, não no centro. Fatias: musgo 50%, água 30%, círculo 20%; 15% das peças ganham uma **companheira** menor ao lado (os tapetes se juntam em manchas). Cogumelos soltos continuam junto às paredes.
5. **Pintura:** o piso escolhe o desenhista pelo tipo da peça; tudo continua no cache do andar, sem custo por quadro. Planta, colisão, monstros e save não mudam.
6. **Contrato de arte:** `drawGlowPuddle` e `drawFairyRing` estão registradas como `prop` nos seis temas (12 peças novas), sem baixar nenhum piso; o círculo ganhou folhas secas e uma pedrinha no meio da roda para chegar nas dez cores do contrato.

## Verificação

- `tests/cave-pools.test.ts` (9): parâmetros estáveis, em faixas certas e todos diferentes entre 120 variações; contorno fechado de nove pontos que escala; luz com o mesmo círculo e força por tipo; os três tipos estáveis, equilibrados e diferentes entre si e entre variações em seis temas; tamanho do musgo e tufos; poça de água (ondas, seixos, reflexo, recorte); círculo (8 a 11 cogumelos, tamanhos variados, de trás para a frente); colocação (fatias, miolo do tile, chão cercado, companheiras, nenhuma peça no centro, variações quase todas diferentes); e o piso usando cada desenhista.
- `tests/cave-style.test.ts` atualizado: lista de arquivos, registros no contrato e contagem de peças de chão (os três tipos).
- Mutações (todas reprovadas): tamanho fixo, sem giro, contorno redondo, sete pontos, contorno sem fator, luz sem força, luz com raio errado, sem escala, tufos fixos, forças trocadas, duas ondas, seixo errado, sempre oito cogumelos, sem ordenar, cogumelos do mesmo tamanho, fatia de musgo errada, colocação em chão junto à parede, centro do tile em x e em y, sem companheiras, companheira fora do tile e círculo sem desenhista.
- Capturas do jogo real em três grutas luminosas (mata, geada e costa): poças de tamanhos e formas variados, cada tipo reconhecível.

## Limites

- As formações comuns e os cogumelos soltos seguem como estavam.
- O círculo de cogumelos é pequeno na tela do celular; precisa de olhar num aparelho real.
- Android físico não foi testado.
