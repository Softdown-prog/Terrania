import type { Inventory } from "../../Inventory.ts";
import { MAX_COINS } from "../../coins/index.ts";
import { bankInterest } from "./interest.ts";
import { normalizeBank } from "./normalize.ts";
import { emptyBank, type BankState } from "./state.ts";
import type { BankDepositResult, BankMove, BankWithdrawResult } from "./results.ts";

/** A quantia pedida como inteiro não negativo; algo que não é número finito (NaN, infinito) vale zero e nunca chega ao saldo. */
const wanted = (amount: number): number => Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;

/**
 * O banco da Casa da Moeda (ADR 0063): guarda moedas fora da carteira e paga juros. Toda operação paga primeiro os juros devidos
 * (`settle`), para o saldo certo valer na conta; o relógio é o da aventura, passado por quem chama (o motor não lê hora nenhuma).
 */
export class Bank {
  private state: BankState;
  constructor(saved?: unknown, clock = 0) { this.state = saved === undefined ? emptyBank() : normalizeBank(saved, clock); }

  get balance(): number { return this.state.balance; }
  snapshot(): BankState { return this.state; }
  /** Há algo a guardar no save? Quem nunca usou o banco não ganha campo novo. */
  get used(): boolean { return this.state.balance > 0; }

  /** Paga os juros devidos até `clock` e devolve quanto entrou no saldo (o saldo não passa do teto da carteira). */
  settle(clock: number): number {
    const { interest, paidUntil } = bankInterest(this.state.balance, this.state.interestAt, clock);
    const paid = Math.min(interest, MAX_COINS - this.state.balance);
    this.state = { balance: this.state.balance + paid, interestAt: paidUntil };
    return paid;
  }

  /** Guarda até `amount` da carteira (menos se faltar dinheiro ou espaço no saldo). */
  deposit(inventory: Inventory, amount: number, clock: number): BankMove<BankDepositResult> {
    const interest = this.settle(clock);
    const moved = Math.min(wanted(amount), inventory.coins, MAX_COINS - this.state.balance);
    if (moved <= 0) return { result: inventory.coins <= 0 || wanted(amount) <= 0 ? "nothing-to-deposit" : "bank-full", moved: 0, interest };
    inventory.spendCoins(moved);
    this.state = { ...this.state, balance: this.state.balance + moved };
    return { result: "deposited", moved, interest };
  }

  /** Tira até `amount` do saldo para a carteira (menos se faltar saldo ou espaço na carteira). */
  withdraw(inventory: Inventory, amount: number, clock: number): BankMove<BankWithdrawResult> {
    const interest = this.settle(clock);
    const moved = Math.min(wanted(amount), this.state.balance, MAX_COINS - inventory.coins);
    if (moved <= 0) return { result: this.state.balance <= 0 || wanted(amount) <= 0 ? "nothing-to-withdraw" : "wallet-full", moved: 0, interest };
    inventory.addCoins(moved);
    this.state = { ...this.state, balance: this.state.balance - moved };
    return { result: "withdrawn", moved, interest };
  }
}
