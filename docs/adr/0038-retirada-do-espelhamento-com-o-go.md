# ADR 0038 — Retirada do espelhamento TypeScript ↔ Go

**Estado:** entregue em 2026-11-11, direto na `main` por pedido do dono ("esse espelhamento com Go não é necessário mais").

## Contexto

O laboratório Go (`server-go/`) mantinha uma cópia das regras do jogo (terreno, regiões, movimento, combate, IA) e um **espelhamento** com o TypeScript: scripts que geravam uma saída de referência a partir de `src/` (`server-go/scripts/ts-reference.mjs` e `gameplay-reference.mjs`), dois programas Go que geravam a saída equivalente (`cmd/parity` e `cmd/gameplay-parity`), um comparador (`compare.mjs`) e três workflows que exigiam que as saídas fossem idênticas. Isso obrigava a pensar no Go a cada mudança de mundo e já tinha forçado cuidados (sistemas próprios "para não mexer no que o Go espelha"). O jogo é solo e roda no navegador; o Go é um laboratório fora do produto (ADR 0010 e 0012).

## Decisões

1. **Apagados:** `server-go/scripts/ts-reference.mjs`, `gameplay-reference.mjs` e `compare.mjs`; `server-go/cmd/parity/` e `server-go/cmd/gameplay-parity/`.
2. **CI:** saem os passos de paridade de `go-engine.yml`, `deploy-go-shadow.yml` e `pre-main-suite.yml`. No `pre-main-suite.yml`, o job passa a se chamar **"1/6 Go, cluster, autoscale"** (antes terminava em ", parity") e perde o `setup-node`, que só servia aos scripts. **Atenção:** se o repositório tiver verificações obrigatórias configuradas por nome no GitHub, o nome antigo desse job precisa ser trocado lá.
3. **Textos:** comentários, READMEs, documentos e o registro de módulos deixam de dizer que o Go espelha ou precisa de paridade com o TypeScript. A cópia antiga da geração do mundo em `server-go/engine/world_regions.go` e `world.go` fica, com aviso de que **pode divergir do jogo**. Os ADRs antigos ficam como estão (são histórico).
4. **Uma proteção é mantida, com o nome certo:** o teste `tests/south-sites.test.ts` que se chamava "paridade com o Go" nunca dependeu do Go; ele guarda amostras de tiles e marcos para que a geração do mundo não mude o mapa dos saves existentes. Passou a se chamar "geração estável".
5. **Fica como está:** o laboratório Go em si (worker, gateway, cluster, autoscale, capacidade, presença), a medição `perf-compare.mjs` (compara Node e Go só pelo `/health`, sem afirmar equivalência de motores) e o espelho **Go ↔ Rust** da arena (`cmd/spatial-reference` e `rust/`), que são outra coisa.

## Consequências

- Mudar o mundo, a colisão, o combate ou os marcos no TypeScript **não exige mais** olhar o Go; os cuidados do tipo "sistema próprio para não mexer no que o Go espelha" deixam de existir como regra.
- O Go pode divergir do jogo. Se um dia o Go voltar a ser produto, a paridade precisará ser refeita ou a cópia, descartada.

## Verificação

- `go build ./...`, `go vet ./...` e `go test` de `engine`, `cmd` e `presence` passam sem os dois programas apagados.
- Os 14 workflows continuam com YAML válido, e nenhum arquivo do repositório referencia os scripts ou programas removidos.
- `architecture:check`, `typecheck`, `npm test`, `build` e testes do servidor (ver a entrega).

## Limites

- `engine/player.go` e `engine/world_regions.go` já não passavam em `gofmt` antes; só os comentários foram mudados (sem reformatar, que é tarefa separada pelo `AGENTS.md`).
- O Go ainda tem a cópia antiga do mundo; apagá-la (ou o laboratório inteiro) é outra decisão.
