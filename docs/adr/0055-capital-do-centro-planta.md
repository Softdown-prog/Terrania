# ADR 0055 — Capital dos povos humanos, parte 1: a planta

**Estado:** entregue em 2026-11-14, direto na `main`, por pedido do dono ("agora podemos construir a cidade da parte central do mapa"). O dono escolheu: **capital nova** (a Vila da Travessia segue como começo do jogo), o **mapa das regiões** como está no código e **começar pela planta**.

## Contexto

O mundo é um RPG clássico dividido em regiões, cada povo com a sua depois de uma guerra; o Centro é dos povos humanos, e os heróis (cavaleiro, mago e arqueiro) são exploradores. O Centro só tinha a Vila da Travessia (39 × 31 tiles, 7 construções, tudo testado: tutorial da Aela e a primeira gruta). Mexer nela arriscaria o começo do jogo. O Poço Negro (Sul) é o modelo de cidade murada já feita.

## Decisões

1. **Capital nova**, em `src/world/center/capital/` (uma peça por arquivo, na pasta da região central). A região `center` entra na trava de fronteiras (`tests/helpers/boundaries.ts`); os arquivos do Centro não importam outra região.
2. **Onde e quão grande.** Centro da praça em (−2, −800), na região central, a uns 800 tiles da vila; **80 × 64 tiles**. O x do centro fica entre as duas estradas da travessia (a reta e a que serpenteia), que passam a 4,3 tiles uma da outra naquela altura, então o portão tem **9 tiles** (|lx| ≤ 4) e as duas entram por ele.
3. **Planta** (dados puros, determinísticos, O(1) por tile):
   - `layout.ts` (constantes e conversões), `streets.ts` (onze ruas e a muralha), `districts.ts` (quatro bairros), `plots.ts` (21 terrenos com tamanho e porta), `ground.ts` (terreno), `safe.ts` (zona protegida e terra limpa) e `blocks.ts` (muralha, fundações e monumento).
   - Ruas: Grande Avenida, Avenida dos Povos, Praça dos Povos (23 × 23), anel das muralhas e quatro travessas.
   - Bairros: Cidadela dos Povos, Alameda das Guildas, Quarteirão dos Ofícios e Saberes, Bairro Residencial e Cura. Três guildas, uma para cada herói, e o Arquivo dos Exploradores.
4. **Ligação com o mundo** (três linhas, nos arquivos que já cuidam de cada assunto):
   - `terrain.ts`: dentro da muralha, rua é caminho e o resto é grama; em volta, numa faixa de 40 tiles, lago, margem de areia e mata viram campo, sem árvore nem pedra.
   - `village.ts` (`protectedSurfaceTile`): a zona de dentro da muralha é protegida, como a vila e o Poço Negro.
   - `caves.ts`: nenhuma entrada de caverna na capital nem na faixa limpa.
5. **Colisão fica para a parte 2.** `capitalBlocks` (muralha, fundações, monumento) está pronta e testada, mas **não está ligada a `collision.ts`**: sem a arte da muralha e dos edifícios seria parede invisível. A ligação é uma linha quando a arte entrar.
6. **Nome de trabalho** "Concórdia" (uma constante); os nomes de terrenos e bairros também são propostas.

## Verificação

- `tests/center-capital.test.ts` (13): tamanho e posição no Centro; só rua e grama dentro da muralha em quatro sementes; terra limpa em sete sementes (sem lago, areia, mata, árvore nem pedra); as duas estradas entram pelo portão, em cima e embaixo; muralha de 266 tiles com portões de 9; ruas dentro da planta; 21 terrenos sem sobreposição, nem em cima da rua, com a porta para uma rua e três guildas; alcance de todas as portas a pé, de portão a portão e pela praça, e a muralha só se cruza pelos portões; bloqueios (muralha, fundações, monumento) e passagens livres; zona protegida e nenhum monstro nasce dentro, com monstros em volta (teste não vazio); nenhuma caverna dentro, nas sementes em que cairia; uma peça por arquivo e as três ligações no mundo.
- Mutações (todas reprovadas): limpeza da terra (lago, areia e pedra), ligação do terreno, zona protegida e cavernas, posição, largura do portão, margem e tamanho, ruas encurtadas, muralha sem o portão sul, tamanho e porta de terrenos, terreno removido, zona protegida incluindo a muralha, muralha, fundações e monumento. Duas sobreviveram por serem equivalentes: `!cleared` na árvore (o gerador do Centro não faz tundra) e a porta do Arquivo, que pode ser norte ou sul porque as duas dão para rua.
- Capturas do jogo real: a Grande Avenida cruzando a Avenida dos Povos na praça, e o Grande Portão do Norte com as duas estradas entrando.

## Limites

- Só terreno: a muralha, os portões, os edifícios, o monumento, os moradores e os interiores ainda não existem. Em jogo se vê a grade de ruas no campo, a zona protegida e os portões.
- O pântano, a sudeste, ainda não é região no código; e o código põe o frio no Norte, como o dono confirmou.
- Android físico não foi testado.
