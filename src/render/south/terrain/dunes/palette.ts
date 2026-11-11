type Stops = ReadonlyArray<readonly [number, readonly [number, number, number]]>;
/**
 * Rampa de cores do relevo das dunas, da sombra funda ao realce de sol (ADR 0033). Em torno do tom de areia
 * que o bioma já usava (`#cfac63` a `#eed28a`), só que com a sombra mais quente e o realce mais claro.
 */
const DUNE_STOPS: Stops = [
  [0, [0x96, 0x6c, 0x3c]],
  [0.28, [0xb8, 0x8e, 0x50]],
  [0.5, [0xd9, 0xb8, 0x70]],
  [0.74, [0xee, 0xd2, 0x8c]],
  [1, [0xfb, 0xea, 0xb8]],
];
/** Terra batida das planícies em ruínas (`#a99577` a `#c7b38b`): mais cinza e mais baixa que a duna. */
const HARDPAN_STOPS: Stops = [
  [0, [0x84, 0x72, 0x58]],
  [0.3, [0x9d, 0x89, 0x6b]],
  [0.5, [0xb6, 0xa2, 0x80]],
  [0.74, [0xcb, 0xb9, 0x95]],
  [1, [0xe0, 0xd2, 0xb0]],
];
export const RAMP_STEPS = 64;

/** Cor da rampa de duna para t de 0 a 1, em RGB (inteiros 0..255). */
export function sandColor(t: number, stops: Stops = DUNE_STOPS): [number, number, number] {
  const STOPS = stops;
  const x = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0.5));
  for (let i = 1; i < STOPS.length; i++) {
    const [t1, c1] = STOPS[i]!, [t0, c0] = STOPS[i - 1]!;
    if (x <= t1) {
      const k = (x - t0) / (t1 - t0);
      return [Math.round(c0[0] + (c1[0] - c0[0]) * k), Math.round(c0[1] + (c1[1] - c0[1]) * k), Math.round(c0[2] + (c1[2] - c0[2]) * k)];
    }
  }
  return [...STOPS[STOPS.length - 1]![1]] as [number, number, number];
}

const ramp = (stops: Stops): ReadonlyArray<readonly [number, number, number]> =>
  Array.from({ length: RAMP_STEPS }, (_, i) => sandColor(i / (RAMP_STEPS - 1), stops));

/** O visual de um relevo: a tabela de cores (pronta uma vez só) e quanto a luz marca a forma. */
export interface ReliefLook {
  readonly ramp: ReadonlyArray<readonly [number, number, number]>;
  /** Força do contraste entre o lado iluminado e o sombreado. */
  readonly contrast: number;
}
export const DUNES_LOOK: ReliefLook = { ramp: ramp(DUNE_STOPS), contrast: 0.95 };
export const HARDPAN_LOOK: ReliefLook = { ramp: ramp(HARDPAN_STOPS), contrast: 0.5 };
/** Compatibilidade: a rampa das dunas. */
export const SAND_RAMP = DUNES_LOOK.ramp;
