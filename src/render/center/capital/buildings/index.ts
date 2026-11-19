import { CAPITAL_BUILDINGS } from "../../../../world/center/capital/index.ts";
import { ACADEMY, paintArcaneAcademy } from "./academy.ts";
import { ARCHERS, paintArchersLodge } from "./archers.ts";
import { BARRACKS, paintGuardBarracks } from "./barracks.ts";
import { COUNCIL, paintCouncilHall } from "./council.ts";
import { INN, paintTravelersInn } from "./inn.ts";
import { KNIGHTS, paintKnightsHall } from "./knights.ts";
import { MINT, paintMintHall } from "./mint.ts";
import { TEMPLE, paintConcordTemple } from "./temple.ts";

/** A arte de um edifício da capital: o pintor (origem no meio da frente, no chão) e o tamanho (terreno em px e quanto sobe além dele). */
export interface CapitalBuildingArt {
  readonly paint: (c: CanvasRenderingContext2D) => void;
  readonly size: { readonly width: number; readonly depth: number; readonly rise: number };
}
/** Um pintor por edifício construído, pela identificação do terreno (ADR 0058). */
export const CAPITAL_BUILDING_ART: Readonly<Record<string, CapitalBuildingArt>> = {
  "ordem-cavaleiros": { paint: paintKnightsHall, size: KNIGHTS },
  quartel: { paint: paintGuardBarracks, size: BARRACKS },
  conselho: { paint: paintCouncilHall, size: COUNCIL },
  "academia-arcana": { paint: paintArcaneAcademy, size: ACADEMY },
  arqueiros: { paint: paintArchersLodge, size: ARCHERS },
  hospedaria: { paint: paintTravelersInn, size: INN },
  "casa-da-moeda": { paint: paintMintHall, size: MINT },
  templo: { paint: paintConcordTemple, size: TEMPLE },
};
/** Folga do sprite em volta do edifício, em px: à esquerda e em cima (beiral), à direita (sombra) e embaixo (degraus e sombra). */
export const BUILDING_PAD = { left: 16, right: 36, bottom: 18 } as const;
/** A caixa do sprite de um edifício: largura, altura e a origem (x, y) dentro dela. */
export function buildingBox(size: CapitalBuildingArt["size"]): readonly [number, number, number, number] {
  return [size.width + BUILDING_PAD.left + BUILDING_PAD.right, size.depth + size.rise + BUILDING_PAD.bottom, size.width / 2 + BUILDING_PAD.left, size.depth + size.rise];
}
/** A arte do edifício de variação `variant` (a posição dele em `CAPITAL_BUILDINGS`), ou `undefined`. */
export function capitalBuildingArtFor(variant: number): CapitalBuildingArt | undefined {
  const building = Number.isFinite(variant) ? CAPITAL_BUILDINGS[Math.round(variant)] : undefined;
  return building ? CAPITAL_BUILDING_ART[building.id] : undefined;
}
export { paintArcaneAcademy, paintArchersLodge, paintConcordTemple, paintCouncilHall, paintGuardBarracks, paintKnightsHall, paintMintHall, paintTravelersInn };
