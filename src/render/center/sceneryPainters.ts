import type { SceneryPainter } from "../props/types.ts";
import { paintCapitalScenery } from "./capital/sceneryPainter.ts";
import { warmCapitalSprites } from "./capital/warm.ts";

/** Os tipos de cenário que só existem na região central, cada um com o pintor que mora na sua pasta (ADR 0048 e 0056). */
export const CENTER_SCENERY_PAINTERS: Readonly<Record<"center-capital", SceneryPainter>> = {
  "center-capital": paintCapitalScenery,
};

/** O que a região central prepara antes de aparecer: os sprites grandes dos edifícios da capital, um por quadro (ADR 0058). */
export const CENTER_SPRITE_WARMERS: ReadonlyArray<(cameraX: number, cameraY: number) => boolean> = [warmCapitalSprites];
