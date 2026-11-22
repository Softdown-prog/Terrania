/**
 * As regras do banco da Casa da Moeda (ADR 0063), todas em números inteiros para o resultado ser o mesmo em qualquer tela.
 * Juros: 5 por mil (0,5%) a cada 10 minutos de jogo, só sobre os primeiros 10.000 Terrania Gold do saldo.
 */
export const BANK_PERIOD_SECONDS = 600;
export const BANK_RATE_PER_MILLE = 5;
/** Só os primeiros 10.000 do saldo rendem (no máximo 300 por hora). */
export const BANK_INTEREST_CAP = 10_000;
/** Entre duas visitas rendem no máximo 24 horas de jogo (144 períodos de 10 minutos). */
export const BANK_MAX_PERIODS = 144;
/** Valores dos botões da tela, em Terrania Gold (o outro é "tudo"). */
export const BANK_STEPS: readonly number[] = [100, 1_000];
