import { ROOM_HEIGHT, ROOM_WIDTH } from "../engine/InteriorRoom.ts";
import type { Point } from "../engine/TapNavigator.ts";

/** Eventos de ponteiro em CSS pixels, sem assumir zoom do navegador = 1. */
export function isShortTap(distance: number, elapsedMs: number): boolean {
  return Number.isFinite(distance) && Number.isFinite(elapsedMs) &&
    distance <= 12 && elapsedMs >= 0 && elapsedMs <= 450;
}

export function screenToWorld(
  local: Point, width: number, height: number,
  camera: Point, zoom: number,
): Point | null {
  if (![local.x, local.y, width, height, camera.x, camera.y, zoom].every(Number.isFinite) ||
      width <= 0 || height <= 0 || zoom <= 0 ||
      local.x < 0 || local.y < 0 || local.x > width || local.y > height) return null;
  return {
    x: camera.x + (local.x - width / 2) / zoom,
    y: camera.y + (local.y - height / 2) / zoom,
  };
}

export function screenToInterior(
  local: Point, width: number, height: number,
): Point | null {
  if (![local.x, local.y, width, height].every(Number.isFinite) ||
      width <= 0 || height <= 0) return null;
  const scale = Math.min(1.7, width / (ROOM_WIDTH + 70), height / (ROOM_HEIGHT + 130));
  const x = (local.x - (width - ROOM_WIDTH * scale) / 2) / scale;
  const y = (local.y - (height - ROOM_HEIGHT * scale) / 2) / scale;
  if (x < 0 || y < 0 || x > ROOM_WIDTH || y > ROOM_HEIGHT) return null;
  return { x, y };
}
