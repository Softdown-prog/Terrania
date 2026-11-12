# ADR 0043 — Acabamento visual, fatia 8 (parte 2): prédios da cidade, comércio e serviços

**Estado:** entregue em 2026-11-12, direto na `main` por pedido do dono ("sim, pode ser" para começar pelos prédios). Segunda parte da cidade do Poço Negro (a primeira foi o piso, ADR 0042); as moradias e o ossuário ficam para a parte 3.

## Contexto

Os doze prédios da cidade eram pintados por uma única função (`building` em `southCityArt.ts`) feita só de retângulos e polígonos chapados: a mesma caixa com variações de cor, sem textura, sem desgaste, sem volume e desenhada **a cada quadro** (sem cache). Ao lado dos personagens, pareciam peças de protótipo.

## Decisões

1. **Um pintor por prédio, cada um no seu arquivo**, na pasta da cidade (`src/render/south/city/buildings/`): `fortress` (Fortaleza do Poço), `forge` (Fornalha dos Trolls), `inn` (Hospedaria Sombra do Escorpião), `bazaar` (Bazar das Raridades), `poisons` (Casa de Venenos) e `temple` (Templo do Sol Negro). `index.ts` só reexporta e liga o pintor ao prédio pelo id.
2. **Kit de prédios** (`kit.ts`, `BuildingKit`): parede de frente com **três texturas** (reboco de barro com camadas à mão, remendos de gesso e tijolo à mostra e rachaduras; tábuas com veios, nós e pregos; alvenaria de fiadas), desgaste recortado na silhueta, **telhado de telhas** em fiadas de escamas com beiral e sombra na parede, **ameias** com volume, **toldo** listrado com bainha em onda, **luz dos vidros** que vaza para a parede e **tabuleta** pendurada. Usa o pincel das torres (porta com degraus, janela com vidro aceso, sombra, entulho de blocos e rampa de areia) e o desgaste delas, porque pedra e barro envelhecem do mesmo jeito.
3. **Cada prédio com a sua identidade:** a Fortaleza tem torre de menagem com estandarte, ameias de osso, panos pendurados e frestas de arqueiro; a Fornalha, chaminé de pedra, fornalha acesa na janela, bigorna e carvão com brasa; a Hospedaria, telhado vinho, janelas acesas, lanterna e a caveira na tabuleta; o Bazar, toldo listrado, caixotes, potes e panos tingidos; a Casa de Venenos, alvenaria roxa, janelas verdes, alambique, frascos e trepadeira; o Templo, frontão com o disco de bronze, pilastras e degraus.
4. **Cache e chama.** O corpo do prédio vai para o cache de sprites do cenário (uma vez por prédio, 220 × 190 px), em vez de ser repintado a cada quadro. A **chama animada** (Fornalha e Casa de Venenos) é pintada a cada quadro por cima, apoiada exatamente na boca da chaminé e do alambique (`flame.ts`), com o tempo da simulação. A chama antiga ficava no centro do prédio; agora fica onde deve.
5. **Geometria e colisão intactas:** posição, tamanho aproximado, porta e a colisão por prédio (`southCityBlocks`) não mudaram. Os outros seis prédios seguem no desenho antigo até a parte 3 (o cenário escolhe o pintor novo pelo índice e cai no antigo quando não há).
6. **Contrato de arte:** os seis prédios e as duas composições com chama estão registrados como `structure` e passam, sem baixar nenhum piso.

## Verificação

- `tests/south-city-buildings.test.ts` (10 testes): um arquivo por prédio; pintores só de prédios que existem, com os outros seis ainda no desenho antigo (índice arredondado, valores inválidos); cada prédio estável, com desenho próprio, equilibrado, dentro do sprite, com porta e a fortaleza com as suas 13 ameias; a parede (três texturas, riscos de chuva contados, umidade só no chão, recorte); o telhado (fiadas crescem com a altura, sombra do beiral, cumeeira); ameias, toldo e luz dos vidros; a chama (só nos dois prédios, no topo certo, balançando com o tempo, parada com tempo inválido, exatamente na boca da chaminé e do alambique); e o cenário (sprite uma vez, chama a cada quadro, prédio antigo sem sprite).
- Mutações conferidas (todas reprovadas): tábuas iguais ao reboco, parede sem riscos, umidade em todo andar, telhado de fiadas fixas, beiral sem sombra, cumeeira sem contorno, ameia sem topo, toldo sem bainha e de uma cor só, vidro sem luz, venenos sem chama, chama fora do topo, parada e fora da chaminé, templo sem pintor e sem porta, fortaleza sem ameias, cenário sem chama e com chave de sprite única.
- Contrato de arte: seis prédios e duas chamas passam; determinismo exato.
- Capturas do jogo real (norte, leste e sul da cidade) e dos seis prédios isolados.

## Limites

- Ainda no desenho antigo: Ossuário, Estábulo de Lagartos, Casa de Argila, Tenda de Couro, Casebre de Ossos e Barraca sobre Estacas (parte 3). O código antigo dos seis migrados continua em `southCityArt.ts` até lá, sem uso.
- Os objetos da cidade (poço, tendas, barracas, tochas, placas, muralha e portões) e a areia dentro dos muros seguem para as próximas partes.
- Android físico não foi testado; a fumaça de navegador cobre o perfil Android emulado.
