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
  const report = runQaBot(args);
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  if (process.argv.includes("--strict") && report.status !== "passed")
    process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 2;
}
