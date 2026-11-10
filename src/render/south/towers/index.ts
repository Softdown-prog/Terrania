import type { TowerId } from "../../../world/towers/types.ts";
import { paintTorreDaMiragem } from "./miragem.ts";
import { paintTorreDoSolNegro } from "./sol-negro.ts";
import { paintTorreDoVigiaCaida } from "./vigia-caida.ts";

/** Cada torre tem o seu pintor, no seu arquivo; aqui só se escolhe o certo pelo id. Registro exaustivo.
 * Origem (0,0) = contato do centro da frente da torre. */
export const TOWER_PAINTERS: Readonly<Record<TowerId, (c: CanvasRenderingContext2D) => void>> = {
  "vigia-caida": paintTorreDoVigiaCaida,
  miragem: paintTorreDaMiragem,
  "sol-negro": paintTorreDoSolNegro,
};
