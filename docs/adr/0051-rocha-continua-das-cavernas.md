# ADR 0051 — Acabamento visual, fatia 9 (parte 1): rocha contínua nas cavernas

**Estado:** entregue em 2026-11-13, direto na `main` por pedido do dono ("ok, vamos lá"). Primeira parte das cavernas; esta cuida do **chão, das paredes e da água**. As formações (cristais, raízes, pedras) e a variedade das poças da Gruta Luminosa ficam para as próximas partes.

## Contexto

O andar de uma caverna era pintado **tile a tile**: cada quadrado de 32 px recebia uma cor lisa (uma mistura de ruído suave), a rocha era um preenchimento escuro com riscos repetidos e a água, um quadrado azul por tile. O resultado tinha três defeitos visíveis no jogo: o chão **quadriculado**, a silhueta das paredes **em degraus de tile** e a água em **quadrados** isolados.

## Decisões

1. **Um campo de altura contínuo** (`src/render/caveRock/field.ts`): função pura da posição em tiles e da semente (ruído em três escalas mais uma camada sedimentar fraca). O mesmo ponto tem a mesma altura de um tile para o outro, então não há costura.
2. **Silhueta arredondada do vazio** (`openness.ts`): cada amostra (uma a cada 4 px, 336 × 240 por andar) interpola a abertura entre os centros dos tiles vizinhos e recebe um leve tremor de ruído. Uma reta de tiles continua reta, uma quina para fora é arredondada e uma quina para dentro é suavizada. A borda nunca passa de cerca de um quarto de tile (8 px) da borda do tile, então a **colisão, que é por tile, continua valendo a olho**. Nada de colisão, planta, população ou save mudou.
3. **Sombreamento** (`shade.ts`), luz de noroeste: o chão e a parede saem do mesmo campo; o chão **escurece junto das paredes** (oclusão de cerca de 20 px), a parede **escurece com a profundidade** (cerca de 32 px) e ganha um **filete de luz** só nas bordas voltadas para a luz.
4. **Água sem quadrados** (mesma silhueta suave): a mistura dos tiles de água, com um nível mais baixo que a metade, faz de um tile isolado uma lagoa redonda e cheia; tem rampa própria (da paleta de água do tema) e um filete claro na margem.
5. **Cores** (`look.ts`): rampas de 64 passos para chão, parede e água, montadas uma vez por andar a partir da paleta do interior, a do tema ou a da Gruta Luminosa. A gruta luminosa continua inconfundível porque herda a paleta própria.
6. **Uma camada, um canvas pequeno ampliado** (`layer.ts`): o andar inteiro vira uma imagem de 336 × 240 ampliada com suavização por cima do canvas do andar. O resultado fica no cache do andar, sem custo por quadro. Sem Canvas completo (testes sem pixels), o piso segue com o preenchimento por tile de antes.
7. **O que saiu do piso** quando a camada existe: o preenchimento liso por tile, os riscos minerais repetidos da parede, as sombras de contato em faixa reta e os quadrados de água. As faces de rocha, formações, pedrinhas, rachaduras, escadas e a Gruta Luminosa continuam pintadas por cima, como antes.
8. **Custo medido** (Node, andar de 42 × 30): silhueta + sombreamento levam de cerca de 25 ms (aquecido) a 100 ms (primeira vez), uma única vez ao entrar no andar. Não há custo por quadro.
9. **Fronteiras:** `src/render/caveRock/` é geral das cavernas (não é de uma região); os cinco arquivos têm uma responsabilidade cada (`field`, `openness`, `look`, `shade`, `layer`) e `index.ts` só reexporta.

## Verificação

- `tests/cave-rock.test.ts` (13): altura estável, dependente da semente e contínua; camada sedimentar; distância ao conjunto; silhueta (centro do tile com o tipo do tile, fora do mapa é rocha, quina arredondada, borda a no máximo um quarto de tile em quatro cavernas reais, corredor de três tiles sem engordar nem emagrecer); água dentro do vazio e uma lagoa redonda por tile; sombreamento estável e opaco, chão mais escuro junto da parede; parede mais escura no fundo e filete só na borda voltada para a luz; água mais azul com filete na margem; rampas de 64 passos e o meio de cada uma na cor da paleta; a camada vira canvas (e `null` sem Canvas completo); um arquivo por peça e o piso usando a camada.
- Mutações (todas reprovadas): camada sedimentar trocada ou forte demais, limiar da silhueta, tremor da borda, nível da água, distância com custo errado, sem oclusão, sem profundidade, filete sem direção, sem filete de água, sem água, rampa de água da paleta errada, rampa da parede errada, quadrados de água de volta e tile de água errado.
- Testes de cavernas existentes (`cave-style`, `cave-art-contract`, contrato de arte e fronteiras) continuam verdes sem alterar nada neles.
- Capturas do jogo real (desktop) antes e depois, em seis cavernas: comum e luminosa de mata, geada e costa.

## Limites

- As formações continuam as mesmas (cristais, raízes, pedras pequenas) e as **poças da Gruta Luminosa continuam repetidas**: são as próximas partes.
- As faces de rocha (a "tampa" de pedra de 32 px) ainda seguem a borda do tile, não a silhueta arredondada; em quinas muito fechadas a tampa pode ficar uns poucos pixels fora do contorno.
- Android físico não foi testado; a primeira entrada num andar custa até uns 100 ms em máquina rápida, e ainda não foi medida num aparelho real.
