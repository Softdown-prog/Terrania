import type { RegionalCreatureKind } from "./catalog.ts";

/** Identidade mecânica de cada espécie (fora do Slime).
 * Comportamentos são determinísticos, respeitam a colisão do motor e não alteram dano ou loot.
 */
export type Gait = "stomp" | "stride" | "lumber" | "gallop" | "scuttle" |
  "skitter" | "slither" | "crawl" | "hover" | "float" | "flap" | "hop" | "burrow";
export type Pursuit = "direct" | "rush" | "flank" | "cautious";
export interface SpeciesBehavior {
  readonly gait: Gait;
  readonly pursuit: Pursuit;
  readonly cadence: number;
  readonly weave: number;
  /** Vida relativa que dispara recuo; ausente = combate até a morte. */
  readonly retreatAt?: number;
}

export const SPECIES_BEHAVIORS: Readonly<Record<RegionalCreatureKind, SpeciesBehavior>> = Object.freeze({
  "basalt-golem": { gait: "stomp", pursuit: "direct", cadence: 0.8, weave: 0 },
  "cliff-draconid": { gait: "stride", pursuit: "rush", cadence: 1.22, weave: 0.08 },
  "mire-hydra": { gait: "slither", pursuit: "flank", cadence: 0.94, weave: 0.18 },
  "dune-scorpion": { gait: "scuttle", pursuit: "flank", cadence: 1.65, weave: 0.33 },
  "solar-scarab": { gait: "scuttle", pursuit: "rush", cadence: 1.8, weave: 0.24 },
  "boreal-yeti": { gait: "lumber", pursuit: "direct", cadence: 0.97, weave: 0.02 },
  "glacial-wolf": { gait: "gallop", pursuit: "rush", cadence: 1.92, weave: 0.12 },
  "frost-spirit": { gait: "hover", pursuit: "flank", cadence: 1.13, weave: 0.27 },
  "coral-crab": { gait: "scuttle", pursuit: "flank", cadence: 1.38, weave: 0.43 },
  "storm-serpent": { gait: "slither", pursuit: "flank", cadence: 1.12, weave: 0.26 },
  "summit-griffin": { gait: "flap", pursuit: "rush", cadence: 1.49, weave: 0.12 },
  "magma-salamander": { gait: "crawl", pursuit: "direct", cadence: 1.26, weave: 0.14 },
  "rotten-marsh-ent": { gait: "lumber", pursuit: "direct", cadence: 0.58, weave: 0 },
  "poison-scout-toad": { gait: "hop", pursuit: "cautious", cadence: 1.52, weave: 0.21, retreatAt: 0.25 },
  "carrion-sandworm": { gait: "burrow", pursuit: "rush", cadence: 1.02, weave: 0.15 },
  "tundra-mammoth": { gait: "stomp", pursuit: "direct", cadence: 0.75, weave: 0.01 },
  "frost-banshee": { gait: "hover", pursuit: "cautious", cadence: 1.17, weave: 0.35 },
  "runic-polar-bear": { gait: "gallop", pursuit: "rush", cadence: 1.33, weave: 0.06 },
  "abyssal-octopus": { gait: "float", pursuit: "flank", cadence: 1.47, weave: 0.39 },
  "tide-hunter-triton": { gait: "stride", pursuit: "cautious", cadence: 1.08, weave: 0.11 },
  "dune-rat": { gait: "skitter", pursuit: "cautious", cadence: 2.16, weave: 0.35, retreatAt: 0.5 },
  "sand-goblin": { gait: "skitter", pursuit: "flank", cadence: 1.57, weave: 0.23, retreatAt: 0.25 },
  "desert-orc": { gait: "stride", pursuit: "rush", cadence: 1.01, weave: 0.09 },
  "clay-troll": { gait: "lumber", pursuit: "direct", cadence: 0.68, weave: 0.07 },
  "dune-scout": { gait: "stride", pursuit: "cautious", cadence: 1.73, weave: 0.2, retreatAt: 0.45 },
  "oasis-elf": { gait: "stride", pursuit: "flank", cadence: 1.43, weave: 0.18 },
  "mirage-imp": { gait: "float", pursuit: "flank", cadence: 1.85, weave: 0.3 },
  "horned-viper": { gait: "slither", pursuit: "flank", cadence: 1.76, weave: 0.31 },
  "carrion-vulture": { gait: "hop", pursuit: "cautious", cadence: 1.15, weave: 0.09, retreatAt: 0.25 },
  "cactus-sprout": { gait: "hop", pursuit: "direct", cadence: 0.84, weave: 0.07 },
  "sand-beetle": { gait: "scuttle", pursuit: "cautious", cadence: 1.98, weave: 0.3 },
});

/** A direção e o ritmo mudam conforme a espécie, sem contornar colisões. */
export function pursuitStep(kind: RegionalCreatureKind, elapsed: number,
  dx: number, dy: number, distance: number): { x: number; y: number; pace: number } {
  const spec=SPECIES_BEHAVIORS[kind];
  const length=Math.hypot(dx,dy);
  if(!Number.isFinite(elapsed)||!Number.isFinite(length)||length<.001)
    return {x:0,y:0,pace:0};
  const wave=Math.sin(elapsed*spec.cadence*Math.PI*2);
  const gaitPace:Record<Gait,number>={
    stomp:.78+.22*Math.max(0,wave), stride:.94+.10*Math.abs(wave),
    lumber:.86+.14*Math.abs(wave), gallop:.81+.28*Math.max(0,wave),
    scuttle:.88+.17*Math.abs(wave), skitter:.76+.30*Math.max(0,wave),
    slither:.94+.09*wave, crawl:.90+.12*Math.abs(wave),
    hover:1,float:1,flap:.84+.22*Math.max(0,wave),
    hop:.65+.45*Math.max(0,wave),burrow:.80+.30*Math.max(0,wave)
  };
  const pursuitPace=spec.pursuit==="rush"?1.08:
    spec.pursuit==="cautious"&&distance>110?.83:1;
  const weave=spec.weave*Math.sin(elapsed*spec.cadence*Math.PI*(spec.pursuit==="flank"?1.4:1));
  const x=dx/length-dy/length*weave,y=dy/length+dx/length*weave;
  const norm=Math.hypot(x,y);
  return {x:x/norm,y:y/norm,pace:gaitPace[spec.gait]*pursuitPace};
}

/** Recuo por espécie, determinístico e independente de animação/DOM. */
export function speciesRetreats(kind: RegionalCreatureKind, hp: number, maxHp: number): boolean {
  const threshold = SPECIES_BEHAVIORS[kind].retreatAt;
  return threshold !== undefined && Number.isFinite(hp) && Number.isFinite(maxHp) &&
    maxHp > 0 && hp > 0 && hp / maxHp <= threshold;
}