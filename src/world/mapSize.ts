/**
 * O tamanho do mapa em um lugar só (ADR 0059). O mundo é gerado por fórmula, sem fim; o que o limita é a parede invisível da
 * colisão, e o que o organiza é a distância do centro: as Terras da Travessia até certo ponto, uma mistura, e depois cada
 * região pura. Cada número aqui é em tiles (32 px) e conta a partir da Vila da Travessia, no tile (0, 0).
 *
 * O mapa foi reduzido pela metade em cada lado (a área caiu a um quarto); a coluna `ANTES` guarda os números antigos só para
 * migrar saves feitos no mapa maior.
 */
/** Até onde se anda, por eixo, a partir do centro: a parede invisível. */
export const MAP_EDGE_TILES = 15_625;
/** A região central acaba, e a mistura com as regiões de fora começa, a esta distância (a maior entre |x| e |y|). */
export const REGION_BLEND_START_TILES = 1_900;
/** A mistura acaba, e a região de fora fica pura, a esta distância. */
export const REGION_BLEND_END_TILES = 4_850;
/** Escala (em tiles) do ruído que entorta a fronteira entre as regiões, e o quanto ele a desloca (em tiles). */
export const REGION_NOISE_SCALE_TILES = 2_350;
export const REGION_NOISE_SHIFT_TILES = 475;
/** A costa do Leste começa a se formar nesta distância e vira mar aberto na outra (só no eixo x, a leste). */
export const COAST_START_TILES = 3_550;
export const COAST_FULL_TILES = 11_500;
/** O pântano do sudeste começa quando x e y passam desta distância (e só entre as duas diagonais, perto do Sul). */
export const MARSH_START_TILES = 4_500;
/**
 * Distância da cidade do Poço Negro à Vila, ao sul. É a metade de 15.500 (7.750) ajustada em 6 tiles para 7.756: os dois números
 * deixam resto 12 na divisão por 16 (o tamanho de um chunk), então a cidade cai no mesmo lugar dentro da grade de desenho de
 * antes (a praça, as muralhas e a arte alta em cada chunk), só 484 chunks mais perto. Com 7.750 ela ficaria deslocada 6 tiles na grade.
 */
export const SOUTH_CITY_DISTANCE_TILES = 7_756;

/** Versão do tamanho do mapa que vai dentro do save: saves sem ela (ou com outra) vêm do mapa maior e são migrados ao carregar. */
export const MAP_VERSION = 2;
/** Os números do mapa anterior (versão 1), só para migrar saves. */
export const ANTES = { edgeTiles: 31_250, southCityDistanceTiles: 15_500 } as const;
