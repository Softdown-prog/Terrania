import type { Rect } from "./streets.ts";

/** Os quatro bairros da capital (ADR 0055): faixas horizontais entre as ruas, do norte para o sul. */
export const CAPITAL_DISTRICTS = [
  { id: "cidadela", name: "Cidadela dos Povos", band: { x0: -36, y0: -28, x1: 35, y1: -18 } satisfies Rect,
    about: "Onde os povos humanos se governam: o Conselho, a Guarda e as ordens que mandam exploradores ao mundo." },
  { id: "alameda", name: "Alameda das Guildas", band: { x0: -36, y0: -15, x1: 35, y1: -3 } satisfies Rect,
    about: "Arqueiros, viajantes, mercadores e fé: a avenida por onde passam os que chegam e os que partem." },
  { id: "oficios", name: "Quarteirão dos Ofícios e Saberes", band: { x0: -36, y0: 3, x1: 35, y1: 14 } satisfies Rect,
    about: "Forjas, mercado, alquimia e o Arquivo dos Exploradores, onde os mistérios descobertos viram registro." },
  { id: "bairro", name: "Bairro Residencial e Cura", band: { x0: -36, y0: 17, x1: 35, y1: 27 } satisfies Rect,
    about: "Casas, estábulo, celeiros e o hospital: a vida de quem mora na capital." },
] as const;
export type CapitalDistrictId = (typeof CAPITAL_DISTRICTS)[number]["id"];
