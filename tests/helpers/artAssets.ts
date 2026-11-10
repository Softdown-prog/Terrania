import { renderSandBeetle } from "../../src/render/sandBeetle.ts";
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
import { RUIN_NAMES, type RuinVariant } from "../../src/world/southRuins.ts";
import { drawCaveEntrance } from "../../src/render/cave.ts";
import { drawCaveExitStair, drawCaveFormation, drawCaveWallFace } from "../../src/render/caveDetails.ts";
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
  {id:"cercado de estábulo",tier:"structure",fn:"renderStableFence",
    draw:c=>renderStableFence(c,0,0,true)},
  {id:"pegadas do Garrano",tier:"prop",fn:"renderMountTracks",
    draw:c=>renderMountTracks(c,0,0)},
  ...REGIONAL_CREATURE_KINDS.map<ArtAsset>(kind => ({id:"monstro "+kind,tier:"creature",fn:"renderRegionalCreature",
    draw:c=>renderRegionalCreature(c,{kind,hp:CREATURE_CATALOG[kind].maxHp,id:"art-"+kind},0,0,1)})),
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
  { id: "barril de referência", tier: "prop", fn: "renderBarrelReference", draw: c => renderBarrelReference(c, 0, 0, "b1") },
  ...(["verdant", "glacial", "desert", "coastal", "basalt", "marsh"] as const)
    .flatMap<ArtAsset>(theme => [
      { id: "formação subterrânea " + theme, tier: "prop", fn: "drawCaveFormation",
        draw: c => drawCaveFormation(c, theme, 0, 0, .61) },
      { id: "escada subterrânea " + theme, tier: "prop", fn: "drawCaveExitStair",
        draw: c => drawCaveExitStair(c, theme, 0, 0) },
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
  drawKnightTrail: "rastro temporário composto com a espada e o golpe do herói; cada lâmina está registrada em ASSETS",
  drawWorldView: "compõe a cena inteira a partir das peças registradas",
  drawWorldAtlas: "cartografia do mapa, não uma peça de arte",
  drawInterior: "composição de ambiente interno; as peças dele devem ser registradas se forem extraídas",
  drawCaveView: "composição de cena com sprites já registrados; teste direto em tests/cave-art-contract.test.ts",
  drawCaveAtlas: "cartografia do andar interno; teste direto em tests/cave-art-contract.test.ts",
};
