import test from "node:test";
import assert from "node:assert/strict";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { MAX_COINS } from "../src/engine/character/coins/index.ts";
import { BANK_INTEREST_CAP, BANK_MAX_PERIODS, BANK_PERIOD_SECONDS, BANK_RATE_PER_MILLE, BANK_STEPS, Bank, bankInterest, emptyBank, normalizeBank } from "../src/engine/character/center/bank/index.ts";
import { loadLocalSave, saveLocal } from "../src/storage/localSave.ts";

/**
 * O banco da Casa da Moeda (ADR 0063): juros de 0,5% a cada 10 minutos de jogo sobre os primeiros 10.000 do saldo, no máximo 24 h de
 * acúmulo entre visitas, depósito e saque nos limites da carteira e do cofre, e o saldo e o relógio indo e voltando pelo save.
 */
const SEED = 842136;
const wallet = (coins: number) => { const sim = new OfflineSimulation(SEED); sim.inventory.addCoins(coins); return sim.inventory; };

test("as regras do banco são as combinadas com o dono: 5 por mil a cada 600 s, teto de 10.000 rendendo, 144 períodos, botões de 100 e 1.000", () => {
  assert.deepEqual([BANK_PERIOD_SECONDS, BANK_RATE_PER_MILLE, BANK_INTEREST_CAP, BANK_MAX_PERIODS], [600, 5, 10_000, 144]);
  assert.equal(BANK_MAX_PERIODS * BANK_PERIOD_SECONDS, 24 * 3600, "144 períodos são um dia de jogo");
  assert.deepEqual([...BANK_STEPS], [100, 1_000]);
});

test("juros: por período inteiro, simples, só sobre os primeiros 10.000 e arredondados para baixo (valores contados à mão)", () => {
  const at = (balance: number, from: number, to: number) => bankInterest(balance, from, to);
  assert.deepEqual(at(1_000, 0, 599), { interest: 0, paidUntil: 0 }, "menos de um período não rende");
  assert.deepEqual(at(1_000, 0, 600), { interest: 5, paidUntil: 600 }, "0,5% de 1.000");
  assert.deepEqual(at(1_000, 0, 1_799), { interest: 10, paidUntil: 1_200 }, "dois períodos; a sobra do terceiro fica para a próxima vez");
  assert.deepEqual(at(1_000, 500, 1_100), { interest: 5, paidUntil: 1_100 }, "conta a partir de quando os juros foram pagos");
  assert.equal(at(20_000, 0, 600).interest, 50, "só os primeiros 10.000 rendem: 0,5% de 10.000");
  assert.equal(at(10_000, 0, 3_600).interest, 300, "no máximo 300 por hora");
  assert.equal(at(100, 0, 600).interest, 0, "meio Terrania Gold arredonda para baixo");
  assert.equal(at(100, 0, 1_200).interest, 1, "dois períodos de 100 já dão 1");
  assert.equal(at(1_000_000, 0, 600).interest, 50, "um saldo enorme não rende mais que o teto");
});

test("juros: um dia inteiro de jogo é o máximo acumulado entre visitas; o que passa disso se perde e o relógio recomeça", () => {
  const day = 24 * 3600;
  assert.deepEqual(bankInterest(10_000, 0, day), { interest: 7_200, paidUntil: day }, "144 períodos de 50");
  assert.deepEqual(bankInterest(10_000, 0, day + 599), { interest: 7_200, paidUntil: day }, "ainda 144 períodos");
  assert.deepEqual(bankInterest(10_000, 0, day * 3), { interest: 7_200, paidUntil: day * 3 }, "três dias fora rendem só um; o resto se perde");
  assert.deepEqual(bankInterest(10_000, 0, day + 600), { interest: 7_200, paidUntil: day + 600 }, "o 145º período já passa do limite");
});

test("juros: sem saldo nada rende e o relógio recomeça agora; relógio para trás ou parado não rende", () => {
  assert.deepEqual(bankInterest(0, 0, 5_000), { interest: 0, paidUntil: 5_000 });
  assert.deepEqual(bankInterest(0, 9_000, 5_000), { interest: 0, paidUntil: 9_000 }, "nunca anda para trás");
  assert.deepEqual(bankInterest(1_000, 500, 400), { interest: 0, paidUntil: 500 });
  assert.deepEqual(bankInterest(1_000, 500, 500), { interest: 0, paidUntil: 500 });
});

test("depósito: guarda o que cabe, nunca mais que a carteira tem nem que o cofre comporta, e diz por que recusou", () => {
  const inventory = wallet(250), bank = new Bank(undefined, 0);
  assert.deepEqual(bank.deposit(inventory, 100, 1_000), { result: "deposited", moved: 100, interest: 0 });
  assert.deepEqual([bank.balance, inventory.coins], [100, 150]);
  assert.deepEqual(bank.deposit(inventory, 1_000, 1_000), { result: "deposited", moved: 150, interest: 0 }, "pede mais do que tem: guarda só o que tem");
  assert.deepEqual([bank.balance, inventory.coins], [250, 0]);
  assert.deepEqual(bank.deposit(inventory, 50, 1_000), { result: "nothing-to-deposit", moved: 0, interest: 0 }, "carteira vazia");
  inventory.addCoins(10);
  for (const bad of [0, -5, Number.NaN]) assert.equal(bank.deposit(inventory, bad, 1_000).result, "nothing-to-deposit", `quantia ${bad}`);
  assert.equal(inventory.coins, 10, "as recusas não mexem na carteira");
  assert.equal(bank.deposit(inventory, 7.9, 1_000).moved, 7, "quantia quebrada arredonda para baixo");
  const nearlyFull = new Bank({ balance: MAX_COINS - 3, interestAt: 0 }, 0);
  assert.deepEqual(nearlyFull.deposit(wallet(10), 10, 0), { result: "deposited", moved: 3, interest: 0 }, "só cabe o que falta para o teto");
  const full = new Bank({ balance: MAX_COINS, interestAt: 0 }, 0), purse = wallet(5);
  assert.deepEqual(full.deposit(purse, 5, 0), { result: "bank-full", moved: 0, interest: 0 }); assert.equal(purse.coins, 5);
});

test("saque: tira o que há no saldo e cabe na carteira, e diz por que recusou", () => {
  const inventory = wallet(0), bank = new Bank({ balance: 500, interestAt: 0 }, 0);
  assert.deepEqual(bank.withdraw(inventory, 200, 0), { result: "withdrawn", moved: 200, interest: 0 });
  assert.deepEqual([bank.balance, inventory.coins], [300, 200]);
  assert.deepEqual(bank.withdraw(inventory, 10_000, 0), { result: "withdrawn", moved: 300, interest: 0 }, "pede mais do que há: tira só o saldo");
  assert.deepEqual([bank.balance, inventory.coins], [0, 500]);
  assert.deepEqual(bank.withdraw(inventory, 1, 0), { result: "nothing-to-withdraw", moved: 0, interest: 0 }, "sem saldo");
  const rich = new Bank({ balance: 40, interestAt: 0 }, 0), purse = wallet(MAX_COINS - 10);
  assert.deepEqual(rich.withdraw(purse, 40, 0), { result: "withdrawn", moved: 10, interest: 0 }, "só cabe o que falta na carteira");
  assert.deepEqual([rich.balance, purse.coins], [30, MAX_COINS]);
  assert.deepEqual(rich.withdraw(purse, 5, 0), { result: "wallet-full", moved: 0, interest: 0 }); assert.equal(rich.balance, 30);
  assert.equal(bank.withdraw(inventory, 0, 0).result, "nothing-to-withdraw");
});

test("toda operação paga primeiro os juros devidos, e o saldo cresce sem mexer na carteira", () => {
  const inventory = wallet(0), bank = new Bank({ balance: 1_000, interestAt: 0 }, 0);
  assert.deepEqual(bank.withdraw(inventory, 400, 600), { result: "withdrawn", moved: 400, interest: 5 }, "os 5 de juros entram antes do saque");
  assert.deepEqual([bank.balance, inventory.coins], [605, 400]);
  const again = new Bank({ balance: 1_000, interestAt: 0 }, 0), purse = wallet(100);
  assert.deepEqual(again.deposit(purse, 100, 1_200), { result: "deposited", moved: 100, interest: 10 });
  assert.deepEqual([again.balance, purse.coins], [1_110, 0]);
  const settle = new Bank({ balance: 1_000, interestAt: 0 }, 0);
  assert.equal(settle.settle(600), 5); assert.equal(settle.settle(600), 0, "pagar duas vezes no mesmo instante não rende de novo"); assert.equal(settle.balance, 1_005);
  const capped = new Bank({ balance: MAX_COINS - 2, interestAt: 0 }, 0);
  assert.equal(capped.settle(86_400), 2, "os juros nunca passam o teto do saldo"); assert.equal(capped.balance, MAX_COINS);
});

test("o primeiro depósito começa o relógio dos juros nele: o tempo antes dele não rende", () => {
  const inventory = wallet(1_000), bank = new Bank(undefined, 0);
  bank.deposit(inventory, 1_000, 10_000);
  assert.equal(bank.snapshot().interestAt, 10_000, "os juros contam a partir do depósito");
  assert.equal(bank.settle(10_599), 0); assert.equal(bank.settle(10_600), 5);
  bank.withdraw(inventory, 10_000, 10_600);
  assert.equal(bank.balance, 0); bank.deposit(inventory, 100, 50_000);
  assert.equal(bank.snapshot().interestAt, 50_000, "tirar tudo e depositar de novo recomeça o relógio, sem render pelo intervalo");
});

test("banco do save: lixo vira conta vazia, o saldo respeita o teto e a data dos juros nunca fica no futuro", () => {
  assert.deepEqual(emptyBank(), { balance: 0, interestAt: 0 });
  for (const bad of [undefined, null, 5, "x", [], [1], true]) assert.deepEqual(normalizeBank(bad, 100), { balance: 0, interestAt: 0 }, String(bad));
  assert.deepEqual(normalizeBank({ balance: -5, interestAt: -3 }, 100), { balance: 0, interestAt: 0 });
  assert.deepEqual(normalizeBank({ balance: Number.NaN, interestAt: Number.POSITIVE_INFINITY }, 100), { balance: 0, interestAt: 0 });
  assert.deepEqual(normalizeBank({ balance: 1.5, interestAt: "7" }, 100), { balance: 0, interestAt: 0 }, "saldo quebrado e data em texto");
  assert.deepEqual(normalizeBank({ balance: Number.MAX_SAFE_INTEGER, interestAt: 50 }, 100), { balance: MAX_COINS, interestAt: 50 });
  assert.deepEqual(normalizeBank({ balance: 700, interestAt: 9_999 }, 100), { balance: 700, interestAt: 100 }, "uma data no futuro volta ao relógio atual");
  assert.deepEqual(normalizeBank({ balance: 700, interestAt: 40 }, 100), { balance: 700, interestAt: 40 });
  assert.equal(new Bank({ balance: 5, interestAt: 0 }, 0).used, true); assert.equal(new Bank(undefined, 0).used, false); assert.equal(new Bank({ balance: 0, interestAt: 80 }, 100).used, false);
});

test("no jogo: o saldo e o relógio vão para o save e voltam, e quem nunca usou o banco não ganha campo novo", () => {
  const fresh = new OfflineSimulation(SEED);
  assert.equal("bank" in fresh.snapshot(), false, "save sem banco continua igual ao de antes"); assert.equal(fresh.bank.balance, 0);
  const saved = { ...fresh.snapshot(), time: 1_200, bank: { balance: 2_000, interestAt: 600 } };
  const sim = new OfflineSimulation(SEED, saved);
  assert.equal(sim.time, 1_200); assert.equal(sim.bank.balance, 2_000);
  assert.deepEqual(sim.snapshot().bank, { balance: 2_000, interestAt: 600 });
  assert.equal(sim.bank.settle(sim.time), 10, "um período de 600 s sobre 2.000 a 0,5%");
  assert.equal(new OfflineSimulation(SEED + 1, saved).bank.balance, 0, "outro mundo não herda o banco");
  assert.equal(new OfflineSimulation(SEED, { ...saved, bank: { balance: 500, interestAt: 99_999 } }).bank.snapshot().interestAt, 1_200, "data no futuro volta ao relógio");
  const empty = new OfflineSimulation(SEED, { ...saved, bank: { balance: 0, interestAt: 300 } });
  assert.equal("bank" in empty.snapshot(), false, "conta zerada não ocupa espaço no save");
});

test("save do navegador: o relógio da aventura e o banco sobrevivem a fechar e abrir o jogo (os juros contam pelo relógio)", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); } } });
  try {
    const first = new OfflineSimulation(SEED, { ...new OfflineSimulation(SEED).snapshot(), time: 3_600.25, bank: { balance: 9_000, interestAt: 1_200 } });
    saveLocal(first.snapshot());
    const loaded = loadLocalSave()!;
    assert.equal(loaded.time, 3_600.25, "o relógio volta com o save"); assert.deepEqual(loaded.bank, { balance: 9_000, interestAt: 1_200 });
    const second = new OfflineSimulation(SEED, loaded);
    assert.equal(second.time, 3_600.25); assert.equal(second.bank.settle(second.time), 9_000 * 5 * 4 / 1000, "quatro períodos inteiros desde 1.200 s");
    // save sem relógio nem banco (o de antes): começa do zero, sem inventar nada
    store.set("terrania-origins-v1", JSON.stringify({ seed: SEED, x: 16, y: 16, hp: 50, kills: 0, defeated: [] }));
    const old = loadLocalSave()!;
    assert.equal("time" in old, false); assert.equal("bank" in old, false); assert.equal(new OfflineSimulation(SEED, old).time, 0);
    // lixo no banco e no relógio vira conta vazia e relógio zero; data de juros no futuro volta ao relógio
    store.set("terrania-origins-v1", JSON.stringify({ seed: SEED, x: 16, y: 16, hp: 50, kills: 0, defeated: [], time: "abc", bank: { balance: "muito", interestAt: -1 } }));
    const junk = loadLocalSave()!; assert.equal("time" in junk, false); assert.equal("bank" in junk, false);
    store.set("terrania-origins-v1", JSON.stringify({ seed: SEED, x: 16, y: 16, hp: 50, kills: 0, defeated: [], time: 100, bank: { balance: 800, interestAt: 5_000 } }));
    assert.deepEqual(loadLocalSave()!.bank, { balance: 800, interestAt: 100 });
  } finally {
    if (original) Object.defineProperty(globalThis, "localStorage", original); else Reflect.deleteProperty(globalThis, "localStorage");
  }
});

test("quantia que não é número (NaN, infinito) nunca chega ao saldo nem à carteira", () => {
  const inventory = wallet(100), bank = new Bank({ balance: 50, interestAt: 0 }, 0);
  for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    assert.equal(bank.deposit(inventory, bad, 0).result, "nothing-to-deposit", `depósito de ${bad}`);
    assert.equal(bank.withdraw(inventory, bad, 0).result, "nothing-to-withdraw", `saque de ${bad}`);
  }
  assert.deepEqual([bank.balance, inventory.coins], [50, 100], "nada mudou");
});
