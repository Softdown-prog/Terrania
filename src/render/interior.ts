import { renderHero } from "./actors.ts";
import { ROOM_HEIGHT, ROOM_WIDTH, type Furniture, type InteriorRoom } from "../engine/InteriorRoom.ts";

function drawFurniture(ctx: CanvasRenderingContext2D, f: Furniture, wood: string): void {
  ctx.fillStyle = "#26342e55";
  ctx.fillRect(f.x + 3, f.y + 6, f.width, f.height);
  ctx.fillStyle = f.kind === "anvil" ? "#343d43" : f.kind === "forge" ? "#48433e" : "#604631";
  ctx.fillRect(f.x, f.y, f.width, f.height);
  if (f.kind === "anvil") {
    ctx.fillStyle = "#a2a9a8";
    ctx.fillRect(f.x + 8, f.y + 9, f.width - 16, f.height - 18);
    ctx.fillStyle = "#c3c9bd";
    ctx.fillRect(f.x + 2, f.y + 10, f.width - 4, 6);
  } else if (f.kind === "forge") {
    ctx.fillStyle = "#b1a38d";
    ctx.fillRect(f.x + 6, f.y + 7, f.width - 12, f.height - 14);
    ctx.fillStyle = "#bd5f31";
    ctx.fillRect(f.x + 15, f.y + 17, f.width - 30, f.height - 30);
    ctx.fillStyle = "#ffbd67";
    ctx.fillRect(f.x + 23, f.y + 21, f.width - 46, f.height - 39);
  } else if (f.kind === "bed") {
    ctx.fillStyle = "#d0bea1";
    ctx.fillRect(f.x + 5, f.y + 5, f.width - 10, f.height - 10);
    ctx.fillStyle = "#6a8076";
    ctx.fillRect(f.x + 6, f.y + 28, f.width - 12, f.height - 34);
    ctx.fillStyle = "#e7dac3";
    ctx.fillRect(f.x + 13, f.y + 9, f.width - 26, 15);
  } else {
    ctx.fillStyle = wood;
    ctx.fillRect(f.x + 4, f.y + 3, f.width - 8, f.height - 9);
    if (f.kind === "shelf") {
      ctx.fillStyle = "#526e72";
      for (let i = 0; i < 5; i++) ctx.fillRect(f.x + 7 + i * 10, f.y + 5, 6, 19);
    }
    if (f.kind === "bench") {
      ctx.fillStyle = "#705441";
      ctx.fillRect(f.x + 8, f.y + f.height - 13, f.width - 16, 6);
    }
  }
}
/** Cada sala tem decoração própria e usa a mobília da mesma simulação que calcula colisões. */
export function drawInterior(ctx: CanvasRenderingContext2D, room: InteriorRoom): void {
  const palette = [
    { wall: "#586b5c", floor: "#8e7859", wood: "#b39a6c" },
    { wall: "#69645a", floor: "#6c685e", wood: "#a68a6b" },
    { wall: "#765e50", floor: "#a08160", wood: "#c5a07a" },
  ][room.building.variant] ?? { wall: "#586b5c", floor: "#8e7859", wood: "#b39a6c" };
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
  ctx.fillStyle = "#273830";
  ctx.fillRect(0, 0, 11, ROOM_HEIGHT);
  ctx.fillRect(ROOM_WIDTH - 11, 0, 11, ROOM_HEIGHT);
  ctx.fillRect(0, ROOM_HEIGHT - 11, ROOM_WIDTH / 2 - 25, 11);
  ctx.fillRect(ROOM_WIDTH / 2 + 25, ROOM_HEIGHT - 11, ROOM_WIDTH / 2 - 25, 11);
  ctx.fillStyle = "#d1bd82"; ctx.fillRect(ROOM_WIDTH / 2 - 25, ROOM_HEIGHT - 13, 50, 5);
  // Tapete decorativo sem colisão, sob o jogador.
  ctx.fillStyle = "#5d3e36"; ctx.fillRect(119, 167, 122, 49);
  ctx.strokeStyle = "#c6a46b"; ctx.lineWidth = 3; ctx.strokeRect(122, 170, 116, 43);
  for (const f of room.furniture) drawFurniture(ctx, f, palette.wood);
  renderHero(ctx, room.player, room.player.x, room.player.y);
}
