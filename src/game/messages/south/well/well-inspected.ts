import { WELL_SAMPLE_MATERIAL } from "../../../../engine/quests/south/well/index.ts";

/** O herói examina a água do poço pela placa. */
export const WELL_INSPECTED: readonly string[] = [
  "Você desce um frasco na corda. A água sobe espessa, sem reflexo, com cheiro de brejo.",
  `Há algo tóxico misturado nela. Ixtal, o Destilador, pode comparar com ${WELL_SAMPLE_MATERIAL} do brejo (a hidra do brejo a deixa cair).`,
];
