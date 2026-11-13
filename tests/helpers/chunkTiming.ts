/**
 * Medição de tempo de chunk para o teste de navegador (ADR 0046 e 0054). Sem DOM, sem relógio próprio: recebe o desenho e o
 * relógio, então roda igual no navegador (dentro do pacote do teste) e em Node (nos testes da própria medição).
 */

/** Um lugar do mundo cujo chunk é cronometrado. */
export interface TimingSpot { readonly name: string; readonly cx: number; readonly cy: number }

/** Limites do orçamento de tempo (ADR 0054): o teto absoluto e as razões contra o chunk de dunas medido na mesma hora. */
export const CHUNK_TIME_LIMITS = { absoluteMs: 120, city: 4.5, lake: 2, forest: 2 } as const;

/** Quantas rodadas intercaladas se medem por lugar. */
export const TIMING_ROUNDS = 15;

/** Quartil inferior (25%) de uma lista de tempos: carga na máquina só soma tempo, então o lado baixo é o custo de verdade. */
export function lowerQuartile(values: readonly number[]): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 4)]!;
}

/**
 * Tempo por lugar (ms): aquece cada lugar duas vezes e depois mede `rounds` rodadas **intercaladas**, em que todos os lugares são
 * cronometrados um depois do outro (com a ordem girando a cada rodada para nenhum ficar sempre primeiro). Assim a carga da
 * máquina atinge todos os lugares ao mesmo tempo, em vez de cair só sobre o que foi medido naquele momento. De cada lugar fica o
 * quartil inferior das rodadas.
 */
export function measureChunkTimes(spots: readonly TimingSpot[], rounds: number, seed: number,
  draw: (cx: number, cy: number, seed: number) => void, now: () => number): Record<string, number> {
  for (const spot of spots) { draw(spot.cx, spot.cy, seed); draw(spot.cx, spot.cy, seed + 99); }
  const samples = new Map<string, number[]>(spots.map(s => [s.name, []]));
  for (let round = 0; round < rounds; round++) {
    for (let i = 0; i < spots.length; i++) {
      const spot = spots[(i + round) % spots.length]!;
      const start = now();
      draw(spot.cx, spot.cy, seed + round + 1);
      samples.get(spot.name)!.push(now() - start);
    }
  }
  return Object.fromEntries(spots.map(s => [s.name, lowerQuartile(samples.get(s.name)!)]));
}
