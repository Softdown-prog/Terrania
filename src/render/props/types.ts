import type { SouthCityPropKind } from "../../world/southCity.ts";
import type { RegionalLandmarkKind } from "../../world/regionalLandmarks.ts";
import type { TowerId } from "../../world/towers/types.ts";
import type { DecorKind } from "../../world/south/decor/index.ts";
import type { RockStyle } from "../rocks/index.ts";
import type { RuinLayer } from "../south/ruins/index.ts";
import type { CapitalPropKind } from "../../world/center/capital/index.ts";

/** Um objeto do cenário a desenhar (ADR 0048). Os campos `south-*` só valem para o tipo da região correspondente. */
export interface Scenery {
  kind: "tree" | "rock" | "arch" | "sign" | "fire" | "house" | "regional-landmark" | "south-ruin" | "south-tower" | "south-city" | "south-decor" | "center-capital";
  /** Só `rock`: o estilo da pedra, escolhido pelo bioma (ausente = pedra de musgo de sempre). */
  rockStyle?: RockStyle;
  /** Só `south-decor`: o tipo de decoração do deserto (sem colisão, só visual). */
  decorKind?: DecorKind;
  /** Só `south-tower`: qual torre desenhar. */
  towerId?: TowerId;
  /** Só `center-capital`: qual peça da muralha da capital desenhar. */
  capitalKind?: CapitalPropKind;
  cityKind?: SouthCityPropKind;
  cityId?: string;
  landmarkKind?: RegionalLandmarkKind;
  /** Só `south-ruin`: a ruína sai em duas camadas (fundo e frente) para o herói passar entre elas; `variant` é o índice 0..3. */
  ruinLayer?: Exclude<RuinLayer, "all">;
  x: number;
  y: number;
  variant: number;
}

/** O que um pintor de cenário recebe: o contexto (já na posição do objeto), o objeto, o relógio da simulação e o espelhamento do objeto. */
export interface SceneryEnv {
  readonly ctx: CanvasRenderingContext2D;
  readonly prop: Scenery;
  readonly time: number;
  /** 1 ou -1, fixo por posição: copas, pedras e decoração espelham para não se repetirem iguais. */
  readonly flip: number;
}
/** Desenha um tipo de objeto de cenário. Cada região entrega o dela e `props/registry.ts` os reúne. */
export type SceneryPainter = (env: SceneryEnv) => void;
