import { renderBasaltGolemCreature } from "../../src/render/creatures/west/golems/basaltGolem.ts";
import { renderCliffDraconidCreature } from "../../src/render/creatures/west/draconids/cliffDraconid.ts";
import { renderMireHydraCreature } from "../../src/render/creatures/south/hydras/mireHydra.ts";
import { renderDuneScorpionCreature } from "../../src/render/creatures/south/scorpions/duneScorpion.ts";
import { renderSolarScarabCreature } from "../../src/render/creatures/south/beetles/solarScarab.ts";
import { renderBorealYetiCreature } from "../../src/render/creatures/north/yetis/borealYeti.ts";
import { renderGlacialWolfCreature } from "../../src/render/creatures/north/wolves/glacialWolf.ts";
import { renderFrostSpiritCreature } from "../../src/render/creatures/north/spirits/frostSpirit.ts";
import { renderCoralCrabCreature } from "../../src/render/creatures/east/crabs/coralCrab.ts";
import { renderStormSerpentCreature } from "../../src/render/creatures/east/serpents/stormSerpent.ts";
import { renderSummitGriffinCreature } from "../../src/render/creatures/west/griffins/summitGriffin.ts";
import { renderMagmaSalamanderCreature } from "../../src/render/creatures/west/salamanders/magmaSalamander.ts";
import { renderRottenMarshEntCreature } from "../../src/render/creatures/south/ents/rottenMarshEnt.ts";
import { renderPoisonScoutToadCreature } from "../../src/render/creatures/south/toads/poisonScoutToad.ts";
import { renderCarrionSandwormCreature } from "../../src/render/creatures/south/worms/carrionSandworm.ts";
import { renderTundraMammothCreature } from "../../src/render/creatures/north/mammoths/tundraMammoth.ts";
import { renderFrostBansheeCreature } from "../../src/render/creatures/north/banshees/frostBanshee.ts";
import { renderRunicPolarBearCreature } from "../../src/render/creatures/north/bears/runicPolarBear.ts";
import { renderAbyssalOctopusCreature } from "../../src/render/creatures/east/octopuses/abyssalOctopus.ts";
import { renderTideHunterTritonCreature } from "../../src/render/creatures/east/tritons/tideHunterTriton.ts";
import { renderDuneRatCreature } from "../../src/render/creatures/south/rats/duneRat.ts";
import { renderSandGoblinCreature } from "../../src/render/creatures/south/goblins/sandGoblin.ts";
import { renderDesertOrcCreature } from "../../src/render/creatures/south/orcs/desertOrc.ts";
import { renderClayTrollCreature } from "../../src/render/creatures/south/trolls/clayTroll.ts";
import { renderDuneScoutCreature } from "../../src/render/creatures/south/smallfolk/duneScout.ts";
import { renderOasisElfCreature } from "../../src/render/creatures/south/elves/oasisElf.ts";
import { renderMirageImpCreature } from "../../src/render/creatures/south/demons/mirageImp.ts";
import { renderHornedViperCreature } from "../../src/render/creatures/south/snakes/hornedViper.ts";
import { renderCarrionVultureCreature } from "../../src/render/creatures/south/vultures/carrionVulture.ts";
import { renderCactusSproutCreature } from "../../src/render/creatures/south/plants/cactusSprout.ts";
import { renderRegionalFrame } from "../../src/render/creatures/shared/regionalFrame.ts";
import { renderWave2Frame } from "../../src/render/creatures/shared/wave2Frame.ts";
import { renderWave3Frame } from "../../src/render/creatures/shared/wave3Frame.ts";
import { drawWolf } from "../../src/render/creatures/north/wolves/glacialWolf.ts";
import { griffin } from "../../src/render/creatures/west/griffins/summitGriffin.ts";
import { rat } from "../../src/render/creatures/south/rats/duneRat.ts";
import { renderDuneRatDetail } from "../../src/render/creatures/south/rats/duneRat.ts";
import { renderSandGoblinDetail } from "../../src/render/creatures/south/goblins/sandGoblin.ts";
import { renderDesertOrcDetail } from "../../src/render/creatures/south/orcs/desertOrc.ts";
import { renderSandBasiliskDetail } from "../../src/render/creatures/mounts/sandBasilisk.ts";
import { renderCargoBeetleDetail } from "../../src/render/creatures/mounts/cargoBeetle.ts";
import { renderSandBeetle } from "../../src/render/creatures/south/beetles/sandBeetle.ts";
import { drawKnightSword } from "../../src/render/swords.ts";
import { WEAPON_IDS } from "../../src/engine/character/Weapons.ts";
import { renderWave3Creature } from "../../src/render/regionalWave3.ts";
import { renderWave2Creature } from "../../src/render/regionalWave2.ts";
/**
 * Registro das peças de arte procedural auditadas por tests/art-contract.test.ts.
 * Todo desenhador novo (`render*` ou `draw*` exportado em src/render) DEVE entrar aqui, com sua categoria.
 * Os pisos abaixo são ~80 % do pior caso das peças boas que já existem: mínimo de acabamento, não meta.
 */
import { renderRegionalCreature } from "../../src/render/regionalCreatures.ts";
import { renderMount, renderMountTracks, renderStableFence } from "../../src/render/mounts.ts";
import { MOUNTS, MOUNT_IDS } from "../../src/actors/MountCatalog.ts";
import { REGIONAL_CREATURE_KINDS, SECOND_WAVE_KINDS, SOUTH_COMMON_KINDS, CREATURE_CATALOG } from "../../src/actors/CreatureCatalog.ts";
import { renderHero, renderSlime } from "../../src/render/actors.ts";
import { renderNpc } from "../../src/render/npcs.ts";
import { clearSceneryCache, renderScenery } from "../../src/render/scenery.ts";
import { renderBarrelReference } from "../../src/render/reference/barrelReference.ts";
import { paintRegionalLandmark } from "../../src/render/regionalLandmarkArt.ts";
import { paintSouthRuin } from "../../src/render/southRuinsArt.ts";
import { TOWER_PAINTERS } from "../../src/render/south/towers/index.ts";
import { TOWERS } from "../../src/world/towers/index.ts";
import { renderCoinDrop } from "../../src/render/coinDrop.ts";
import { COIN_TIERS } from "../../src/engine/character/coins/index.ts";
import { TOWER_INTERIOR_STYLES } from "../../src/render/south/towers/interior/index.ts";
import { drawTowerSconce } from "../../src/render/south/towers/interior/sconce.ts";
import { drawTowerWallFace } from "../../src/render/south/towers/interior/wallFace.ts";
import { drawTowerWindow } from "../../src/render/south/towers/interior/window.ts";
import { RUIN_NAMES, type RuinVariant } from "../../src/world/southRuins.ts";
import { paintSouthCity } from "../../src/render/southCityArt.ts";
import type { SouthCityPropKind } from "../../src/world/southCity.ts";
import { drawCaveEntrance } from "../../src/render/cave.ts";
import { drawCaveExitStair, drawCaveFormation, drawCaveWallFace } from "../../src/render/caveDetails.ts";
import { drawCaveDownStair } from "../../src/render/caveStairsDownArt.ts";
import type { CaveTheme, CaveEntranceKind, CaveEntrance } from "../../src/world/caves.ts";
import type { RegionalLandmarkKind } from "../../src/world/regionalLandmarks.ts";
import { NPCS } from "../../src/world/npcs.ts";

export type Tier = "character" | "creature" | "prop" | "structure";
export interface Floors { paintOps: number; colors: number; gradients: number; strokes: number; curves: number }
export interface ArtAsset { id: string; tier: Tier; fn: string; draw(ctx: CanvasRenderingContext2D): void }

/** Mínimos por categoria. Subir um piso exige que todas as peças existentes continuem passando. */
export const FLOORS: Record<Tier, Floors> = {
  character: { paintOps: 25, colors: 20, gradients: 2, strokes: 4, curves: 20 },
  creature: { paintOps: 14, colors: 8, gradients: 1, strokes: 2, curves: 30 },
  prop: { paintOps: 11, colors: 10, gradients: 1, strokes: 2, curves: 3 },
  structure: { paintOps: 28, colors: 15, gradients: 1, strokes: 0, curves: 6 },
};
/** Regras de contraste para toda peça: precisa ter um tom bem escuro (contorno/sombra) e um claro (brilho). */
export const DARKEST_MAX = 0.2;
export const LIGHTEST_MIN = 0.85;

const hero = { faceX: 0, faceY: 1, walkTime: 0.3, attackTime: 0 };
const kit = { head: "trail-helm", shield: "willow-shield", chest: "quilted-vest", feet: "trail-boots",
  legs: "travel-trousers", backpack: "canvas-pack", neck: "river-pendant" } as const;

export const ASSETS: ArtAsset[] = [
  { id: "hero", tier: "character", fn: "renderHero", draw: c => renderHero(c, hero, 0, 0, 1) },
  { id: "hero com conjunto", tier: "character", fn: "renderHero", draw: c => renderHero(c, { ...hero, gear: kit }, 0, 0, 1) },
  ...WEAPON_IDS.map<ArtAsset>(kind => ({
    id:"Espada procedural "+kind,tier:"prop",fn:"drawKnightSword",
    draw:c=>drawKnightSword(c,kind,1)
  })),
  { id: "slime", tier: "creature", fn: "renderSlime", draw: c => renderSlime(c, { hp: 3, bounce: 0.2, id: "s1" }, 0, 0, {}) },
  { id: "Besouro da Areia 9x10", tier: "creature", fn: "renderSandBeetle",
    draw: c => renderSandBeetle(c, { hp: 40 }, 0, 0, 1) },
  ...MOUNT_IDS.map<ArtAsset>(id => ({
    id:"montaria "+id,tier:"creature",fn:"renderMount",
    draw:c=>renderMount(c,id,0,0,1),
  })),
  {id:"acabamento do Rato das Dunas",tier:"creature",fn:"renderDuneRatDetail",
    draw:c=>renderDuneRatDetail(c,{kind:"dune-rat",hp:35,id:"rat-special",moving:.8,motionPhase:3,casting:.5},2)},
  {id:"acabamento do Goblin Saqueador",tier:"creature",fn:"renderSandGoblinDetail",
    draw:c=>renderSandGoblinDetail(c,{kind:"sand-goblin",hp:47,id:"goblin-special",moving:1,motionPhase:3,casting:.4},2)},
  {id:"acabamento do Orc Nômade",tier:"creature",fn:"renderDesertOrcDetail",
    draw:c=>renderDesertOrcDetail(c,{kind:"desert-orc",hp:60,id:"orc-special",moving:1,motionPhase:3,casting:.8},2)},
  {id:"acabamento do Lagarto das Areias",tier:"creature",fn:"renderSandBasiliskDetail",
    draw:c=>renderSandBasiliskDetail(c,2)},
  {id:"acabamento do Escaravelho de Carga",tier:"creature",fn:"renderCargoBeetleDetail",
    draw:c=>renderCargoBeetleDetail(c,2)},
  {id:"cercado de estábulo",tier:"structure",fn:"renderStableFence",
    draw:c=>renderStableFence(c,0,0,true)},
  {id:"pegadas do Garrano",tier:"prop",fn:"renderMountTracks",
    draw:c=>renderMountTracks(c,0,0)},
  ...REGIONAL_CREATURE_KINDS.map<ArtAsset>(kind => ({id:"monstro "+kind,tier:"creature",fn:"renderRegionalCreature",
    draw:c=>renderRegionalCreature(c,{kind,hp:CREATURE_CATALOG[kind].maxHp,id:"art-"+kind},0,0,1)})),
  {id:"render individual basalt-golem",tier:"creature",fn:"renderBasaltGolemCreature",
    draw:c=>renderBasaltGolemCreature(c,{kind:"basalt-golem",hp:CREATURE_CATALOG["basalt-golem"].maxHp,id:"art-individual-basalt-golem"},0,0,1)},
  {id:"render individual cliff-draconid",tier:"creature",fn:"renderCliffDraconidCreature",
    draw:c=>renderCliffDraconidCreature(c,{kind:"cliff-draconid",hp:CREATURE_CATALOG["cliff-draconid"].maxHp,id:"art-individual-cliff-draconid"},0,0,1)},
  {id:"render individual mire-hydra",tier:"creature",fn:"renderMireHydraCreature",
    draw:c=>renderMireHydraCreature(c,{kind:"mire-hydra",hp:CREATURE_CATALOG["mire-hydra"].maxHp,id:"art-individual-mire-hydra"},0,0,1)},
  {id:"render individual dune-scorpion",tier:"creature",fn:"renderDuneScorpionCreature",
    draw:c=>renderDuneScorpionCreature(c,{kind:"dune-scorpion",hp:CREATURE_CATALOG["dune-scorpion"].maxHp,id:"art-individual-dune-scorpion"},0,0,1)},
  {id:"render individual solar-scarab",tier:"creature",fn:"renderSolarScarabCreature",
    draw:c=>renderSolarScarabCreature(c,{kind:"solar-scarab",hp:CREATURE_CATALOG["solar-scarab"].maxHp,id:"art-individual-solar-scarab"},0,0,1)},
  {id:"render individual boreal-yeti",tier:"creature",fn:"renderBorealYetiCreature",
    draw:c=>renderBorealYetiCreature(c,{kind:"boreal-yeti",hp:CREATURE_CATALOG["boreal-yeti"].maxHp,id:"art-individual-boreal-yeti"},0,0,1)},
  {id:"render individual glacial-wolf",tier:"creature",fn:"renderGlacialWolfCreature",
    draw:c=>renderGlacialWolfCreature(c,{kind:"glacial-wolf",hp:CREATURE_CATALOG["glacial-wolf"].maxHp,id:"art-individual-glacial-wolf"},0,0,1)},
  {id:"render individual frost-spirit",tier:"creature",fn:"renderFrostSpiritCreature",
    draw:c=>renderFrostSpiritCreature(c,{kind:"frost-spirit",hp:CREATURE_CATALOG["frost-spirit"].maxHp,id:"art-individual-frost-spirit"},0,0,1)},
  {id:"render individual coral-crab",tier:"creature",fn:"renderCoralCrabCreature",
    draw:c=>renderCoralCrabCreature(c,{kind:"coral-crab",hp:CREATURE_CATALOG["coral-crab"].maxHp,id:"art-individual-coral-crab"},0,0,1)},
  {id:"render individual storm-serpent",tier:"creature",fn:"renderStormSerpentCreature",
    draw:c=>renderStormSerpentCreature(c,{kind:"storm-serpent",hp:CREATURE_CATALOG["storm-serpent"].maxHp,id:"art-individual-storm-serpent"},0,0,1)},
  {id:"render individual summit-griffin",tier:"creature",fn:"renderSummitGriffinCreature",
    draw:c=>renderSummitGriffinCreature(c,{kind:"summit-griffin",hp:CREATURE_CATALOG["summit-griffin"].maxHp,id:"art-individual-summit-griffin"},0,0,1)},
  {id:"render individual magma-salamander",tier:"creature",fn:"renderMagmaSalamanderCreature",
    draw:c=>renderMagmaSalamanderCreature(c,{kind:"magma-salamander",hp:CREATURE_CATALOG["magma-salamander"].maxHp,id:"art-individual-magma-salamander"},0,0,1)},
  {id:"render individual rotten-marsh-ent",tier:"creature",fn:"renderRottenMarshEntCreature",
    draw:c=>renderRottenMarshEntCreature(c,{kind:"rotten-marsh-ent",hp:CREATURE_CATALOG["rotten-marsh-ent"].maxHp,id:"art-individual-rotten-marsh-ent"},0,0,1)},
  {id:"render individual poison-scout-toad",tier:"creature",fn:"renderPoisonScoutToadCreature",
    draw:c=>renderPoisonScoutToadCreature(c,{kind:"poison-scout-toad",hp:CREATURE_CATALOG["poison-scout-toad"].maxHp,id:"art-individual-poison-scout-toad"},0,0,1)},
  {id:"render individual carrion-sandworm",tier:"creature",fn:"renderCarrionSandwormCreature",
    draw:c=>renderCarrionSandwormCreature(c,{kind:"carrion-sandworm",hp:CREATURE_CATALOG["carrion-sandworm"].maxHp,id:"art-individual-carrion-sandworm"},0,0,1)},
  {id:"render individual tundra-mammoth",tier:"creature",fn:"renderTundraMammothCreature",
    draw:c=>renderTundraMammothCreature(c,{kind:"tundra-mammoth",hp:CREATURE_CATALOG["tundra-mammoth"].maxHp,id:"art-individual-tundra-mammoth"},0,0,1)},
  {id:"render individual frost-banshee",tier:"creature",fn:"renderFrostBansheeCreature",
    draw:c=>renderFrostBansheeCreature(c,{kind:"frost-banshee",hp:CREATURE_CATALOG["frost-banshee"].maxHp,id:"art-individual-frost-banshee"},0,0,1)},
  {id:"render individual runic-polar-bear",tier:"creature",fn:"renderRunicPolarBearCreature",
    draw:c=>renderRunicPolarBearCreature(c,{kind:"runic-polar-bear",hp:CREATURE_CATALOG["runic-polar-bear"].maxHp,id:"art-individual-runic-polar-bear"},0,0,1)},
  {id:"render individual abyssal-octopus",tier:"creature",fn:"renderAbyssalOctopusCreature",
    draw:c=>renderAbyssalOctopusCreature(c,{kind:"abyssal-octopus",hp:CREATURE_CATALOG["abyssal-octopus"].maxHp,id:"art-individual-abyssal-octopus"},0,0,1)},
  {id:"render individual tide-hunter-triton",tier:"creature",fn:"renderTideHunterTritonCreature",
    draw:c=>renderTideHunterTritonCreature(c,{kind:"tide-hunter-triton",hp:CREATURE_CATALOG["tide-hunter-triton"].maxHp,id:"art-individual-tide-hunter-triton"},0,0,1)},
  {id:"render individual dune-rat",tier:"creature",fn:"renderDuneRatCreature",
    draw:c=>renderDuneRatCreature(c,{kind:"dune-rat",hp:CREATURE_CATALOG["dune-rat"].maxHp,id:"art-individual-dune-rat"},0,0,1)},
  {id:"render individual sand-goblin",tier:"creature",fn:"renderSandGoblinCreature",
    draw:c=>renderSandGoblinCreature(c,{kind:"sand-goblin",hp:CREATURE_CATALOG["sand-goblin"].maxHp,id:"art-individual-sand-goblin"},0,0,1)},
  {id:"render individual desert-orc",tier:"creature",fn:"renderDesertOrcCreature",
    draw:c=>renderDesertOrcCreature(c,{kind:"desert-orc",hp:CREATURE_CATALOG["desert-orc"].maxHp,id:"art-individual-desert-orc"},0,0,1)},
  {id:"render individual clay-troll",tier:"creature",fn:"renderClayTrollCreature",
    draw:c=>renderClayTrollCreature(c,{kind:"clay-troll",hp:CREATURE_CATALOG["clay-troll"].maxHp,id:"art-individual-clay-troll"},0,0,1)},
  {id:"render individual dune-scout",tier:"creature",fn:"renderDuneScoutCreature",
    draw:c=>renderDuneScoutCreature(c,{kind:"dune-scout",hp:CREATURE_CATALOG["dune-scout"].maxHp,id:"art-individual-dune-scout"},0,0,1)},
  {id:"render individual oasis-elf",tier:"creature",fn:"renderOasisElfCreature",
    draw:c=>renderOasisElfCreature(c,{kind:"oasis-elf",hp:CREATURE_CATALOG["oasis-elf"].maxHp,id:"art-individual-oasis-elf"},0,0,1)},
  {id:"render individual mirage-imp",tier:"creature",fn:"renderMirageImpCreature",
    draw:c=>renderMirageImpCreature(c,{kind:"mirage-imp",hp:CREATURE_CATALOG["mirage-imp"].maxHp,id:"art-individual-mirage-imp"},0,0,1)},
  {id:"render individual horned-viper",tier:"creature",fn:"renderHornedViperCreature",
    draw:c=>renderHornedViperCreature(c,{kind:"horned-viper",hp:CREATURE_CATALOG["horned-viper"].maxHp,id:"art-individual-horned-viper"},0,0,1)},
  {id:"render individual carrion-vulture",tier:"creature",fn:"renderCarrionVultureCreature",
    draw:c=>renderCarrionVultureCreature(c,{kind:"carrion-vulture",hp:CREATURE_CATALOG["carrion-vulture"].maxHp,id:"art-individual-carrion-vulture"},0,0,1)},
  {id:"render individual cactus-sprout",tier:"creature",fn:"renderCactusSproutCreature",
    draw:c=>renderCactusSproutCreature(c,{kind:"cactus-sprout",hp:CREATURE_CATALOG["cactus-sprout"].maxHp,id:"art-individual-cactus-sprout"},0,0,1)},
  {id:"frame de composição regional",tier:"creature",fn:"renderRegionalFrame",
    draw:c=>renderRegionalFrame(c,{kind:"glacial-wolf",hp:CREATURE_CATALOG["glacial-wolf"].maxHp},0,0,1,
      {base:"#368cc4",light:"#a0f0fd",dark:"#24436e",accent:"#5bccf9",eye:"#e9fcfc"},drawWolf)},
  {id:"frame de composição segunda leva",tier:"creature",fn:"renderWave2Frame",
    draw:c=>renderWave2Frame(c,{kind:"summit-griffin",hp:CREATURE_CATALOG["summit-griffin"].maxHp},0,0,1,
      {base:"#88909e",dark:"#414957",light:"#d2d6d6",accent:"#d5a24c",eyes:"#ffc866"},griffin)},
  {id:"frame de composição fauna comum",tier:"creature",fn:"renderWave3Frame",
    draw:c=>renderWave3Frame(c,{kind:"dune-rat",hp:CREATURE_CATALOG["dune-rat"].maxHp},0,0,1,
      {base:"#98836b",light:"#ded3ae",dark:"#574c43",accent:"#b87871",eye:"#dfb55c",extra:"#c5aa93"},rat)},
  ...SECOND_WAVE_KINDS.map<ArtAsset>(kind => ({
    id:"nova espécie "+kind,tier:"creature",fn:"renderWave2Creature",
    draw:c=>renderWave2Creature(c,{kind,hp:CREATURE_CATALOG[kind].maxHp,id:"wave2-"+kind},0,0,1)
  })),
  ...SOUTH_COMMON_KINDS.map<ArtAsset>(kind=>({
    id:"sul comum "+kind,tier:"creature",fn:"renderWave3Creature",
    draw:c=>renderWave3Creature(c,{kind,hp:CREATURE_CATALOG[kind].maxHp,id:"wave3-"+kind},0,0,1)
  })),
  ...NPCS.filter(n => n.kind !== "sign" && n.kind !== "door").map<ArtAsset>(npc =>
    ({ id: "npc " + npc.id, tier: "character", fn: "renderNpc", draw: c => renderNpc(c, npc, 0, 0, false, 1) })),
  ...(["tree", "fire", "house", "arch"] as const).map<ArtAsset>(kind => ({ id: "cenário " + kind, tier: "structure",
    fn: "renderScenery", draw: c => { clearSceneryCache(); renderScenery(c, { kind, x: 64, y: 64, variant: 1 }, 0, 0, 1); } })),
  ...(["rock", "sign"] as const).map<ArtAsset>(kind => ({ id: "cenário " + kind, tier: "prop",
    fn: "renderScenery", draw: c => { clearSceneryCache(); renderScenery(c, { kind, x: 64, y: 64, variant: 1 }, 0, 0, 1); } })),
  ...(["ice-spire", "desert-obelisk", "coast-beacon", "mountain-monolith"] as const satisfies readonly RegionalLandmarkKind[])
    .map<ArtAsset>(kind => ({ id: "marco " + kind, tier: "structure", fn: "paintRegionalLandmark",
      draw: c => paintRegionalLandmark(c, kind, 0) })),
  ...([0, 1, 2, 3] as const satisfies readonly RuinVariant[]).map<ArtAsset>(variant => ({
    id: "ruína " + RUIN_NAMES[variant], tier: "structure", fn: "paintSouthRuin",
    draw: c => paintSouthRuin(c, variant, "all") })),
  { id: "Poço Negro: portão, muralha, torre e poço", tier: "structure",
    fn: "paintSouthCity", draw: c => {
      const kinds:readonly SouthCityPropKind[]=["well","gate","tower","wall","torch","building","tent"];
      kinds.forEach((kind,i) => paintSouthCity(c,{kind,x:i*80,y:0,variant:i%3},1));
    } },
  // Uma peça por torre, cada uma com o nome do seu próprio pintor (um arquivo por torre em render/south/towers/).
  ...TOWERS.map<ArtAsset>(tower => ({ id: "torre " + tower.name, tier: "structure",
    fn: ({ "vigia-caida": "paintTorreDoVigiaCaida", miragem: "paintTorreDaMiragem", "sol-negro": "paintTorreDoSolNegro" } as const)[tower.id],
    draw: c => TOWER_PAINTERS[tower.id](c) })),
  // Interior das torres (ADR 0021): três peças físicas por torre, cada torre com o seu estilo em render/south/towers/interior/.
  ...TOWERS.flatMap<ArtAsset>(tower => {
    const style = TOWER_INTERIOR_STYLES[tower.id];
    return [
      ...(["south", "east"] as const).map<ArtAsset>(side => ({ id: `face de tijolo ${tower.name} ${side}`,
        tier: "prop", fn: "drawTowerWallFace", draw: c => drawTowerWallFace(c, style, 0, 0, side, .61) })),
      { id: `fresta de janela ${tower.name}`, tier: "prop", fn: "drawTowerWindow",
        draw: c => drawTowerWindow(c, style, 0, 0, .61) },
      { id: `lampião de parede ${tower.name}`, tier: "prop", fn: "drawTowerSconce",
        draw: c => drawTowerSconce(c, style, 0, 0, .61) },
    ];
  }),
  // Moedas no chão (ADR 0024): uma peça por moeda, com a marca de cada uma.
  ...COIN_TIERS.map<ArtAsset>(coin => ({ id: "moedas no chão " + coin.name, tier: "prop", fn: "renderCoinDrop",
    draw: c => renderCoinDrop(c, coin.id, 0, 0, .6) })),
  { id: "barril de referência", tier: "prop", fn: "renderBarrelReference", draw: c => renderBarrelReference(c, 0, 0, "b1") },
  ...(["verdant", "glacial", "desert", "coastal", "basalt", "marsh"] as const)
    .flatMap<ArtAsset>(theme => [
      { id: "formação subterrânea " + theme, tier: "prop", fn: "drawCaveFormation",
        draw: c => drawCaveFormation(c, theme, 0, 0, .61) },
      { id: "escada subterrânea " + theme, tier: "prop", fn: "drawCaveExitStair",
        draw: c => drawCaveExitStair(c, theme, 0, 0) },
      { id: "escada de descida " + theme, tier: "prop", fn: "drawCaveDownStair",
        draw: c => drawCaveDownStair(c, theme, 0, 0) },
      ...(["south", "east"] as const).map<ArtAsset>(side => ({
        id: "face rochosa " + theme + " " + side,
        tier: "prop", fn: "drawCaveWallFace",
        draw: c => drawCaveWallFace(c, theme, 0, 0, side, .61),
      })),
    ]),
  ...([
    ["verdant","hole"],["glacial","hole"],["desert","stairs"],
    ["coastal","stairs"],["basalt","ladder"],["marsh","ladder"],
  ] as const satisfies readonly (readonly [CaveTheme,CaveEntranceKind])[])
    .map<ArtAsset>(([theme,kind],i) => {
      const entry:CaveEntrance={id:"cave-test:"+theme,tileX:22+i,tileY:11,
        x:0,y:0,name:"Entrada "+theme,theme,kind,seed:842136};
      return {id:"entrada de caverna "+theme+" ("+kind+")",
        tier:"prop",fn:"drawCaveEntrance",
        draw:c=>drawCaveEntrance(c,entry,0,0,1)};
    }),
];

/** Funções `render*`/`draw*` que NÃO são peças: compõem cenas inteiras. Cada exceção precisa de motivo. */
export const NOT_AN_ASSET: Record<string, string> = {
  ellipse: "primitiva compartilhada de draw.ts, usada por todas as peças",
  softShadow: "primitiva compartilhada de draw.ts, usada por todas as peças",
  pill: "primitiva compartilhada de draw.ts, usada por todas as peças",
  limb: "primitiva compartilhada de draw.ts, usada por todas as peças",
  point: "primitiva de círculo do pintor compartilhado, não é uma espada ou peça isolada",
  star: "primitiva de estrela do pintor compartilhado, não é uma peça isolada",
  paintSword: "compositor genérico de uma espada; a peça final drawKnightSword já é auditada para todas as onze armas",
  paintSwordTrail: "pintor compartilhado do rastro do golpe; efeito transitório auditado em testes de regressão",
  drawKnightTrail: "rastro temporário composto com a espada e o golpe do herói; cada lâmina está registrada em ASSETS",
  drawWorldView: "compõe a cena inteira a partir das peças registradas",
  drawWorldAtlas: "cartografia do mapa, não uma peça de arte",
  drawInterior: "composição de ambiente interno; as peças dele devem ser registradas se forem extraídas",
  drawCaveView: "composição de cena com sprites já registrados; teste direto em tests/cave-art-contract.test.ts",
  drawCaveAtlas: "cartografia do andar interno; teste direto em tests/cave-art-contract.test.ts",
};
