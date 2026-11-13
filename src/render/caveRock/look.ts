import { mix, shade } from "../draw.ts";
import type { CavePalette } from "../caveDetails.ts";

/** Tabela de cores (pronta uma vez só) do chão e da parede de uma caverna, da sombra funda ao realce. */
export interface RockLook {
  readonly floor: ReadonlyArray<readonly [number, number, number]>;
  readonly wall: ReadonlyArray<readonly [number, number, number]>;
  readonly rim: readonly [number, number, number];
  readonly water: ReadonlyArray<readonly [number, number, number]>;
  readonly shore: readonly [number, number, number];
}
export const ROCK_RAMP_STEPS = 64;

export function rgbOf(hex: string): readonly [number, number, number] {
  const h = hex.charAt(0) === "#" ? hex.slice(1) : hex;
  return [parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0];
}

/** Rampa de três paradas (sombra, meio, luz) com `ROCK_RAMP_STEPS` passos. */
function ramp(dark: string, mid: string, light: string): ReadonlyArray<readonly [number, number, number]> {
  return Array.from({ length: ROCK_RAMP_STEPS }, (_, i) => {
    const t = i / (ROCK_RAMP_STEPS - 1);
    return rgbOf(t < 0.5 ? mix(dark, mid, t * 2) : mix(mid, light, (t - 0.5) * 2));
  });
}

/** O visual da rocha para a paleta do interior (a do tema ou a da Gruta Luminosa). */
export function rockLook(p: CavePalette): RockLook {
  return {
    floor: ramp(shade(p.ground, -0.3), mix(p.ground, p.light, 0.2), mix(p.light, "#fff6dc", 0.12)),
    wall: ramp(shade(p.wall, -0.38), p.wall, mix(p.wall, p.rim, 0.42)),
    rim: rgbOf(p.rim),
    water: ramp(shade(p.water, -0.32), p.water, mix(p.water, p.light, 0.4)),
    shore: rgbOf(mix(p.accent, p.light, 0.5)),
  };
}
