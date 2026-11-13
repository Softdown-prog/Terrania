# ADR 0049 — Acabamento visual, fatia 8 (parte 4a): muralha, portões, torres de guarda e poço da cidade

**Estado:** entregue em 2026-11-13, direto na `main` por pedido do dono ("sim, vamos para a cidade"). Quarta parte da cidade do Poço Negro; esta cuida do **perímetro e do centro** (muralha, portões, torres e poço). As tendas, barracas, tochas, ossos, barris, palmeiras, placas, arena, curral e a areia dentro dos muros ficam para a parte 4b.

## Contexto

A muralha era uma faixa laranja lisa com espetos brancos, os portões uma barra fina com uma caveira, as torres de guarda caixas pequenas de barro com uma chama pintada **no meio do corpo** (um engano do desenho antigo) e o poço, que dá nome à cidade, um disco liso com um cabo e uma caveira. Todas eram pintadas **a cada quadro**, sem cache.

## Decisões

1. **Um pintor por peça, cada um no seu arquivo** (`src/render/south/city/props/`): `wall.ts` (trecho de muralha), `gate.ts` (portão), `watchtower.ts` (torre de guarda), `well.ts` (poço), `animation.ts` (o que se mexe) e `index.ts` (o cadastro `CITY_PROP_ART`, com o tamanho do sprite de cada uma). Usam o kit dos prédios (`BuildingKit`) e, por ele, o kit do Sul.
2. **Muralha:** tijolo de barro com fiadas de 8 px, juntas alternadas, soco de pedra com umidade, cornija com a sombra dela na parede e ameias de osso. Como os trechos de 64 px se encostam, **o que cruza a emenda tem período fixo** (ameias de 16 em 16 px com o vão na emenda, fiadas nas mesmas alturas, juntas em múltiplos de 8 px) e a areia ao pé do muro não passa da emenda. O desgaste (remendo de gesso, rachaduras curvas, fresta de arqueiro, ameia lascada, riscos de chuva dos vãos) fica no miolo e muda entre as quatro variações.
3. **Portão:** viga de alvenaria com cornija e merlões, grade de ferro erguida (barra e ponteira a cada 9 px), estandarte de guerra com a caveira, pilares nas pontas com entulho aos pés. O Portão das Presas tem nove presas de osso pendendo da viga; o Portão dos Ossos, sete ossos pendurados em cordas. A abertura por baixo fica livre.
4. **Torres de guarda:** alvenaria com soco de pedra roxa, faixa de bronze, frestas de arqueiro com ponta em arco, ameias de osso e um braseiro de ferro no alto. A da esquerda tem estandarte e fogo violeta; a da direita, verde.
5. **Poço:** anel de 22 blocos com volume (os do fundo mais escuros, os da frente mais claros), água com degradê, pedra molhada na linha d'água e, no meio, o totem de osso com a caveira grande, a travessa, a corda e o balde de bronze.
6. **Cache e animação.** O corpo de cada peça vai para o cache de sprites (um por variação: 4 de muralha, 2 de portão, 2 de torre, 1 de poço). Só o que se mexe é pintado a cada quadro: o **fogo do braseiro**, que agora nasce exatamente nas brasas, e os **reflexos na água do poço**, recortados na elipse da água. O pincel de chama (`FlameBrush`, com cores laranja, verde e violeta) é um só para os prédios e as peças.
7. **O desenho antigo dessas quatro peças saiu** de `southCityArt.ts` (muralha, torre, poço e a viga do portão). Posição, número de trechos e colisão (os tiles da muralha, o raio do poço) não mudaram.
8. **Contrato de arte:** muralha (4 variações), portão (2), torre (2), poço e as duas composições com animação estão registrados como `structure` e passam, sem baixar nenhum piso.

## Defeito achado pelos testes

O entulho dos pilares do portão era desenhado em volta do **centro** da peça, não em volta de cada pilar (o pincel espalha em torno da origem), então caía no meio da abertura. O teste "a abertura é livre" pegou; o entulho agora é desenhado deslocado até o pé de cada pilar.

## Verificação

- `tests/south-city-props.test.ts` (9): um arquivo por peça e o desenho antigo removido; muralha (variações estáveis e normalizadas, ameias de 16 em 16 px, fiadas e juntas com período fixo, areia dentro da emenda, remendo só nas ímpares, fresta só na 2, rachaduras curvas); portão (presas contra ossos, uma caveira, grade com as barras, abertura livre); torre (ameias, brasa de cada lado, fogo apoiado nas brasas, frestas em arco); poço (22 blocos, a mesma elipse de água na pintura e na animação, caveira, corda); animação (só torre e poço, cores, tempo inválido, recorte); cenário (sprite por variação, o 5 reaproveita o 1, só torre e poço animam, tenda segue o desenho antigo); e o pintor da cidade usando o cadastro.
- Mutações (todas reprovadas): ameia fora do período, fiadas de 9 px, remendo nas pares, areia passando da emenda, fresta na variação errada, portão dos ossos igual ao das presas, estandarte sem caveira, entulho no meio da abertura, grade com poucas barras, fogo longe das brasas, estandartes e brasas da mesma cor, anel de 12 blocos, poço sem caveira, fogo sempre violeta, poço sem animação, reflexos sem recorte, muralha com duas variações no cache, cenário sem animação e violeta igual ao verde.
- Contrato de arte e fronteiras entre regiões verdes; capturas do jogo real (portão norte com as torres acesas e a praça com o poço).

## Limites

- Faltam, no desenho antigo de retângulos: tendas, barracas de feira, tochas, ossos, barris, palmeiras, placas, a arena e o curral, e a areia dentro dos muros (parte 4b).
- A muralha é a mesma peça nos quatro lados: nos lados leste e oeste os trechos se empilham na vertical e a sombra da frente fica de lado; uma variante própria para os lados é um refinamento futuro.
- Android físico não foi testado; a fumaça de navegador cobre o perfil Android emulado.
