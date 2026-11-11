import { CAVE_PALETTE, type CavePalette } from "../caveDetails.ts";
import type { CaveStyle } from "../../world/caveStyle/index.ts";
import type { CaveTheme } from "../../world/caves.ts";
import { luminousPalette } from "./luminous/palette.ts";

const LUMINOUS = (Object.keys(CAVE_PALETTE) as CaveTheme[]).reduce((out, theme) => {
  out[theme] = luminousPalette(theme);
  return out;
}, {} as Record<CaveTheme, CavePalette>);

/** A paleta do interior: a do tema de sempre, ou a da Gruta Luminosa (memorizada, uma por tema). */
export function cavePaletteFor(theme: CaveTheme, style: CaveStyle): CavePalette {
  return style === "luminous" ? LUMINOUS[theme] : CAVE_PALETTE[theme];
}
