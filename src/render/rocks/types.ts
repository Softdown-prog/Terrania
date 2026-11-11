/**
 * Estilos de pedra (ADR 0035). Cada estilo tem o seu pintor; o bioma do tile escolhe qual vai para o chão.
 * `moss` é a pedra de sempre (cinza com musgo); `sandstone` é a do deserto (estratos, erosão do vento, areia).
 */
export type RockStyle = "moss" | "sandstone";

/** Quantos formatos cada estilo tem; a variação do tile escolhe um deles. */
export const ROCK_VARIANTS = 6;
