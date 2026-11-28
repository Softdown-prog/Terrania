import type { BowDefinition } from "../../Bows.ts";

/**
 * O Arco da Lua Negra (ADR 0122, lote A4c): o nono do Arqueiro, no nível 80 como o cutelo do charco. Madeira escura de noite sem lua, com a corda de uma
 * sombra violeta e as pontas de um luar pálido. Números propostos (o dono ajusta aqui): os do cutelo do charco, 98 de dano e 1,3 s entre tiros, com 0,14 s
 * de preparo; alcance 7 tiles e uma flecha por tiro.
 */
export const MOON_BOW = {
  name: "Arco da Lua Negra",
  level: 80,
  damage: 98,
  interval: 1.3,
  windup: 0.14,
  range: 7,
  arrowsPerShot: 1,
  material: "madeira escura e corda de sombra",
  visual: {
    limb: { light: "#6b5a8c", mid: "#2f2748", dark: "#0e0a1a" },
    string: "#b9a6ff",
    wrap: "#1c1530",
    wrapDark: "#0a0714",
    tip: "#d9ccff",
    charm: "#8a6fe0",
    length: 1.08,
    flick: 0.8,
  },
} as const satisfies BowDefinition;
