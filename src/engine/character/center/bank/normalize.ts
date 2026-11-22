import { normalizeCoins } from "../../coins/index.ts";
import type { BankState } from "./state.ts";

/** Banco vindo do save (ou de qualquer lugar): saldo inteiro de 0 ao teto da carteira e data de juros finita, nunca no futuro. */
export function normalizeBank(value: unknown, clock: number): BankState {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return { balance: 0, interestAt: 0 };
  const raw = value as { balance?: unknown; interestAt?: unknown };
  const at = typeof raw.interestAt === "number" && Number.isFinite(raw.interestAt) && raw.interestAt > 0 ? raw.interestAt : 0;
  return { balance: normalizeCoins(raw.balance), interestAt: Math.min(at, Math.max(0, clock)) };
}
