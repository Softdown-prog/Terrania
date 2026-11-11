import { INVENTORY_FEEDBACK } from "../messages/inventoryFeedback.ts";
import type { ShopResult } from "./shopContext.ts";

/** Resultado de uma ação a partir do texto padrão do desfecho; `changed` diz se a bolsa mudou. */
export const say = (outcome: keyof typeof INVENTORY_FEEDBACK, changed = false): ShopResult =>
  ({ message: INVENTORY_FEEDBACK[outcome], changed });
