# ADR 0050 — Acabamento visual, fatia 8 (parte 4b): feira, tochas, ossos, barris, placas, palmeiras, arena, curral e a terra da cidade

**Estado:** entregue em 2026-11-13, direto na `main` por pedido do dono ("vamos continuar para a parte 4 b"). Fecha a cidade do Poço Negro: depois do piso (ADR 0042), dos prédios (ADR 0043 e 0044) e do perímetro (ADR 0049), faltavam os objetos de vida e o chão de dentro dos muros.

## Contexto

Tendas, barracas, tochas, ossos, barris, palmeiras, placas, a arena e o curral eram retângulos e elipses lisos no desenho antigo (`southCityArt.ts`), pintados **a cada quadro**, sem cache. A areia dentro dos muros era a mesma terra de qualquer lugar do deserto, sem marca de quem passa por ela.

## Decisões

1. **Um pintor por peça, cada um no seu arquivo** (`src/render/south/city/props/`): `tent.ts`, `stall.ts`, `torch.ts`, `bones.ts`, `barrel.ts`, `sign.ts`, `palm.ts`, `arena.ts` e `corral.ts`, todos no cadastro `CITY_PROP_ART` (agora com 13 tipos). Usam o kit dos prédios e, por ele, o kit do Sul.
2. **Tenda** (5 variações de cor de pano: vinho claro, vinho escuro, verde, bronze e vinho rosado): dois planos de pano, listras recortadas no pano, bainha em seis ondas, mastros de osso com ponta de bronze, cordas e estacas, a boca escura com um caixote e o saco de areia.
3. **Barraca de feira:** balcão de tábuas, cinco frutas em duas cores, dois potes, caveira de enfeite, toldo listrado entre dois postes e caixote ao lado.
4. **Tocha de rua** (2 variações): poste de bronze com três anéis, base de pedra e bacia de ferro. O fogo é animado por quadro e nasce no centro da bacia (`TORCH_FIRE`): violeta nas pares, verde nas ímpares, como as torres de guarda.
5. **Ossos, barril, placa:** ossos com quatro costelas que se afinam, ossos cruzados e caveira de animal; barril com aduelas curvas, três aros de ferro e a mancha de alcatrão; placa de poste com a tábua entalhada, quatro pregos e uma caveirinha.
6. **Palmeira:** tronco curvo com anéis, oito folhas arqueadas (nervura, folhinhas dos dois lados e brilho de sol), cacho de cinco tâmaras e duas folhas secas.
7. **Arena de lagartos:** três degraus de arquibancada com 90 assentos, picadeiro de areia com rastros de patas, borda de osso, portão escuro, quatro bandeiras e doze pontas de osso e pedra. **Curral:** chão pisado com pegadas, duas cercas de nove estacas e três travessas, mourões altos, fardo de palha e cocho.
8. **Terra da cidade.** Uma terceira camada de relevo (`CITY_EARTH_LOOK`, em `south/terrain/dunes/palette.ts`) cobre só a areia de dentro dos muros: mais quente e escura que a terra batida das planícies e com contraste menor (0,42 contra 0,5), porque o que sobra são marcas de pisada, não dunas. Por cima, `CityEarth` (`src/render/south/city/earth.ts`) espalha em alguns tiles seixos com sombra, tufos de capim seco e rachaduras curtas, tudo por `hash2` da posição e da semente: cerca de um terço dos tiles ganha seixos, um em oito capim, poucos rachaduras, no máximo dois detalhes por tile.
9. **Cache e animação.** O corpo de cada peça vai para o cache (uma entrada por variação). Só o fogo das torres e das tochas e a água do poço são pintados a cada quadro.
10. **O desenho antigo saiu de vez:** `paintSouthCity` não existe mais e `southCityArt.ts` guarda só as cores do chão da cidade. O pintor de cenário da cidade usa **somente** o cadastro de peças; um tipo sem pintor não desenha nada. Posição, quantidade e colisão das peças não mudaram.
11. **Custo.** A camada de terra é mais um passo do chunk em fatias (agora **22**: nove de chão, desfoque, relevo duas vezes, terra da cidade, lago e sete de detalhes). O passo é sempre dado, mas só pinta nos chunks com areia da cidade (nos outros, a camada sai vazia). Os orçamentos de operações por chunk (ADR 0046) continuam valendo sem subir nenhum limite.
12. **Contrato de arte:** as peças novas estão registradas em `tests/helpers/artAssets.ts` e passam sem baixar nenhum piso.

## Verificação

- `tests/south-city-fair.test.ts` (10): cada tenda na sua cor, sete listras, seis ondas na bainha, mastros e boca; barraca com cinco frutas, dois potes e postes do toldo; tocha com brasa de cada cor, três anéis e o fogo no centro da bacia; fogo violeta ou verde, dançando e sem efeito com tempo inválido; ossos (costelas que afinam), barril (três aros e alcatrão) e placa (tábua e quatro pregos); palmeira (oito folhas, cinco tâmaras); arena (degraus, 90 assentos, 12 pontas, rastros); curral (estacas, travessas, mourões, fardo, cocho); cadastro (origem dentro do sprite, número de variações, save e restore em par).
- `tests/south-city-earth.test.ts` (5): relevo mais escuro e suave que a terra batida; detalhes estáveis, dependentes de lugar e semente e dentro do tile; frequências de seixos, capim e rachaduras; ordem sombra, corpo e brilho do seixo; e a terra usada só na areia dentro dos muros, depois dos dois relevos e antes do lago.
- `tests/south-city-props.test.ts` e `tests/chunk-steps.test.ts` atualizados (13 tipos no cadastro, desenho antigo removido, 22 passos).
- Mutações (todas reprovadas): bainha em passos de 8 px, estacas de 16 px, 25 assentos, brasa da tocha trocada, seixos a 50%, capim a 30%, passo da terra sem `yield`, detalhes de terra removidos, tocha sem animação, palmeira com sete folhas, barril com dois aros, placa com três pregos, contraste da terra a 0,6, costela a menos e barraca com quatro frutas.
- Capturas do jogo real: feira (tendas e barracas), arena, curral, palmeira e a rua com as tochas.

## Limites

- A palmeira é uma só peça e o tronco é curto perto das folhas; variações de altura e de ângulo são refinamento futuro.
- A terra da cidade não distingue o miolo das bordas: perto dos muros ela é igual à do meio.
- Android físico não foi testado; a fumaça de navegador cobre o perfil Android emulado. O pico isolado de ~200 ms no navegador sem GPU (ADR 0047) segue sem explicação e precisa de medição em aparelho real.
