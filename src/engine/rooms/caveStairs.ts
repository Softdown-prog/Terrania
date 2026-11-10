import { CaveRoom } from "./CaveRoom.ts";

/** O que a escada onde o herói pisou pede: ir para o andar de baixo, voltar ao de cima ou sair à superfície. */
export type CaveStairsMove = "descend" | "ascend" | "leave";

/** O movimento pedido pelo herói ter chegado a uma escada (pisou nela), ou nada. */
export function reachedStairsMove(room: CaveRoom): CaveStairsMove | null {
  if (room.reachedStairsDown) return "descend";
  if (room.reachedExit) return room.floorIndex === 1 ? "leave" : "ascend";
  return null;
}

/** O que a tecla de interação faria agora, para o herói perto de uma escada, ou nada. */
export function nearbyStairsMove(room: CaveRoom): CaveStairsMove | null {
  if (room.nearStairsDown) return "descend";
  if (room.nearExit) return room.floorIndex === 1 ? "leave" : "ascend";
  return null;
}

/**
 * Cria o andar de destino de uma troca de andar. O herói leva a vida, o inventário e as condições
 * (`syncAdventureStateFrom`); os monstros derrotados continuam derrotados (vêm de `defeated`).
 * `leave` não cria andar: quem chama devolve o herói à superfície.
 */
export function roomAfterMove(room: CaveRoom, move: Exclude<CaveStairsMove, "leave">,
  defeated: ReadonlySet<string>): CaveRoom {
  const floorIndex = room.floorIndex + (move === "descend" ? 1 : -1);
  const next = new CaveRoom(room.floor.entrance, room.player.hp, room.player.maxHp, defeated,
    { floorIndex, arrivedFrom: move === "descend" ? "above" : "below" });
  next.player.syncAdventureStateFrom(room.player);
  return next;
}
