/**
 * Aparência do interior de uma caverna (ADR 0032). É só visual: a planta, a colisão e os monstros
 * não dependem dela. `plain` é o interior de sempre; `luminous` é a Gruta Luminosa.
 */
export type CaveStyle = "plain" | "luminous";
