import { LEATHER_SET } from "./set.ts";

/** O anel liso de chifre polido, só enfeite (defesa 0): conjunto Couro Cru (ADR 0123), números propostos (o dono ajusta aqui). */
export const HORN_RING = { slot: "ring", name: "Anel de Chifre", defense: 0, ...LEATHER_SET } as const;
