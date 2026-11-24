import type { StaffVisualProfile } from "../../engine/character/Staves.ts";
import { paintCoralMotif } from "./motifs/coral.ts";
import { paintFeatherMotif } from "./motifs/feather.ts";
import { paintStoneMotif } from "./motifs/stone.ts";
import type { StaffTone } from "./shaft.ts";

/**
 * A matéria própria de cada cajado (ADR 0073), por cima da haste e da gema: o carvalho do Aprendiz não tem enfeite; o vento tem penas, a
 * terra tem rocha e a água tem coral. `back` fica atrás da gema (o que a segura) e `front` na frente dela (o que a rodeia).
 */
export function paintStaffMotif(ctx: CanvasRenderingContext2D, v: StaffVisualProfile, tone: StaffTone, time: number, layer: "back" | "front"): void {
  switch (v.motif) {
    case "feather": paintFeatherMotif(ctx, v, tone, time, layer); return;
    case "stone": paintStoneMotif(ctx, v, tone, time, layer); return;
    case "coral": paintCoralMotif(ctx, v, tone, time, layer); return;
    case "oak": return;
  }
}
