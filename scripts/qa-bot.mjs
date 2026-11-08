import { runExpeditionQa } from "../src/qa/QaExpedition.ts";
import { runNaturalQa } from "../src/qa/QaNatural.ts";
import { runCombatQa } from "../src/qa/QaCombat.ts";
import { runQaBot } from "../src/qa/QaBot.ts";
function integerOption(name) {
  const item = process.argv.slice(2).find(arg => arg.startsWith(name + "="));
  if (!item) return undefined;
  const value = item.slice(name.length + 1);
  if (!/^\d+$/.test(value)) throw new Error("Argumento inválido: " + name);
  return Number(value);
}
try {
  const seed = integerOption("--seed");
  const maxTicks = integerOption("--ticks");
  const args = {};
  if (seed !== undefined) args.seed = seed;
  if (maxTicks !== undefined) args.maxTicks = maxTicks;
  const exploration = runQaBot(args);
  const combat = runCombatQa(exploration.seed);
  const natural = runNaturalQa(exploration.seed);
  const expedition = runExpeditionQa({ seed: exploration.seed });
  const scenarios = [exploration, combat, natural, expedition];
  const status = scenarios.every(item => item.status === "passed")
    ? "passed" : scenarios.some(item => item.status === "failed")
      ? "failed" : "incomplete";
  const report = {
    schemaVersion: 6,
    botId: exploration.botId,
    seed: exploration.seed,
    status,
    exploration,
    combat,
    natural,
    expedition,
  };
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  if (process.argv.includes("--strict") && status !== "passed")
    process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 2;
}
