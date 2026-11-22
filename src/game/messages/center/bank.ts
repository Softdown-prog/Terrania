import { describeCoins } from "../../../engine/character/coins/index.ts";
import type { BankDepositResult, BankWithdrawResult } from "../../../engine/character/center/bank/index.ts";

/** As falas do banqueiro da capital (ADR 0063): o desfecho de cada operação, sempre com o saldo que ficou na conta. */
const balanceLine = (balance: number): string => ` Saldo na conta: ${describeCoins(balance)}.`;
export const interestLine = (interest: number): string => interest > 0 ? `Juros pagos: ${describeCoins(interest)}. ` : "";

export const BANK_DEPOSIT_TEXT: Readonly<Record<Exclude<BankDepositResult, "deposited">, string>> = {
  "nothing-to-deposit": "O senhor não tem moedas na carteira para guardar.",
  "bank-full": "A conta já chegou ao limite do cofre: não cabe mais nada.",
};
export const BANK_WITHDRAW_TEXT: Readonly<Record<Exclude<BankWithdrawResult, "withdrawn">, string>> = {
  "nothing-to-withdraw": "Não há saldo na conta para retirar.",
  "wallet-full": "A carteira do senhor está cheia: não cabe mais nada nela.",
};
export const bankDeposited = (moved: number, balance: number): string => `Mestre Aurélio guardou ${describeCoins(moved)}.${balanceLine(balance)}`;
export const bankWithdrawn = (moved: number, balance: number): string => `Mestre Aurélio entregou ${describeCoins(moved)}.${balanceLine(balance)}`;
export const BANK_TOO_FAR = "O banqueiro precisa estar ao seu lado, com a conversa aberta, para mexer na conta.";
export const BANK_UNAVAILABLE = "Agora não é possível mexer na conta.";
export const bankGreeting = (interest: number, balance: number): string => `${interestLine(interest)}Saldo na conta: ${describeCoins(balance)}.`.trim();
