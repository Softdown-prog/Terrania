# ADR 0039 — Acabamento visual, fatia 5: lago negro

**Estado:** entregue em 2026-11-11, direto na `main` por pedido do dono ("vamos voltar ao plano visual do lago Negro"). Quinta fatia da campanha ([docs/QUALIDADE_VISUAL.md](../QUALIDADE_VISUAL.md)).

## Contexto

O lago negro (ADR 0017) era desenhado tile por tile: um degradê de lama em cada lado de cada tile de água, ondas no meio e cores chapadas. O resultado era uma costa em **degraus de tile**, sem borda irregular, com a água toda do mesmo tom e a lama aparecendo como faixas retas.

## Decisões

1. **Uma fonte de verdade para o lago.** `src/world/south/blackLake.ts` guarda `blackLakeNoise` e `BLACK_LAKE_THRESHOLD`. O terreno (`isBlackLake`) decide "é água" por `blackLakeNoise(...) > BLACK_LAKE_THRESHOLD` (mesma fórmula de antes, só movida de arquivo: o mapa dos saves não muda) e o desenho usa o **mesmo valor contínuo** como profundidade.
2. **Camada por chunk, pura até o fim**, em `src/render/south/terrain/blackLake/` (um assunto por arquivo): `palette.ts` (as três cores de água que já existiam, lama molhada e seca, fio de luz), `coverage.ts` (cobertura de água interpolada entre os centros dos tiles e ondulada por ruído global), `shade.ts` (RGBA a cada 4 px), `layer.ts` (monta e amplia o canvas), `index.ts` (só reexporta).
3. **A costa segue a colisão.** A cobertura vale 0,5 exatamente na borda entre um tile de água e um de terra, e a ondulação é limitada a `COAST_WOBBLE` (0,3 tile, cerca de 10 px): dentro do lago continua água, longe dele nunca vira água. Cantos ficam arredondados e a margem deixa de ser uma escada.
4. **Água com profundidade:** do raso turvo ao fundo de tinta, pela distância do ruído ao limite, com brilho oleoso e marcas de corrente. **Lama** só perto do lago (portão pela cobertura limpa), escura junto da água e seca mais longe. **Fio de luz** arroxeado, fino, na linha d'água.
5. **Continuidade entre chunks:** tudo sai de funções globais (`valueNoise`/`hash2` em tiles do mundo) e de um mapa de tiles que cobre a margem de 2 tiles, então a emenda não tem salto maior que o normal dentro do chunk.
6. **Integração:** `generateChunkCanvas` desenha a camada depois do relevo das dunas e antes dos detalhes por tile. O que ficou por tile: a base de lama no chão borrado e as ondas e os juncos (ondas só em água com 2 ou mais tiles de fundura). Saíram o degradê de lama por tile e as três cores do lago de `terrain.ts`. A espuma do `WorldRenderer` recua 8 px nas pontas dos segmentos do lago negro para não passar pelas quinas arredondadas.
7. Sem `Math.random`/relógio; a camada devolve `null` sem lago na margem do chunk ou sem Canvas completo (Node), e o desenho é determinístico por semente.

## Verificação

- `tests/south-black-lake.test.ts` (16 testes): um assunto por arquivo; ruído do lago igual ao do terreno; cobertura (1, 0, 0,5 na borda, cantos arredondados); ondulação limitada; água mais escura onde o ruído é maior; sombreamento puro, estável e transparente sem lago; água opaca no miolo; **costa a até 14 px da borda do tile e terra longe do lago sem nada** (7 chunks); lama marrom só junto da água e mais escura perto dela; fio de luz fino; emenda entre chunks; camada `null` sem lago ou sem Canvas; integração no chunk (com e sem lago); terreno sem as cores antigas; espuma com recuo.
- Mutações conferidas (todas reprovadas): sem fio de luz, lama sem portão, sem lama, profundidade chapada, costa deslocada meio tile, sem ondulação, água só no miolo, camada não desenhada, espuma sem recuo.
- `tests/browser/south-black-lake.spec.ts` (desktop e Android): o lago abre com água escura e areia ao lado, sem erro (fumaça).
- Custo: um chunk com lago gera em cerca de 18 ms contra 15 ms de um chunk de dunas sem lago (Chromium, medido no navegador).
- Capturas antes e depois no jogo real (tile 76, 15552).

## Limites

- Um trecho reto de costa (vários tiles alinhados) continua reto; a ondulação o desvia no máximo 10 px, para a imagem não descolar da colisão.
- A água não anima por frame (ondas e juncos seguem por tile); reflexo e ondulação animada ficam para uma fatia própria.
- Android físico não foi testado; o spec roda no perfil Android emulado.
