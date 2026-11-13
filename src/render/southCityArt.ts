import { SOUTH_CITY_PALETTE as C } from "../world/southCity.ts";
/**
 * Cores do chão da cidade do Poço Negro. Todas as peças da cidade (prédios, muralha, portões, torres, poço, feira, tochas...)
 * têm pintor próprio em `render/south/city/` (ADR 0043 a 0050); sobrou aqui só a escolha de cor do terreno base.
 */
/** Tons da areia e da rua de pedra; piso usa a mesma paleta da arte vertical. */
export function southCityGroundColors(ground:string):{lo:string;hi:string}{
  return ground==="path"
    ? {lo:C.stone[1],hi:C.stone[0]}
    : {lo:C.sand[2],hi:C.sand[0]};
}
