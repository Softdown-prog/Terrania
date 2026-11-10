import type { RegionalCreatureKind } from "../actors/CreatureCatalog.ts";
import { renderSandBeetle } from "./creatures/south/beetles/sandBeetle.ts";
import { renderBasaltGolemCreature } from "./creatures/west/golems/basaltGolem.ts";
import { renderCliffDraconidCreature } from "./creatures/west/draconids/cliffDraconid.ts";
import { renderMireHydraCreature } from "./creatures/south/hydras/mireHydra.ts";
import { renderDuneScorpionCreature } from "./creatures/south/scorpions/duneScorpion.ts";
import { renderSolarScarabCreature } from "./creatures/south/beetles/solarScarab.ts";
import { renderBorealYetiCreature } from "./creatures/north/yetis/borealYeti.ts";
import { renderGlacialWolfCreature } from "./creatures/north/wolves/glacialWolf.ts";
import { renderFrostSpiritCreature } from "./creatures/north/spirits/frostSpirit.ts";
import { renderCoralCrabCreature } from "./creatures/east/crabs/coralCrab.ts";
import { renderStormSerpentCreature } from "./creatures/east/serpents/stormSerpent.ts";
import { renderSummitGriffinCreature } from "./creatures/west/griffins/summitGriffin.ts";
import { renderMagmaSalamanderCreature } from "./creatures/west/salamanders/magmaSalamander.ts";
import { renderRottenMarshEntCreature } from "./creatures/south/ents/rottenMarshEnt.ts";
import { renderPoisonScoutToadCreature } from "./creatures/south/toads/poisonScoutToad.ts";
import { renderCarrionSandwormCreature } from "./creatures/south/worms/carrionSandworm.ts";
import { renderTundraMammothCreature } from "./creatures/north/mammoths/tundraMammoth.ts";
import { renderFrostBansheeCreature } from "./creatures/north/banshees/frostBanshee.ts";
import { renderRunicPolarBearCreature } from "./creatures/north/bears/runicPolarBear.ts";
import { renderAbyssalOctopusCreature } from "./creatures/east/octopuses/abyssalOctopus.ts";
import { renderTideHunterTritonCreature } from "./creatures/east/tritons/tideHunterTriton.ts";
import { renderDuneRatCreature } from "./creatures/south/rats/duneRat.ts";
import { renderSandGoblinCreature } from "./creatures/south/goblins/sandGoblin.ts";
import { renderDesertOrcCreature } from "./creatures/south/orcs/desertOrc.ts";
import { renderClayTrollCreature } from "./creatures/south/trolls/clayTroll.ts";
import { renderDuneScoutCreature } from "./creatures/south/smallfolk/duneScout.ts";
import { renderOasisElfCreature } from "./creatures/south/elves/oasisElf.ts";
import { renderMirageImpCreature } from "./creatures/south/demons/mirageImp.ts";
import { renderHornedViperCreature } from "./creatures/south/snakes/hornedViper.ts";
import { renderCarrionVultureCreature } from "./creatures/south/vultures/carrionVulture.ts";
import { renderCactusSproutCreature } from "./creatures/south/plants/cactusSprout.ts";
/** Dados visuais de leitura: renderização não aplica dano ou loot. */
export interface RegionalCreatureVisual {
 readonly kind:RegionalCreatureKind;
 readonly hp:number;
 readonly id?:string;
 readonly hurtTime?:number;
 readonly casting?:number;
 readonly motionPhase?:number;
 readonly moving?:number;
}
type CreatureRenderer=(ctx:CanvasRenderingContext2D,creature:RegionalCreatureVisual,
 sx:number,sy:number,time:number)=>void;
/** Delegação tipada; arte e paletas moram apenas na pasta da espécie. */
const CREATURE_RENDERERS:Readonly<Record<RegionalCreatureKind,CreatureRenderer>> = {
  "basalt-golem":renderBasaltGolemCreature,
  "cliff-draconid":renderCliffDraconidCreature,
  "mire-hydra":renderMireHydraCreature,
  "dune-scorpion":renderDuneScorpionCreature,
  "solar-scarab":renderSolarScarabCreature,
  "boreal-yeti":renderBorealYetiCreature,
  "glacial-wolf":renderGlacialWolfCreature,
  "frost-spirit":renderFrostSpiritCreature,
  "coral-crab":renderCoralCrabCreature,
  "storm-serpent":renderStormSerpentCreature,
  "summit-griffin":renderSummitGriffinCreature,
  "magma-salamander":renderMagmaSalamanderCreature,
  "rotten-marsh-ent":renderRottenMarshEntCreature,
  "poison-scout-toad":renderPoisonScoutToadCreature,
  "carrion-sandworm":renderCarrionSandwormCreature,
  "tundra-mammoth":renderTundraMammothCreature,
  "frost-banshee":renderFrostBansheeCreature,
  "runic-polar-bear":renderRunicPolarBearCreature,
  "abyssal-octopus":renderAbyssalOctopusCreature,
  "tide-hunter-triton":renderTideHunterTritonCreature,
  "dune-rat":renderDuneRatCreature,
  "sand-goblin":renderSandGoblinCreature,
  "desert-orc":renderDesertOrcCreature,
  "clay-troll":renderClayTrollCreature,
  "dune-scout":renderDuneScoutCreature,
  "oasis-elf":renderOasisElfCreature,
  "mirage-imp":renderMirageImpCreature,
  "horned-viper":renderHornedViperCreature,
  "carrion-vulture":renderCarrionVultureCreature,
  "cactus-sprout":renderCactusSproutCreature,
  "sand-beetle":renderSandBeetle,
};
export function renderRegionalCreature(ctx:CanvasRenderingContext2D,
 creature:RegionalCreatureVisual,sx:number,sy:number,time=0):void {
 CREATURE_RENDERERS[creature.kind](ctx,creature,sx,sy,time);
}
