export type BankDepositResult = "deposited" | "nothing-to-deposit" | "bank-full";
export type BankWithdrawResult = "withdrawn" | "nothing-to-withdraw" | "wallet-full";
/** Quanto saiu da carteira/entrou no saldo (depósito) ou o contrário (saque), mais os juros pagos antes da operação. */
export interface BankMove<R> { readonly result: R; readonly moved: number; readonly interest: number }
