/** Avisos da viagem pelo mapa (ADR 0099). */
export const JOURNEY_MESSAGES = {
  started: (tiles: number): string => `Viagem iniciada: faltam cerca de ${tiles} tiles. Qualquer tecla de andar, um toque no chão ou o botão Cancelar interrompe.`,
  arrived: "Você chegou ao destino.",
  stuck: "Não achei caminho até lá; a viagem foi cancelada.",
  danger: "Viagem interrompida: há perigo por perto.",
  cancelled: "Viagem cancelada.",
  outside: "Só dá para viajar pelo mapa do lado de fora, longe de cavernas e casas.",
  down: "O herói precisa estar de pé para viajar.",
  blocked: "Esse lugar não dá para andar (água ou obstáculo). Escolha outro ponto do mapa.",
  here: "Você já está bem perto desse ponto.",
} as const;
