import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

test("catálogo de módulos e índices estão sincronizados; domínio não importa UI", () => {
  const result = spawnSync(process.execPath, ["scripts/index-project.mjs", "--check"], {
    cwd: process.cwd(), encoding: "utf8", timeout: 15_000,
  });
  assert.equal(result.status, 0, (result.stdout ?? "") + (result.stderr ?? ""));
  const registry: unknown = JSON.parse(readFileSync("architecture/modules.json", "utf8"));
  assert.ok(registry && typeof registry === "object" && "schemaVersion" in registry);
});
