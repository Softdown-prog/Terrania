import type { RegionalCreatureKind } from "./catalog.ts";
import { coralCrabBehavior } from "./east/crabs/coral-crab.ts";
import { abyssalOctopusBehavior } from "./east/octopuses/abyssal-octopus.ts";
import { stormSerpentBehavior } from "./east/serpents/storm-serpent.ts";
import { tideHunterTritonBehavior } from "./east/tritons/tide-hunter-triton.ts";
import { frostBansheeBehavior } from "./north/banshees/frost-banshee.ts";
import { runicPolarBearBehavior } from "./north/bears/runic-polar-bear.ts";
import { tundraMammothBehavior } from "./north/mammoths/tundra-mammoth.ts";
import { frostSpiritBehavior } from "./north/spirits/frost-spirit.ts";
import { glacialWolfBehavior } from "./north/wolves/glacial-wolf.ts";
import { borealYetiBehavior } from "./north/yetis/boreal-yeti.ts";
import { sandBeetleBehavior } from "./south/beetles/sand-beetle.ts";
import { solarScarabBehavior } from "./south/beetles/solar-scarab.ts";
import { mirageImpBehavior } from "./south/demons/mirage-imp.ts";
import { oasisElfBehavior } from "./south/elves/oasis-elf.ts";
import { rottenMarshEntBehavior } from "./south/ents/rotten-marsh-ent.ts";
import { sandGoblinBehavior } from "./south/goblins/sand-goblin.ts";
import { mireHydraBehavior } from "./south/hydras/mire-hydra.ts";
import { desertOrcBehavior } from "./south/orcs/desert-orc.ts";
import { cactusSproutBehavior } from "./south/plants/cactus-sprout.ts";
import { duneRatBehavior } from "./south/rats/dune-rat.ts";
import { duneScorpionBehavior } from "./south/scorpions/dune-scorpion.ts";
import { duneScoutBehavior } from "./south/smallfolk/dune-scout.ts";
import { hornedViperBehavior } from "./south/snakes/horned-viper.ts";
import { poisonScoutToadBehavior } from "./south/toads/poison-scout-toad.ts";
import { clayTrollBehavior } from "./south/trolls/clay-troll.ts";
import { carrionVultureBehavior } from "./south/vultures/carrion-vulture.ts";
import { carrionSandwormBehavior } from "./south/worms/carrion-sandworm.ts";
import { cliffDraconidBehavior } from "./west/draconids/cliff-draconid.ts";
import { basaltGolemBehavior } from "./west/golems/basalt-golem.ts";
import { summitGriffinBehavior } from "./west/griffins/summit-griffin.ts";
import { magmaSalamanderBehavior } from "./west/salamanders/magma-salamander.ts";

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

/** Registro único de imports das estratégias que pertencem a cada arquivo de espécie. */
export const SPECIES_BEHAVIORS: Readonly<Record<RegionalCreatureKind, SpeciesBehavior>> = Object.freeze({
  "basalt-golem": basaltGolemBehavior,
  "cliff-draconid": cliffDraconidBehavior,
  "mire-hydra": mireHydraBehavior,
  "dune-scorpion": duneScorpionBehavior,
  "solar-scarab": solarScarabBehavior,
  "boreal-yeti": borealYetiBehavior,
  "glacial-wolf": glacialWolfBehavior,
  "frost-spirit": frostSpiritBehavior,
  "coral-crab": coralCrabBehavior,
  "storm-serpent": stormSerpentBehavior,
  "summit-griffin": summitGriffinBehavior,
  "magma-salamander": magmaSalamanderBehavior,
  "rotten-marsh-ent": rottenMarshEntBehavior,
  "poison-scout-toad": poisonScoutToadBehavior,
  "carrion-sandworm": carrionSandwormBehavior,
  "tundra-mammoth": tundraMammothBehavior,
  "frost-banshee": frostBansheeBehavior,
  "runic-polar-bear": runicPolarBearBehavior,
  "abyssal-octopus": abyssalOctopusBehavior,
  "tide-hunter-triton": tideHunterTritonBehavior,
  "dune-rat": duneRatBehavior,
  "sand-goblin": sandGoblinBehavior,
  "desert-orc": desertOrcBehavior,
  "clay-troll": clayTrollBehavior,
  "dune-scout": duneScoutBehavior,
  "oasis-elf": oasisElfBehavior,
  "mirage-imp": mirageImpBehavior,
  "horned-viper": hornedViperBehavior,
  "carrion-vulture": carrionVultureBehavior,
  "cactus-sprout": cactusSproutBehavior,
  "sand-beetle": sandBeetleBehavior,
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