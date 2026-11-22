import { BANKER_ID } from "../../../npcs/center/capital/index.ts";
import { nearestNpc } from "../../../world/npcs.ts";
import type { OfflineSimulation } from "../../../engine/OfflineSimulation.ts";
import { BANK_DEPOSIT_TEXT, BANK_TOO_FAR, BANK_UNAVAILABLE, BANK_WITHDRAW_TEXT, bankDeposited, bankGreeting, bankWithdrawn, interestLine } from "../../messages/center/bank.ts";
import type { ShopContext, ShopResult } from "../shopContext.ts";

/** Quanto mover: um valor em Terrania Gold ou tudo o que houver. */
export type BankAmount = number | "all";

const nearBanker = (sim: OfflineSimulation): boolean => nearestNpc(sim.player.x, sim.player.y)?.id === BANKER_ID;
const refused = ({ sim, inInterior, menuOpen }: ShopContext): ShopResult | null =>
  inInterior || !menuOpen || !nearBanker(sim) ? { message: BANK_TOO_FAR, changed: false }
    : sim.awaitingRespawn || sim.player.hp <= 0 ? { message: BANK_UNAVAILABLE, changed: false } : null;

/** Guardar moedas no banco, com o diálogo aberto e ao lado do banqueiro. Os juros devidos são pagos antes (ADR 0063). */
export function bankDeposit(context: ShopContext, amount: BankAmount): ShopResult {
  const no = refused(context);
  if (no) return no;
  const { sim } = context;
  const move = sim.bank.deposit(sim.inventory, amount === "all" ? sim.inventory.coins : amount, sim.time);
  const changed = move.interest > 0 || move.moved > 0;
  return { message: interestLine(move.interest) + (move.result === "deposited" ? bankDeposited(move.moved, sim.bank.balance) : BANK_DEPOSIT_TEXT[move.result]), changed };
}

/** Retirar moedas do banco, com as mesmas condições do depósito. */
export function bankWithdraw(context: ShopContext, amount: BankAmount): ShopResult {
  const no = refused(context);
  if (no) return no;
  const { sim } = context;
  const move = sim.bank.withdraw(sim.inventory, amount === "all" ? sim.bank.balance : amount, sim.time);
  const changed = move.interest > 0 || move.moved > 0;
  return { message: interestLine(move.interest) + (move.result === "withdrawn" ? bankWithdrawn(move.moved, sim.bank.balance) : BANK_WITHDRAW_TEXT[move.result]), changed };
}

/** Ao começar a conversa com o banqueiro: paga os juros devidos e devolve a linha extra do diálogo (ou `null` se nada rendeu e não há saldo). */
export function bankOnTalk(sim: OfflineSimulation): { readonly line: string | null; readonly changed: boolean } {
  const interest = sim.bank.settle(sim.time);
  return { line: interest > 0 || sim.bank.balance > 0 ? bankGreeting(interest, sim.bank.balance) : null, changed: interest > 0 };
}
