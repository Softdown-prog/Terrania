import type { TowerId } from "../../../../world/towers/types.ts";
import { miragemInterior } from "./miragem.ts";
import { solNegroInterior } from "./sol-negro.ts";
import type { TowerInteriorStyle } from "./types.ts";
import { vigiaCaidaInterior } from "./vigia-caida.ts";

export type { TowerInteriorStyle } from "./types.ts";

/** Cada torre tem o seu estilo, no seu arquivo; aqui só se escolhe pelo id. Registro exaustivo. */
export const TOWER_INTERIOR_STYLES: Readonly<Record<TowerId, TowerInteriorStyle>> = {
  "vigia-caida": vigiaCaidaInterior,
  miragem: miragemInterior,
  "sol-negro": solNegroInterior,
};
