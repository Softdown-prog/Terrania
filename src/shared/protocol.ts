/** Version 3 shares village building collision with clients and the server. */
export const PROTOCOL_VERSION = 3;
export interface HeroState {
  id: string;
  name: string;
  x: number;
  y: number;
  hp: number;
  kills: number;
  experience?: number;
  faceX: number;
  faceY: number;
  walkTime: number;
  attackTime: number;
  vx?: number;
  vy?: number;
  hurtTime?: number;
}
export interface MobState {
  id: string;
  x: number;
  y: number;
  hp: number;
  bounce: number;
  hurtTime?: number;
}
export type InputMessage = {
  type: "input";
  x: number;
  y: number;
  attack: boolean;
};
export type WalkTarget = { readonly x: number; readonly y: number };
export type WalkMessage = { type: "walk"; target: WalkTarget | null };
export type TargetMessage = { type: "target"; id: string | null };
export type CombatFocus = { readonly id: string; readonly following: boolean };
export type ClientMessage = InputMessage | WalkMessage | TargetMessage;
export type ServerMessage =
  | { type: "welcome"; version: number; id: string; room: string; seed: number; movement?: "tiles"; combat?: "target" }
  | { type: "state"; players: HeroState[]; mobs: MobState[]; walkTarget?: WalkTarget | null; focus?: CombatFocus | null }
  | { type: "error"; message: string };
export function isValidInput(value: unknown): value is InputMessage {
  if (!value || typeof value !== "object") return false;
  const m = value as Partial<InputMessage>;
  return (
    m.type === "input" &&
    typeof m.x === "number" &&
    Number.isFinite(m.x) &&
    typeof m.y === "number" &&
    Number.isFinite(m.y) &&
    Math.hypot(m.x, m.y) <= 1.05 &&
    typeof m.attack === "boolean"
  );
}
export function isWalkTarget(value: unknown): value is WalkTarget {
  if (!value || typeof value !== "object") return false;
  const { x, y } = value as Partial<WalkTarget>;
  return typeof x === "number" && Math.abs(x) <= 1_000_000 &&
    typeof y === "number" && Math.abs(y) <= 1_000_000;
}
export function isValidWalk(value: unknown): value is WalkMessage {
  if (!value || typeof value !== "object") return false;
  const m = value as Partial<WalkMessage>;
  return m.type === "walk" && (m.target === null || isWalkTarget(m.target));
}
export function isValidTarget(value: unknown): value is TargetMessage {
  if (!value || typeof value !== "object") return false;
  const m = value as Partial<TargetMessage>;
  return m.type === "target" && (m.id === null ||
    (typeof m.id === "string" && /^[\w,-]{1,64}$/.test(m.id)));
}
export function validRoom(room: string): boolean {
  return /^[a-z0-9-]{1,24}$/.test(room);
}
