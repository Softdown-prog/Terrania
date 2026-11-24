import { STAVES, type StaffId } from "../engine/character/Staves.ts";
import { paintStaffHead } from "./staves/head.ts";
import { paintStaffShaft, type StaffTone } from "./staves/shaft.ts";

/**
 * O cajado do Mago inteiro (ADR 0068), no referencial da mão: a origem é a empunhadura e o topo fica em -y. A aparência vem da ficha
 * (`STAVES[id].visual`); `tone` aplica o brilho de dano e `time` faz a gema pulsar e a fita balançar. `charge` (0..1) é a magia sendo
 * carregada (ADR 0070): a gema acende e solta faíscas; sem ele, o desenho é o parado de sempre.
 */
export function drawMageStaff(ctx: CanvasRenderingContext2D, staff: StaffId, time = 0, tone: StaffTone = c => c, charge = 0): void {
  const v = STAVES[staff].visual;
  paintStaffShaft(ctx, v, tone);
  paintStaffHead(ctx, v, tone, time, charge);
}
