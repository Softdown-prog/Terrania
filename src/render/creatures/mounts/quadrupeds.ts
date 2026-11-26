/** As sete montarias de quatro patas reunidas (ADR 0091): para cada uma, o corpo (medidas), o que fica atrás do tronco (pescoço, cabeça, asas) e o que fica na frente (cauda, enfeites). */
import type { MountId } from "../../../actors/MountCatalog.ts";
import type { Palette } from "./geometry.ts";
import type { QuadrupedSpec } from "../shared/anatomy/quadruped.ts";
import { riderLiftFor, saddleCenterX } from "./saddle.ts";
import { WARHORSE_BODY, drawWarhorse, drawWarhorseBehind } from "./warhorse.ts";
import { MOUNTAIN_GOAT_BODY, drawMountainGoat, drawMountainGoatBehind } from "./mountainGoat.ts";
import { IMPERIAL_ELK_BODY, drawImperialElk, drawImperialElkBehind } from "./imperialElk.ts";
import { FIRE_LION_BODY, drawFireLion, drawFireLionBehind } from "./fireLion.ts";
import { CAVERN_BEAR_BODY, drawCavernBear, drawCavernBearBehind } from "./cavernBear.ts";
import { SILVER_UNICORN_BODY, drawSilverUnicorn, drawSilverUnicornBehind } from "./silverUnicorn.ts";
import { SAND_BASILISK_TORSO } from "./sandBasilisk.ts";
import { DARK_GRIFFIN_BODY, drawDarkGriffin, drawDarkGriffinBehind } from "./darkGriffin.ts";

export type QuadrupedMountId = "warhorse" | "mountain-goat" | "imperial-elk" | "fire-lion" | "cavern-bear" | "silver-unicorn" | "dark-griffin";
export interface QuadrupedMount {
  readonly body: QuadrupedSpec;
  readonly behind: (ctx: CanvasRenderingContext2D, p: Palette, time: number) => void;
  readonly front: (ctx: CanvasRenderingContext2D, p: Palette, time: number) => void;
}
export const QUADRUPED_MOUNTS: Readonly<Record<QuadrupedMountId, QuadrupedMount>> = {
  warhorse: { body: WARHORSE_BODY, behind: drawWarhorseBehind, front: drawWarhorse },
  "mountain-goat": { body: MOUNTAIN_GOAT_BODY, behind: drawMountainGoatBehind, front: drawMountainGoat },
  "imperial-elk": { body: IMPERIAL_ELK_BODY, behind: drawImperialElkBehind, front: drawImperialElk },
  "fire-lion": { body: FIRE_LION_BODY, behind: drawFireLionBehind, front: drawFireLion },
  "cavern-bear": { body: CAVERN_BEAR_BODY, behind: drawCavernBearBehind, front: drawCavernBear },
  "silver-unicorn": { body: SILVER_UNICORN_BODY, behind: drawSilverUnicornBehind, front: drawSilverUnicorn },
  "dark-griffin": { body: DARK_GRIFFIN_BODY, behind: drawDarkGriffinBehind, front: drawDarkGriffin },
};
export const isQuadrupedMount = (id: MountId): id is QuadrupedMountId => id in QUADRUPED_MOUNTS;

/** A altura a que o cavaleiro é desenhado acima dos pés da montaria: acompanha o lombo de cada uma (as de quatro patas e o lagarto); o besouro e o hipocampo mantêm os 19 de sempre. */
export const LEGACY_RIDER_LIFT = 19;
export const mountRiderLift = (id: MountId): number => isQuadrupedMount(id) ? riderLiftFor(QUADRUPED_MOUNTS[id].body.torso) : id === "sand-basilisk" ? riderLiftFor(SAND_BASILISK_TORSO) : LEGACY_RIDER_LIFT;

/** Quanto o cavaleiro desloca para o lado da montaria que olha para a direita: ele senta no centro da sela, que fica entre o ombro e a anca (espelha com a montaria). */
export const mountRiderShiftX = (id: MountId): number =>
  isQuadrupedMount(id) ? saddleCenterX(QUADRUPED_MOUNTS[id].body.torso) : id === "sand-basilisk" ? saddleCenterX(SAND_BASILISK_TORSO) : 0;
