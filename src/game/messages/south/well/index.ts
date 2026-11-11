import type { WellEvent } from "../../../../engine/quests/south/well/index.ts";
import { ANALYSIS_NEEDS_SAMPLE } from "./analysis-needs-sample.ts";
import { ANALYZED } from "./analyzed.ts";
import { HEARD_GORRAK } from "./heard-gorrak.ts";
import { HEARD_KHEMET } from "./heard-khemet.ts";
import { HEARD_SYLRAEL } from "./heard-sylrael.ts";
import { REPORT_WALLET_FULL } from "./report-wallet-full.ts";
import { REPORTED } from "./reported.ts";
import { SIGN_NEEDS_WITNESSES } from "./sign-needs-witnesses.ts";
import { WELL_INSPECTED } from "./well-inspected.ts";

/**
 * Falas da missão "A Água Escura" (ADR 0031), acrescentadas ao fim do diálogo do NPC; cada evento tem o
 * seu arquivo. Só dados: a regra de quando cada uma aparece está em `WellInvestigation`.
 */
export const WELL_LINES: Record<WellEvent, readonly string[]> = {
  "heard:south-gorrak": HEARD_GORRAK,
  "heard:south-khemet": HEARD_KHEMET,
  "heard:south-sylrael": HEARD_SYLRAEL,
  "sign-needs-witnesses": SIGN_NEEDS_WITNESSES,
  "well-inspected": WELL_INSPECTED,
  "analysis-needs-sample": ANALYSIS_NEEDS_SAMPLE,
  "analyzed": ANALYZED,
  "reported": REPORTED,
  "report-wallet-full": REPORT_WALLET_FULL,
};
