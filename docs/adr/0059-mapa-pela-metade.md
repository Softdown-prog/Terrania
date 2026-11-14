# ADR 0059 — O mapa global pela metade em cada lado

**Estado:** entregue em 2026-11-14, direto na `main`, por pedido do dono ("vamos diminuir o tamanho total do mapa global do jogo pela metade"). O dono escolheu, entre as opções, reduzir **cada lado pela metade** (a área cai a um quarto), com o **Poço Negro** encolhendo junto e a **Vila** e a **capital** ficando onde estão.

## O que é "o mapa" neste jogo
O mundo é gerado por fórmula e não tem fim. O que o limita é a **parede invisível** da colisão, e o que o organiza é a **distância do centro**: as Terras da Travessia até certo ponto, uma faixa de mistura e, depois dela, cada região pura (Norte, Sul, Leste, Oeste). Havia seis números de distância, um deles escondido num `if`, e outro numa fórmula de costa.

## Decisões

1. **Um lugar só para os números** (`src/world/mapSize.ts`), em tiles a partir da Vila:

   | O quê | Antes | Agora |
   | --- | --- | --- |
   | Parede invisível (por eixo) | 31.250 | **15.625** (500.000 px) |
   | Fim da região central / começo da mistura | 3.800 | **1.900** |
   | Fim da mistura / região de fora pura | 9.700 | **4.850** |
   | Escala do ruído que entorta a fronteira | 4.700 | **2.350** |
   | Quanto esse ruído desloca a fronteira | 950 | **475** |
   | Costa do Leste: começa / mar aberto | 7.100 / 23.000 | **3.550 / 11.500** |
   | Pântano do sudeste (x e y acima de) | 9.000 | **4.500** |
   | Poço Negro, ao sul da Vila | 15.500 | **7.756** |

   `collision.ts`, `regions.ts`, `terrainProfiles.ts`, `caves.ts`, `southCity.ts` e `loot.ts` importam de lá; um teste confere que nenhum dos números antigos sobrou nesses arquivos.
2. **As regiões são exatamente as de antes na metade da distância.** O ruído da fronteira foi reduzido na mesma proporção, então o ponto `(x, y)` de agora tem os mesmos pesos de região que o `(2x, 2y)` de antes (a diferença é menor que 1e-9, conferida em 4.000 pontos). O desenho de cada região, a mistura e a forma da fronteira são os de antes, só mais perto.
3. **Poço Negro em 7.756, e não em 7.750.** A metade exata de 15.500 é 7.750, mas a cidade ficaria deslocada 6 tiles na grade de 16 tiles dos chunks (15.500 e 7.756 deixam resto 12; 7.750 deixaria 6). Com 7.756 a cidade cai **exatamente nos mesmos chunks de antes, 484 chunks mais perto**: a praça, as muralhas e a arte alta continuam no mesmo lugar de cada bloco de desenho, e os orçamentos de custo medidos para a cidade continuam valendo. A Vila (0, 0) e a capital (−2, −800) não se mexem; a capital continua na região central (800 < 1.900).
4. **Saves antigos** (`src/world/mapMigration.ts`, `src/storage/localSave.ts`). O save ganhou `mapVersion` (2). Ao carregar um save sem ela (todo save anterior):
   - quem estava no **Poço Negro antigo ou nas estradas dele** (100 tiles para cada lado do centro antigo) vai para o mesmo ponto da cidade nova, e os itens no chão da mesma área também;
   - quem estava em qualquer outro lugar dentro do novo mapa fica onde estava (se o chão mudou e o ponto ficou bloqueado, o motor já o devolve ao ponto inicial, como antes para qualquer obstáculo novo);
   - quem estava **além da parede nova** volta ao ponto inicial (o motor já faz isso para posição bloqueada), e os itens no chão além dela são descartados por `normalizeDrops`.
   O save novo traz a versão e nunca é migrado de novo; sem ela, um herói salvo na cidade nova seria arrastado a cada carga.
5. **Defeito que veio à tona: caverna dentro de ruína ou torre.** Dois testes antigos (ruínas e torres) passaram a falhar: com as regiões mais perto, a amostra de ruínas e torres passou a conter casos em que uma **entrada de caverna caía dentro da área** de uma ruína ou de uma torre. Nada impedia isso por construção; no mapa antigo o sorteio apenas não tinha caído nesses casos. As cavernas agora desviam (`src/world/siteFootprints.ts`, chamado por `safeEntrance`): a posição da ruína e da torre só depende de terreno, marcos e uma da outra, nunca das cavernas, então não há ciclo. A área é a que os testes sempre cobraram (ruína ±5 × −3..+3 tiles, torre ±6 × ±5).
6. **Texto do site:** a extensão técnica do mapa, no inventário, passou a dizer **31.250 × 31.250 tiles**; o atlas já lia o limite da colisão.

## Verificação

- `tests/map-size.test.ts` (8): cada número é metade do antigo; a parede da colisão e a do atlas são a mesma; ninguém anda além dela, nos quatro lados, e a cidade e a capital ficam longe dela; **as regiões são exatamente as de antes na metade da distância** (4.000 pontos, fórmula antiga escrita no teste); a Vila e a capital são só Travessia, o Poço Negro está no Sul puro e a estrada chega ao portão; a cidade cai 484 chunks mais perto com o mesmo resto na grade; a costa e o pântano começam na metade; as cavernas desviam das áreas de ruínas e torres (bordas exatas, 40 ruínas e torres da amostra, e as cavernas continuam existindo); nenhum número antigo sobrou fora de `mapSize.ts`.
- `tests/map-migration.test.ts` (6): o centro, os portões e o poço do Poço Negro antigo caem nos mesmos pontos da cidade nova; as bordas da área migrada (cada lado, dentro e fora); Vila, capital e o resto não se mexem; o save antigo é migrado ao carregar (posição, itens no chão, versão) sem tocar no resto; salvar e carregar três vezes devolve sempre o mesmo ponto; o herói além da parede nova volta à Vila e quem estava na cidade antiga chega à nova.
- Testes ajustados porque falavam do mapa antigo: atlas (números e setores), amostras de monstros em chunks a 24.800 tiles (além da parede nova; passaram a ~10.400), chunks da cidade (968 → 484) nos orçamentos de custo e tempo, no prefetch e nos passos, a distância da cidade, as amostras de piso (o brilho depende do tile), quatro cavernas de referência (nas células antigas do mar aberto e do pântano já não há entrada), e o texto do mapa nos testes de navegador.
- Mutações: ver o fim deste arquivo.

## Limites

- A área do mapa caiu a **um quarto**. A Vila ao Poço Negro cai de uns 48 para uns 24 minutos andando; a capital continua a uns 2,5 minutos da Vila.
- As regiões de fora começam bem mais perto da Vila (a mistura a 1.900 tiles, uns 6 minutos). Quem planejar o ritmo da aventura deve contar com isso.
- O terreno do Sul além de 4.850 tiles é **quase** o mesmo de antes nas mesmas coordenadas: o ruído é absoluto, mas o peso de cada região (que muda a borda de um lago, por exemplo) usa o deslocamento novo, menor. Os lagos negros, dunas e ruínas das amostras dos testes continuam no mesmo lugar, a menos de um tile na borda, e alguns agora ficam além da cidade, no deserto aberto, perto da parede. Quatro pontos de teste de navegador tiveram de ser levados para dentro da parede e um para um tile de terra ao lado do lago.
- Os testes de navegador que gravam um save à mão passaram a gravar `mapVersion: 2`; sem ela, um herói no deserto a 15.552 tiles, dentro da área do Poço Negro antigo, seria levado para a cidade nova (a migração funcionando).
- Não testei em aparelho Android físico.
