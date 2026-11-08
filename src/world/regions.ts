import { valueNoise } from "./random.ts";

/** Coordenadas globais, com norte no eixo Y negativo. Sem depender da interface. */
export type WorldRegion = "center" | "north" | "south" | "east" | "west";
export type RegionWeights = Readonly<Record<WorldRegion, number>>;

export const REGIONS: Readonly<Record<WorldRegion, {
  name: string; difficulty: number; description: string;
  encounterThemes: readonly string[]; landmarkThemes: readonly string[];
}>> = {
  center: { name: "Terras da Travessia", difficulty: 1, description: "Campos, trilhas e vila inicial",
    encounterThemes: ["slime"], landmarkThemes: ["vila", "ponte", "clareira"] },
  north: { name: "Norte Glacial", difficulty: 3, description: "Tundra, neve e lagos gelados",
    encounterThemes: ["lobo glacial", "golem de gelo", "espírito frio"], landmarkThemes: ["torre congelada", "lago morto"] },
  south: { name: "Ermos do Sul", difficulty: 4, description: "Deserto, dunas e oásis",
    encounterThemes: ["escorpião", "verme da areia", "bandido do deserto"], landmarkThemes: ["oásis", "ruína soterrada", "obelisco"] },
  east: { name: "Costa das Ilhas", difficulty: 2, description: "Praias, litoral e arquipélagos",
    encounterThemes: ["caranguejo gigante", "saqueador costeiro"], landmarkThemes: ["farol", "porto abandonado", "ilha"] },
  west: { name: "Cordilheira dos Dragões", difficulty: 5, description: "Montanhas, cavernas e rochedos",
    encounterThemes: ["troll de pedra", "harpia", "wyvern", "dragão"], landmarkThemes: ["caverna", "pico", "portal de masmorra"] },
} as const;

const clamp = (v: number): number => Math.max(0, Math.min(1, v));
function smooth(a: number, b: number, x: number): number {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

/** Influências contínuas. O ruído de larga escala curva as fronteiras, não produz quadrados. */
export function getRegionWeights(tileX: number, tileY: number): RegionWeights {
  if (!Number.isFinite(tileX) || !Number.isFinite(tileY))
    return { center: 1, north: 0, south: 0, east: 0, west: 0 };
  const x = tileX + (valueNoise(tileX / 4700, tileY / 4700, 119) - 0.5) * 950;
  const y = tileY + (valueNoise(tileX / 4700, tileY / 4700, 251) - 0.5) * 950;
  const wilderness = smooth(3800, 9700, Math.max(Math.abs(x), Math.abs(y)));
  const total = Math.abs(x) + Math.abs(y) || 1;
  return {
    center: 1 - wilderness,
    north: wilderness * Math.max(0, -y) / total,
    south: wilderness * Math.max(0, y) / total,
    east: wilderness * Math.max(0, x) / total,
    west: wilderness * Math.max(0, -x) / total,
  };
}
export function getWorldRegion(tileX: number, tileY: number): WorldRegion {
  const weights = getRegionWeights(tileX, tileY);
  const keys: readonly WorldRegion[] = ["center", "north", "south", "east", "west"];
  return keys.reduce((best, key) => weights[key] > weights[best] ? key : best, "center" as WorldRegion);
}
