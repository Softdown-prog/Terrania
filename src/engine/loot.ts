/** Itens no chão da aventura solo, com ID estável para persistência. */
export interface LootDrop {
  readonly id: string;
  readonly item: "gel";
  readonly x: number;
  readonly y: number;
}

export const MAX_WORLD_DROPS = 80;
export const PICKUP_DISTANCE = 24;

export function normalizeDrops(value: unknown): LootDrop[] {
  if (!Array.isArray(value)) return [];
  const result: LootDrop[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const drop = item as Partial<LootDrop>;
    if (drop.item !== "gel" || typeof drop.id !== "string" ||
        drop.id.length < 1 || drop.id.length > 80 || seen.has(drop.id) ||
        typeof drop.x !== "number" || !Number.isFinite(drop.x) ||
        typeof drop.y !== "number" || !Number.isFinite(drop.y) ||
        Math.abs(drop.x) > 1_000_000 || Math.abs(drop.y) > 1_000_000) continue;
    seen.add(drop.id);
    result.push({ id: drop.id, item: "gel", x: drop.x, y: drop.y });
    if (result.length >= MAX_WORLD_DROPS) break;
  }
  return result;
}
