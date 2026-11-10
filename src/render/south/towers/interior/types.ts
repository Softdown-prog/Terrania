import type { TowerId } from "../../../../world/towers/types.ts";

/**
 * Como é o interior de uma torre (ADR 0021): cores do piso de laje e do tijolo, e a luz das janelas
 * e dos lampiões. Só dados; cada torre tem o seu arquivo nesta pasta e o `index.ts` só agrega.
 */
export interface TowerInteriorStyle {
  readonly id: TowerId;
  /** Laje do piso: tom médio, tom claro (reflexo) e rejunte. */
  readonly floor: { readonly base: string; readonly light: string; readonly grout: string };
  /** Tijolo das paredes, em rampa de três tons, mais a argamassa. */
  readonly brick: { readonly light: string; readonly base: string; readonly dark: string; readonly mortar: string };
  /** Luz que sai das frestas de janela e banha o piso. */
  readonly glow: string;
  /** Chama dos lampiões de parede. */
  readonly flame: string;
  /** Chance (0 a 1) de um trecho de parede ter lampião. */
  readonly sconces: number;
  /** Chance (0 a 1) de um trecho da parede do fundo ter fresta de janela. */
  readonly windows: number;
}
