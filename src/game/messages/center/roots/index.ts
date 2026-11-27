import type { RootsEvent } from "../../../../engine/quests/center/roots/index.ts";
import { ACCEPTED } from "./accepted.ts";
import { REMINDER } from "./reminder.ts";
import { REPORT_WALLET_FULL } from "./report-wallet-full.ts";
import { REPORTED } from "./reported.ts";

/** Falas da missão "A Raiz Velha" (ADR 0104), acrescentadas ao fim do diálogo de Aela; cada evento tem o seu arquivo. Só dados: a regra está em `RootsQuest`. */
export const ROOTS_LINES: Record<RootsEvent, readonly string[]> = {
  accepted: ACCEPTED,
  reminder: REMINDER,
  reported: REPORTED,
  "report-wallet-full": REPORT_WALLET_FULL,
};
