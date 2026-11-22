/** O que o save guarda do banco: o saldo e até quando (relógio da aventura, em segundos) os juros já foram pagos. */
export interface BankState {
  readonly balance: number;
  readonly interestAt: number;
}
export const emptyBank = (): BankState => ({ balance: 0, interestAt: 0 });
