# ADR 0057 — Capital dos povos humanos, parte 3: piso da cidade, Praça dos Povos e monumento da Concórdia

**Estado:** entregue em 2026-11-14, direto na `main`, por pedido do dono ("ok, vamos continuar"). Terceira parte da capital (ADR 0055 e 0056): o chão de pedra e o monumento do centro entram com a colisão do monumento ligada junto, para não haver parede invisível.

## Decisões

1. **A praça no mundo** (`src/world/center/capital/plaza.ts`): `isCapitalPlaza` e `isCapitalPlazaLocal` dizem se um tile é da Praça dos Povos (23 × 23 tiles em volta do centro). O retângulo vem da própria planta (a rua `praca-dos-povos`), sem número repetido. O monumento entra em `props.ts` como a peça 135 (`monumento-da-concordia`, no centro exato da praça).
2. **Colisão ligada.** `capitalMonumentBlocks` (um círculo de 2,25 tiles = 72 px de raio mais o corpo de quem anda) entra em `collision.ts`, ao lado da muralha. O herói não atravessa o monumento e anda livre em volta dele, na praça. `capitalBlocks` continua incluindo os terrenos dos edifícios, que **ainda não** estão ligados à colisão (sem arte seriam parede invisível). Valor inválido bloqueia, como na muralha.
3. **Piso da cidade** (`src/render/center/capital/paving/`, uma peça por arquivo):
   - `setts.ts`: onde fica cada pedra. Ruas: granito escuro em pedras de 16 × 8 px (4 fiadas por tile); praça: lajes de calcário de 32 × 16 px (2 fiadas). As fiadas alternam meia pedra, também de um tile para o de baixo, e o tom e o sorteio de cada pedra vêm do **tile global**, então a pedra que atravessa a emenda de dois tiles sai igual nos dois lados (sem quadriculado). Só depende de (tx, ty, semente): sem relógio nem sorteio solto.
   - `palette.ts`: quatro tons por tipo (rua mais escura, praça mais clara), a argamassa, o dourado e o azul-real da incrustação, e `stoneLook` (luz, corpo e sombra de cada combinação, em oito níveis, guardadas em cache: no máximo 64 combinações).
   - `paving.ts`: argamassa, três retângulos por pedra (sombra, luz e corpo), rachadura em algumas pedras, quina gasta em outras e, em um de cada três tiles, uma pedra polida com brilho em degradê.
   - `sun.ts`: a **rosa dos ventos** de pedra da praça, quatro anéis (azul 96, dourado 112, dourado 176, azul 192 px) e oito raios (os cardeais dourados, os diagonais azuis) que saem do monumento até 330 px. Cada tile desenha só o pedaço que passa por ele, recortado no tile, então a incrustação é contínua e o custo é de poucas operações por tile.
   - `curb.ts`: meio-fio de calcário (4 px) nos lados que encostam no gramado, e a sombra do meio-fio na grama (5 px).
   - O desenho do terreno (`terrain.ts`) chama o piso onde a planta diz que é caminho da capital, com os lados de meio-fio vindos dos vizinhos, e a sombra do meio-fio no gramado colado ao caminho. Fora da capital nada muda.
4. **Monumento da Concórdia** (`src/render/center/capital/props/monument.ts`): estrado de três degraus de calcário, dois anéis incrustados na tampa que repetem o piso, **cinco pilares, um por povo** (Centro azul-real, Norte gelo, Sul violeta, Leste mar, Oeste brasa), cada um com gema e pendão na cor da sua região, e, no meio, um pedestal que sustenta o **sol dourado da capital** (doze raios, disco, brilho em "screen"). Os pilares de trás são desenhados antes do pedestal e os da frente depois. É a ideia da conciliação: cinco povos em volta de uma mesma luz. Uma variação só; cadastrado em `props/index.ts` com uma linha.
5. **Contrato de arte:** o monumento (estrutura) e quatro amostras do piso (pedras da rua, meio-fio, anel e raio da praça) estão registrados e passam sem baixar nenhum piso; o piso ganhou rachaduras, quinas gastas, brilho polido e sulcos mais escuros para chegar lá, em vez de afrouxar o contrato.
6. **Orçamentos (ADR 0054: qualidade primeiro).** Medidos no chunk da praça (5.367 operações, 59 degradês) e no do Grande Portão do Norte (8.493 operações, 48 degradês): ficam abaixo do teto de qualquer chunk (10.800 / 300). Entraram como casos de `chunk-cost-budget` (teto de 6.500 operações e 75 degradês na praça; 10.200 e 60 no portão) e como pontos de `chunk-time.spec`, sem subir nenhum limite existente.

## Verificação

- `tests/center-capital-paving.test.ts` (10): tamanho e fiadas das pedras, cobertura de ponta a ponta, meia pedra alternada, continuidade na emenda de tiles (mais de 300 emendas conferidas), cores e cache de `stoneLook`, meio-fio e sombra no gramado (retângulos por lado), rosa dos ventos (anéis e raios, tiles tocados, recorte), contagem de operações do tile, rachaduras, quinas e brilho, a ligação ao desenho do terreno (a praça pinta, a vila e o campo não) e um arquivo por peça.
- `tests/center-capital-monument.test.ts` (7): estável e sem depender da variação, três degraus e anéis, cinco pilares sobre o anel com as cores das regiões, sol no meio entre os pilares de trás e os da frente, tudo dentro do sprite do cadastro, uma peça na planta, e a colisão (raio exato de 72 px mais o corpo, diagonal, anel de 60 bloqueado e de 90 livre, eixo de acesso livre).
- Testes antigos ajustados: 135 peças, monumento bloqueia e terrenos ainda não, cadastro com cinco tipos, arquivos de `plaza`.
- `tests/browser/center-capital.spec.ts` (+3 testes em desktop e Android): a praça aparece pintada (dourado e azul-real), o herói **para diante do monumento** andando pelo eixo e **passa ao lado** a 6 tiles dele.
- Mutações (26 de código: 25 reprovadas e 1 equivalente, e 2 de navegador reprovadas): colisão do monumento (ligação, raio, comparação, inclusão em `capitalBlocks`), borda da praça, id e posição da peça, tamanho e deslocamento das fiadas, tons, brilho, cantos gastos, rachaduras, níveis de cor, largura do meio-fio e da sombra, anéis e raios da rosa dos ventos (cor, raio de início, margem de recorte, restauração do contexto), ordem dos pilares, raio da gema, quantidade de raios do sol e a ligação ao desenho do terreno. Sobreviveu por ser equivalente: `<` por `<=` no sorteio do brilho (um valor cair exatamente em 0,34 não acontece).

## Limites

- Os terrenos dos edifícios ainda não bloqueiam e não são desenhados; sem moradores, interiores nem tochas animadas.
- O piso das ruas é igual em toda a cidade (a diferença entre bairros virá com os edifícios).
- Android físico não foi testado.
