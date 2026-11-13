# ADR 0053 — Acabamento visual, fatia 9 (parte 3): formações das cavernas maiores e variadas

**Estado:** entregue em 2026-11-13, direto na `main` por pedido do dono ("sim por favor"). Fecha a fatia 9 (cavernas): depois da rocha contínua (ADR 0051) e das poças da Gruta Luminosa (ADR 0052), faltava a variedade das formações comuns.

## Contexto

Cada tema tinha **uma só silhueta** de formação (cristal, raiz ou pedra), com no máximo 20 px de altura, igual em todo lugar e pintada junto das paredes: no jogo, pedrinhas minúsculas e idênticas. O desenho ficava dentro do laço dos tiles, então os detalhes de tiles vizinhos podiam passar por cima.

## Decisões

1. **Nove silhuetas** (`src/render/caveFormations/outline.ts`): três por material. A forma 0 é a de sempre; a 1 é a alta e fina (espigão de cristal, raiz bifurcada, estalagmite em cone, até 27 px); a 2 é a larga e baixa (cristal de duas pontas, raiz em arco, pedra de duas corcovas). O material segue o tema: cristal na geada e no basalto, raiz na mata e no brejo, pedra no deserto e na costa. As nove impressões digitais estão travadas em teste.
2. **Peças por variação** (`parts.ts`): uma formação é uma peça principal (escala 1 a 1,6, largura 0,85 a 1,35, inclinação e uma das três silhuetas) e, em metade dos casos, uma ou duas **peças menores** ao lado (40% a 70% do tamanho, de 8 a 14 px de distância, inclinadas para o outro lado). Tudo sai de `hash2` da própria variação. As menores são pintadas primeiro.
3. **Desenho** (`drawCaveFormation` em `caveDetails.ts`, mesmo nome e mesma assinatura): cada peça passa pela rotina de nove passos de antes (sombra, silhueta, volume, veios recortados, nervura, oclusão, contorno, faceta e brilho), dentro de uma transformação de largura, altura e inclinação. A luz continua sempre a noroeste, porque a peça só é esticada e inclinada, nunca espelhada.
4. **Colocação** (`placement.ts`): função pura do mapa e da semente. Um tile de chão encostado em parede (ao sul, a oeste ou a leste) ganha formação em 21% dos casos (eram 17%), com a base em qualquer ponto do miolo do tile e variação própria. Sem mudança de colisão.
5. **Um passe só no piso:** as formações saem do laço dos tiles e são pintadas depois dele, de trás para frente, como as peças da Gruta Luminosa. A Gruta Luminosa continua sem formações comuns.
6. **Contrato de arte:** `drawCaveFormation` continua registrada como `prop` nos seis temas e passa sem baixar nenhum piso; `formationOutline` recebe o contexto por último (como `blit` e `poolHalo`), porque não é uma peça sozinha.

## Verificação

- `tests/cave-formations.test.ts` (7): mapa tema para material; nove silhuetas fechadas, dentro da caixa, diferentes, travadas por impressão digital, com a alta passando da normal e a larga mais larga; peças estáveis, em faixas certas, 0/1/2 menores nas proporções esperadas, inclinadas para o outro lado e em ordem; desenho estável, equilibrado, com um volume, uma transformação e um deslocamento por parte; colocação determinística, junto à parede, dentro do tile e na fatia de 21%; o piso pintando uma peça por parte, num passe depois do laço dos tiles, e nenhuma na gruta luminosa; um arquivo por peça.
- Mutações (todas reprovadas): escala, largura e inclinação fixas, só a silhueta 0, sempre sozinha, proporção de menores, tamanho e distância das menores, inclinação do mesmo lado, sem ordenar, silhuetas alteradas (espigão, corcova, raiz, pedra de duas corcovas), tema sem cristal, fatia errada, sem exigir parede, variação fixa, sem ordenar a colocação, sem transformação, sem deslocamento e formações na gruta luminosa.
- Contrato de arte, estilo de caverna e fronteiras continuam verdes. Capturas do jogo real (desktop) das cavernas de mata, geada e costa.

## Limites

- As formações ainda ficam só junto das paredes: não há estalagmite solta no meio do salão, e elas não bloqueiam a passagem (a colisão é por tile).
- As "tampas" de pedra de 32 px nas bordas (`drawCaveWallFace`) seguem a grade de tiles e podem ficar uns pixels fora do contorno arredondado da rocha (ADR 0051).
- Android físico não foi testado.
