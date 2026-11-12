# ADR 0040 — Acabamento visual, fatia 6: ruínas do Sul

**Estado:** entregue em 2026-11-12, direto na `main` por pedido do dono ("vamos para as ruínas"). Sexta fatia da campanha ([docs/QUALIDADE_VISUAL.md](../QUALIDADE_VISUAL.md)).

## Contexto

As quatro ruínas (Colunata Quebrada, Templo Desabado, Torre Caída, Muralha do Povoado) eram desenhadas por um único arquivo de 336 linhas (`src/render/southRuinsArt.ts`). Tinham volume e contorno, mas as peças ficavam **limpas demais**: pedra sem desgaste, areia como manchas chapadas de uma cor só, nada caído ao pé das paredes e pisos sem junta quebrada. Junto, vale a regra do dono de **um assunto por arquivo, na pasta da região**.

## Decisões

1. **Divisão sem mudar nenhum pixel (primeiro passo).** O arquivo único virou `src/render/south/ruins/` com um arquivo por peça: `wall`, `column`, `pillar`, `oven`, `steps`, `towerFloor`, `clayFloor`, `drum`, `pot`, `ground`, mais `palette`, `brush` (pincéis que as peças dividem, numa classe como a das torres), `layer`, `paint` (a ruína inteira) e `index` (só reexporta). A igualdade foi provada comparando a assinatura de desenho das 12 combinações (4 ruínas × 3 camadas) antes e depois da divisão: idênticas.
2. **Acabamento (segundo passo).** Em `brush.ts`: `rubble` (bloco lapidado caído, com três faces, contorno e sombra), `streaks` (riscos de chuva e fuligem que descem do topo), `lichen` (ocre com olivo por cima) e a areia acumulada (`drift`) agora com **volume**: degradê do lado da luz para o da sombra e uma crista clara. Cada peça usa o que lhe cabe:
   - paredes: riscos de chuva, covas de blocos soltos, líquen e entulho aos pés;
   - colunas e pilares: riscos, líquen, lasca e areia no pé; coluna baixa ganha entulho, a inteira não;
   - forno: fuligem que sobe da boca, cinza, rachadura e tijolos soltos;
   - degraus: quinas lascadas, rachadura, capim seco na junta, areia soprada e brilho;
   - piso da torre: lajes com luz de noroeste (degradê radial), lajes soltas, rachaduras e capim;
   - piso de barro: luz na diagonal, fendas que se ramificam e mancha de fogo antigo;
   - tambor caído: caneluras, líquen e lasca; pote: faixa de pigmento, lasca, rachadura e areia;
   - chão em volta: uma língua de areia empurrada pelo vento, com marcas de ondulação.
3. **Geometria e colisão intactas.** `RUIN_PIECES` (posição, tamanho, `solid`) e `southRuinBlocks` não mudaram: o que se vê continua sendo o que bloqueia.
4. **Contrato de arte.** Cada peça é um desenhador exportado, então foi registrada em `tests/helpers/artAssets.ts` (14 novos registros, como `prop`; a ruína inteira segue como `structure`). **Nenhum piso foi baixado:** as peças começaram reprovadas sozinhas (poucas cores, sem brilho, sem degradê) e foram melhoradas até passar.
5. Sem `Math.random`/relógio: todo o sorteio vem de `hash2`; as ruínas seguem pintadas uma vez em cache (`scenery.ts`, duas camadas por variante).

## Verificação

- `tests/south-ruins-art.test.ts` (10 testes): um arquivo por peça e o arquivo antigo removido; ruína inteira estável, com quatro desenhos e três camadas, tolerante a valores inválidos; pincéis (entulho com três faces e contorno, riscos por largura e sorteio, areia com degradê e crista, líquen); cada peça com as suas marcas (cores de fuligem e líquen, posição do bloco caído, degradês, ondulações); e o cenário com um sprite por variante e camada, uma vez só.
- Mutações conferidas (todas reprovadas): parede sem riscos, sem entulho, sem líquen; coluna sem entulho e sem líquen; pilar sem areia; forno sem cinza; degrau sem brilho e sem capim; piso da torre sem degradê radial; piso de barro com a luz trocada; tambor sem líquen; pote sem faixa; chão sem língua de areia e com ondulações retas; riscos de outra cor; entulho sem contorno.
- Contrato de arte: as quatro ruínas e as 14 peças passam; o determinismo continua exato.
- Captura antes e depois no jogo real (Muralha do Povoado) e das quatro ruínas isoladas.

## Limites

- Não mudei o tamanho das ruínas: a pegada e a colisão vêm de `RUIN_PIECES`, e crescer a ruína é uma decisão de mundo (afeta onde cabem e as ruínas já existentes nos saves), não de arte.
- A areia e o desgaste são estáticos (cacheados); vento, poeira e sombra que acompanha o dia ficam para uma fatia própria.
- Android físico não foi testado; a fumaça de navegador cobre o perfil Android emulado.
