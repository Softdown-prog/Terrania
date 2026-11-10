import { warhorse } from "./mounts/warhorse.ts";
import { mountainGoat } from "./mounts/mountainGoat.ts";
import { imperialElk } from "./mounts/imperialElk.ts";
import { fireLion } from "./mounts/fireLion.ts";
import { sandBasilisk } from "./mounts/sandBasilisk.ts";
import { cavernBear } from "./mounts/cavernBear.ts";
import { silverUnicorn } from "./mounts/silverUnicorn.ts";
import { darkGriffin } from "./mounts/darkGriffin.ts";
import { cargoBeetle } from "./mounts/cargoBeetle.ts";
import { tidalHippocampus } from "./mounts/tidalHippocampus.ts";

/** Montarias são companheiras do jogo SOLO, não monstros nem entidades de rede. */
import { MOUNT_IDS, type MountId } from "../world/mountIds.ts";
export { MOUNT_IDS };
export type { MountId };
export type RidingTier = 1 | 2 | 3;
export type MountRegion = "west" | "northwest" | "north" | "south" | "east" | "west-north" | "east-west";
export type MountAbility = "charge" | "climb" | "forest" | "fire-aura" | "desert" |
  "barrier" | "purify" | "glide" | "cargo" | "amphibious";
export interface MountLoot { readonly item: string; readonly chance: number }
export interface MountDefinition {
  readonly id: MountId;
  readonly name: string;
  readonly tier: RidingTier;
  readonly level: number;
  readonly saddle: string;
  readonly region: MountRegion;
  readonly hp: number;
  readonly stamina: number;
  readonly speedBonus: number;
  readonly waterSpeedBonus?: number;
  readonly attack: number;
  readonly attackName: string;
  readonly ability: MountAbility;
  readonly abilityDescription: string;
  readonly dropsOnTame: readonly MountLoot[];
  readonly bait: string;
}
export const RIDING_LEVEL: Readonly<Record<RidingTier, number>> = {1: 15, 2: 35, 3: 55};
/** Preço de construir (I) e ampliar (II e III) o estábulo, em Terrania Gold (ADR 0025). */
export const STABLE_UPGRADE_PRICE: Readonly<Record<RidingTier, number>> = {1: 72, 2: 150, 3: 240};
/** Um único catálogo, sem fichas duplicadas entre HUD, missões e motor. */
export const MOUNTS: Readonly<Record<MountId, MountDefinition>> = {
  warhorse: warhorse,
  "mountain-goat": mountainGoat,
  "imperial-elk": imperialElk,
  "fire-lion": fireLion,
  "sand-basilisk": sandBasilisk,
  "cavern-bear": cavernBear,
  "silver-unicorn": silverUnicorn,
  "dark-griffin": darkGriffin,
  "cargo-beetle": cargoBeetle,
  "tidal-hippocampus": tidalHippocampus,
};
export function isMountId(value: unknown): value is MountId {
  return typeof value === "string" && (MOUNT_IDS as readonly string[]).includes(value);
}
