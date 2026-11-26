/** O que o kit de anatomia (pernas, tronco) lê de uma paleta: as três cores do volume. Paletas de montaria e de criatura servem sem adaptador. */
export type KitPalette = Readonly<{ base: string; dark: string; light: string }>;
/** O contorno comum do kit e o brilho do material. */
export const EDGE = "#142a2a", GLINT = "#fff6dc";
