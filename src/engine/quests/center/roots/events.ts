/** O que a conversa com Aela mudou (ou explicou); o jogo traduz cada evento em falas (`game/messages/center/rootsMessages.ts`). */
export type RootsEvent = "accepted" | "reminder" | "reported" | "report-wallet-full";

export interface RootsTalkResult {
  readonly event: RootsEvent | null;
  /** A bolsa ou o estado mudou: quem chama salva e atualiza o HUD. */
  readonly changed: boolean;
}
