import test from "node:test";
import assert from "node:assert/strict";
import { confirmWorkerTarget, domain } from "../scripts/resolve-worker-target.mjs";

const target = { hostname: domain, service: "terrania", environment: "production", enabled: true };
test("publica somente no Worker associado ao domínio de produção", () => {
  assert.equal(confirmWorkerTarget([target], "terrania"), "terrania");
});
test("recusa destino ausente, ambíguo, de outro Worker ou desabilitado", () => {
  for (const entries of [[], [target, target], [{ ...target, service: "outro" }],
    [{ ...target, environment: "staging" }], [{ ...target, enabled: false }],
    [{ ...target, hostname: "outro.analysepro.com" }], null]) {
    assert.throws(() => confirmWorkerTarget(entries, "terrania"));
  }
});
