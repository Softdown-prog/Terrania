import { RESPAWN_POINTS, type RespawnPointId } from "../../../engine/character/center/shrine/index.ts";

/** As falas da sacerdotisa do Templo ao mudar o lugar de renascimento (ADR 0064). */
export const SHRINE_TOO_FAR = "A sacerdotisa precisa estar ao seu lado, com a conversa aberta, para consagrar o lugar.";
export const SHRINE_UNAVAILABLE = "Agora não é possível consagrar um lugar.";
export const shrineChosen = (id: RespawnPointId): string =>
  id === "capital-temple" ? "Irmã Maelis consagrou o Templo da Concórdia: é aqui, à porta do templo, que o senhor vai renascer."
    : "Irmã Maelis abençoou o seu retorno à Vila da Travessia: é lá que o senhor vai renascer.";
export const shrineAlready = (id: RespawnPointId): string => `O senhor já renasce em ${RESPAWN_POINTS[id].name}.`;
