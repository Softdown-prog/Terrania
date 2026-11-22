import { BANK_INTEREST_CAP, BANK_MAX_PERIODS, BANK_PERIOD_SECONDS, BANK_RATE_PER_MILLE } from "./constants.ts";

export interface InterestOutcome {
  /** Quanto rendeu, em Terrania Gold. */
  readonly interest: number;
  /** Até quando os juros ficam pagos (relógio da aventura): sobra de período se mantém; mais de 24 h se perde. */
  readonly paidUntil: number;
}

/**
 * Juros devidos desde `interestAt` até `clock`: simples, sobre o saldo (limitado ao teto que rende), por períodos inteiros e no máximo
 * 24 h de jogo. Sem saldo, nada rende e o relógio dos juros recomeça agora (o primeiro depósito começa a contar a partir dele).
 */
export function bankInterest(balance: number, interestAt: number, clock: number): InterestOutcome {
  if (balance <= 0 || clock <= interestAt) return { interest: 0, paidUntil: balance <= 0 ? Math.max(clock, interestAt) : interestAt };
  const elapsed = Math.floor((clock - interestAt) / BANK_PERIOD_SECONDS);
  const periods = Math.min(BANK_MAX_PERIODS, elapsed);
  const interest = Math.floor(Math.min(balance, BANK_INTEREST_CAP) * BANK_RATE_PER_MILLE * periods / 1000);
  const paidUntil = elapsed > BANK_MAX_PERIODS ? clock : interestAt + periods * BANK_PERIOD_SECONDS;
  return { interest, paidUntil };
}
