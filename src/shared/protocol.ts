/** Protocolo JSON versão 1. O cliente nunca envia posição, HP ou XP. */
export const PROTOCOL_VERSION = 1;
export interface HeroState {
  id: string; name: string; x: number; y: number; hp: number; kills: number;
  faceX: number; faceY: number; walkTime: number; attackTime: number;
}
export interface MobState { id: string; x: number; y: number; hp: number; bounce: number }
export type ClientMessage = { type: 'input'; x: number; y: number; attack: boolean };
export type ServerMessage =
  | { type: 'welcome'; version: number; id: string; room: string; seed: number }
  | { type: 'state'; players: HeroState[]; mobs: MobState[] }
  | { type: 'error'; message: string };
export function isValidInput(value: unknown): value is ClientMessage {
  if (!value || typeof value !== 'object') return false;
  const m = value as Partial<ClientMessage>;
  return m.type === 'input' && typeof m.x === 'number' && Number.isFinite(m.x) &&
    typeof m.y === 'number' && Number.isFinite(m.y) && Math.hypot(m.x, m.y) <= 1.05 &&
    typeof m.attack === 'boolean';
}
export function validRoom(room: string): boolean { return /^[a-z0-9-]{1,24}$/.test(room); }
