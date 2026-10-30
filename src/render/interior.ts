import type { Player } from "../actors/Player.ts";
import { renderHero } from "./actors.ts";
import { FURNITURE, ROOM_HEIGHT, ROOM_WIDTH, type InteriorRoom } from "../engine/InteriorRoom.ts";

/** Interiores realmente caminháveis, renderizados proceduralmente no mesmo Canvas. */
export function drawInterior(ctx: CanvasRenderingContext2D, room: InteriorRoom): void {
  const palette = [
    { wall: "#586b5c", floor: "#8e7859", wood: "#b39a6c" },
    { wall: "#69645a", floor: "#6c685e", wood: "#a68a6b" },
    { wall: "#765e50", floor: "#a08160", wood: "#c5a07a" },
  ][room.building.variant];
  ctx.fillStyle = "#172a26"; ctx.fillRect(-16, -16, ROOM_WIDTH + 32, ROOM_HEIGHT + 32);
  ctx.fillStyle = palette.floor; ctx.fillRect(0, 0, ROOM_WIDTH, ROOM_HEIGHT);
  for (let x = 0; x < ROOM_WIDTH; x += 24) {
    ctx.fillStyle = x % 48 ? "#241c1a0f" : "#f5e6bd14";
    ctx.fillRect(x, 48, 2, ROOM_HEIGHT - 48);
  }
  for (let y = 46; y < ROOM_HEIGHT; y += 30) {
    ctx.fillStyle = "#493a271c"; ctx.fillRect(0, y, ROOM_WIDTH, 2);
  }
  ctx.fillStyle = palette.wall; ctx.fillRect(0, 0, ROOM_WIDTH, 52);
  ctx.fillStyle = "#463c2f"; ctx.fillRect(0, 49, ROOM_WIDTH, 8);
  ctx.fillStyle = "#d8c292"; ctx.fillRect(151, 10, 58, 37);
  ctx.fillStyle = "#75a6a4"; ctx.fillRect(157, 16, 46, 25);
  ctx.fillStyle = "#d8c292"; ctx.fillRect(179, 16, 3, 25);
  ctx.fillStyle = "#273830"; ctx.fillRect(0, 0, 11, ROOM_HEIGHT); ctx.fillRect(ROOM_WIDTH - 11, 0, 11, ROOM_HEIGHT);
  ctx.fillRect(0, ROOM_HEIGHT - 11, ROOM_WIDTH / 2 - 25, 11);
  ctx.fillRect(ROOM_WIDTH / 2 + 25, ROOM_HEIGHT - 11, ROOM_WIDTH / 2 - 25, 11);
  ctx.fillStyle = "#d1bd82"; ctx.fillRect(ROOM_WIDTH / 2 - 25, ROOM_HEIGHT - 13, 50, 5);
  // A mobília é projetada no chão para coincidir com a colisão.
  for (const f of FURNITURE) {
    ctx.fillStyle = "#26342e55"; ctx.fillRect(f.x + 3, f.y + 6, f.width, f.height);
    ctx.fillStyle = f.kind === "bench" ? "#6d5444" : "#553d2d";
    ctx.fillRect(f.x, f.y, f.width, f.height);
    ctx.fillStyle = palette.wood; ctx.fillRect(f.x + 4, f.y + 3, f.width - 8, f.height - 9);
    if (f.kind === "shelf") {
      ctx.fillStyle = "#526e72";
      for (let i = 0; i < 5; i++) ctx.fillRect(f.x + 7 + i * 10, f.y + 5, 6, 19);
    }
  }
  ctx.fillStyle = "#5d3e36"; ctx.fillRect(119, 167, 122, 49);
  ctx.strokeStyle = "#c6a46b"; ctx.lineWidth = 3; ctx.strokeRect(122, 170, 116, 43);
  renderHero(ctx, room.player as Player, room.player.x, room.player.y);
}
