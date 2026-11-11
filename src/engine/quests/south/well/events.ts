import type { WellWitness } from "./witness.ts";

/** O que a conversa mudou (ou explicou); o jogo traduz cada evento em falas (`game/messages/south/well/`). */
export type WellEvent =
  | `heard:${WellWitness}`
  | "sign-needs-witnesses" | "well-inspected"
  | "analysis-needs-sample" | "analyzed"
  | "reported" | "report-wallet-full";

export interface WellTalkResult {
  readonly event: WellEvent | null;
  /** A bolsa ou o estado mudou: quem chama salva e atualiza o HUD. */
  readonly changed: boolean;
}
