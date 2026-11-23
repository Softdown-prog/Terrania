import type { StaffVisualProfile } from "../../engine/character/Staves.ts";
import { ellipse, rgba } from "../draw.ts";

export type StaffTone = (color: string) => string;

/** A haste afunila da base (y = +14.6, no chão) até o topo (y = -26), com a curva natural da madeira. */
export const STAFF_BASE_Y = 14.6;
export const STAFF_TOP_Y = -26;

/**
 * A haste do cajado (ADR 0068), no referencial da mão (a empunhadura é a origem e o topo fica em -y): madeira afunilada com veios e nós,
 * empunhadura de couro enrolado, e a ponteira de ferro na base.
 */
export function paintStaffShaft(ctx: CanvasRenderingContext2D, v: StaffVisualProfile, tone: StaffTone): void {
  const wood = ctx.createLinearGradient(-2, 0, 2, 0);
  wood.addColorStop(0, tone(v.shaft.light)); wood.addColorStop(0.5, tone(v.shaft.mid)); wood.addColorStop(1, tone(v.shaft.dark));
  ctx.fillStyle = wood;
  ctx.beginPath();
  ctx.moveTo(-1.9, STAFF_BASE_Y);
  ctx.quadraticCurveTo(-2.3, -5, -1.4, STAFF_TOP_Y);
  ctx.lineTo(1.4, STAFF_TOP_Y);
  ctx.quadraticCurveTo(2.1, -5, 1.8, STAFF_BASE_Y);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba("#1c1208", 0.55); ctx.lineWidth = 0.8; ctx.stroke();
  // veios da madeira
  ctx.lineWidth = 0.5;
  [[-0.9, v.shaft.dark], [0.1, v.shaft.light], [0.9, v.shaft.dark]].forEach(([x, color], i) => {
    ctx.strokeStyle = tone(color as string);
    ctx.beginPath(); ctx.moveTo(x as number - i * 0.1, STAFF_BASE_Y - 1); ctx.quadraticCurveTo((x as number) * 1.4, -4, (x as number) * 0.8, STAFF_TOP_Y + 1); ctx.stroke();
  });
  // nós da madeira, um escuro e um claro
  ellipse(ctx, 0.5, -12, 0.95, 1.3, tone(v.shaft.dark));
  ellipse(ctx, 0.2, -12.3, 0.45, 0.6, rgba(v.shaft.light, 0.7));
  ellipse(ctx, -0.4, 8, 0.8, 1.1, tone(v.shaft.dark));
  // empunhadura de couro enrolado
  ctx.fillStyle = tone(v.wrap);
  ctx.fillRect(-2.1, -3.6, 4.2, 7.6);
  ctx.strokeStyle = tone(v.wrapDark); ctx.lineWidth = 0.7;
  ctx.beginPath();
  for (let y = -3.2; y < 4; y += 1.9) { ctx.moveTo(-2.1, y + 1.2); ctx.lineTo(2.1, y - 0.4); }
  ctx.stroke();
  ctx.strokeStyle = rgba("#1c1208", 0.5); ctx.lineWidth = 0.6; ctx.strokeRect(-2.1, -3.6, 4.2, 7.6);
  // anel dourado sob as garras e fio de luz na madeira
  ctx.fillStyle = tone(v.collar); ctx.fillRect(-2.2, STAFF_TOP_Y + 0.4, 4.4, 2);
  ctx.strokeStyle = tone(v.collarDark); ctx.lineWidth = 0.5; ctx.strokeRect(-2.2, STAFF_TOP_Y + 0.4, 4.4, 2);
  ctx.strokeStyle = tone(v.sheen); ctx.lineWidth = 0.45;
  ctx.beginPath(); ctx.moveTo(-1.5, STAFF_BASE_Y - 4); ctx.quadraticCurveTo(-1.9, -6, -1, STAFF_TOP_Y + 3); ctx.stroke();
  // ponteira de ferro
  ctx.fillStyle = tone(v.ferrule);
  ctx.beginPath(); ctx.moveTo(-2, STAFF_BASE_Y - 3); ctx.lineTo(2, STAFF_BASE_Y - 3); ctx.lineTo(1.5, STAFF_BASE_Y + 0.4); ctx.lineTo(-1.5, STAFF_BASE_Y + 0.4); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = tone(v.ferruleLight); ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(-1.6, STAFF_BASE_Y - 2.4); ctx.lineTo(1.6, STAFF_BASE_Y - 2.4); ctx.stroke();
}
