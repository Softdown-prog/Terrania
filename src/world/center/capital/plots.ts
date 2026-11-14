import type { CapitalDistrictId } from "./districts.ts";

/** De que lado do terreno fica a porta (e a rua que ela encara). */
export type DoorSide = "n" | "s" | "e" | "w";
/** O que cada terreno vai ser; a arte e o interior de cada um vêm nas partes seguintes. */
export type PlotKind = "guild" | "civic" | "trade" | "craft" | "temple" | "inn" | "archive" | "health" | "stable" | "storage" | "home";

/** Um terreno de construção da capital, em tiles locais: o canto de cima e à esquerda, o tamanho e a porta. */
export interface CapitalPlot {
  readonly id: string; readonly name: string; readonly district: CapitalDistrictId; readonly kind: PlotKind;
  readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly door: DoorSide;
}
const plot = (id: string, name: string, district: CapitalDistrictId, kind: PlotKind, x: number, y: number, w: number, h: number, door: DoorSide): CapitalPlot =>
  ({ id, name, district, kind, x, y, w, h, door });

/** Os terrenos da capital. Os nomes são de trabalho (o dono ajusta); a posição e o tamanho é que seguram a planta. */
export const CAPITAL_PLOTS: readonly CapitalPlot[] = [
  // Cidadela dos Povos (norte)
  plot("ordem-cavaleiros", "Salão da Ordem dos Cavaleiros", "cidadela", "guild", -36, -28, 12, 11, "s"),
  plot("quartel", "Quartel da Guarda", "cidadela", "civic", -22, -28, 18, 11, "s"),
  plot("conselho", "Salão do Conselho dos Povos", "cidadela", "civic", 5, -28, 18, 11, "s"),
  plot("academia-arcana", "Academia Arcana", "cidadela", "guild", 25, -28, 11, 11, "s"),
  // Alameda das Guildas
  plot("arqueiros", "Irmandade dos Arqueiros", "alameda", "guild", -36, -15, 12, 13, "s"),
  plot("hospedaria", "Hospedaria dos Viajantes", "alameda", "inn", -22, -15, 11, 13, "s"),
  plot("casa-da-moeda", "Casa da Moeda e dos Mercadores", "alameda", "trade", 12, -15, 11, 13, "s"),
  plot("templo", "Templo da Concórdia", "alameda", "temple", 25, -15, 11, 13, "s"),
  // Quarteirão dos Ofícios e Saberes
  plot("forjas", "Forjas da Travessia", "oficios", "craft", -36, 3, 12, 12, "n"),
  plot("mercado-coberto", "Mercado Coberto", "oficios", "trade", -22, 3, 11, 12, "n"),
  plot("arquivo", "Arquivo dos Exploradores", "oficios", "archive", 12, 3, 11, 12, "n"),
  plot("alquimia", "Alquimia e Ervas", "oficios", "craft", 25, 3, 11, 12, "n"),
  // Bairro Residencial e Cura
  plot("estabulo", "Estábulo e Montarias", "bairro", "stable", -36, 17, 12, 11, "n"),
  plot("casa-oeste-1", "Casa do Bairro Oeste (1)", "bairro", "home", -22, 17, 6, 5, "n"),
  plot("casa-oeste-2", "Casa do Bairro Oeste (2)", "bairro", "home", -15, 17, 6, 5, "n"),
  plot("casa-oeste-3", "Casa do Bairro Oeste (3)", "bairro", "home", -22, 23, 6, 5, "s"),
  plot("casa-oeste-4", "Casa do Bairro Oeste (4)", "bairro", "home", -15, 23, 6, 5, "s"),
  plot("hospital", "Casa de Cura da Concórdia", "bairro", "health", 5, 17, 10, 11, "n"),
  plot("casa-leste-1", "Casa do Bairro Leste (1)", "bairro", "home", 16, 17, 6, 5, "n"),
  plot("casa-leste-2", "Casa do Bairro Leste (2)", "bairro", "home", 16, 23, 6, 5, "s"),
  plot("celeiros", "Celeiros da Capital", "bairro", "storage", 25, 17, 11, 11, "n"),
];

/** O tile local logo à frente da porta (do lado de fora do terreno): precisa ser rua para a porta ser alcançável. */
export function doorApproach(p: CapitalPlot): readonly [number, number] {
  const midX = p.x + Math.floor((p.w - 1) / 2), midY = p.y + Math.floor((p.h - 1) / 2);
  return p.door === "n" ? [midX, p.y - 1] : p.door === "s" ? [midX, p.y + p.h] : p.door === "w" ? [p.x - 1, midY] : [p.x + p.w, midY];
}

/** O tile local pertence ao terreno (a fundação da construção)? */
export function inPlot(p: CapitalPlot, lx: number, ly: number): boolean {
  return lx >= p.x && lx < p.x + p.w && ly >= p.y && ly < p.y + p.h;
}
