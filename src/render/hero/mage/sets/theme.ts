import type { ToneRamp } from "../../look.ts";

/** O enfeite que cada conjunto bordou nas peças (ADR 0080): a estrela do Aprendiz ou o redemoinho de vento da Brisa. Cada conjunto novo acrescenta o dele. */
export type MageMotif = "star" | "wind";

/**
 * As cores e o enfeite de um conjunto de roupas do Mago (ADR 0080). Os painters das peças (`hat.ts`, `robe.ts`, `cloak.ts`, `torso.ts`, `gear/*`) leem
 * esta ficha, em vez de cores fixas, e o conjunto do Aprendiz é a ficha de origem: sem ficha, as peças saem como sempre saíram.
 */
export interface MageSetTheme {
  readonly id: string;
  readonly tunic: ToneRamp;
  readonly cloak: ToneRamp;
  readonly hat: ToneRamp;
  /** Brilho de tecido do cone do chapéu. */
  readonly hatSheen: string;
  /** Forro à mostra na barra do manto e da túnica. */
  readonly lining: string;
  /** Debrum, fivelas e bordados (ouro no Aprendiz) e a sombra deles. */
  readonly trim: string;
  readonly trimD: string;
  /** A gema pequena do fecho, da fivela e dos bordados. */
  readonly gem: string;
  readonly cuff: string;
  readonly pants: string;
  readonly boots: string;
  readonly bootsLight: string;
  readonly motif: MageMotif;
  readonly book: { readonly cover: ToneRamp; readonly page: string; readonly ribbon: string };
  readonly ring: { readonly bezel: string; readonly band: ToneRamp; readonly shine: string; readonly gem: ToneRamp };
  readonly pendant: { readonly stone: ToneRamp };
}
