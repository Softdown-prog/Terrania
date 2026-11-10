# Terrania — guia para humanos e agentes de código

Leia primeiro [docs/INDEX.md](docs/INDEX.md), [architecture/modules.json](architecture/modules.json), [docs/ROADMAP.md](docs/ROADMAP.md) e [docs/ARQUITETURA.md](docs/ARQUITETURA.md). Depois abra somente o índice/documentação da seção envolvida. Nunca suponha que `main`, o backend em produção e a branch experimental sejam equivalentes.

## Antes de alterar um arquivo

1. Identificar **módulo dono**, estado (`active`, `experimental`, `lab`), entrada, consumidores, testes e protocolo impactado no registro.
2. Ler os arquivos estritamente necessários e sua documentação de módulo; registrar a razão da alteração. Não mover pastas inteiras por estética.
3. Implementar **uma microtarefa** com testes de regressão e checagem de dependências; comparar comportamento em desktop e Android quando tocar gameplay/UI.
4. Se mudar estrutura/caminho: atualizar `architecture/modules.json` e executar `npm run architecture:index`. Se mudar contrato, comportamento, risco ou modo de operação: atualizar documentação da seção e, para decisões duradouras, registrar ADR em `docs/adr/`.
5. Checar `npm run architecture:check`, `npm run typecheck`, `npm test`, `npm run build` e testes relevantes adicionais. **Compilar não comprova jogar bem.**
6. Trabalhar na branch designada; **não fazer merge, deploy ou alterações em VPS sem aprovação explícita**. Nunca apagar código legado funcional só para diminuir quantidade de arquivos.

## Contrato de entrega (vale para qualquer IA ou pessoa)

O objetivo é que Claude, ChatGPT/Codex e pessoas entreguem no mesmo padrão, sem um refazer o trabalho do outro. Regras com portão automático ficam em testes; o restante é revisão.

- **Arte procedural:** siga [docs/CONTRATO_ARTE_PROCEDURAL.md](docs/CONTRATO_ARTE_PROCEDURAL.md) (nove camadas, rampa de 3 tons, peça de referência em `src/render/reference/barrelReference.ts`). Toda peça nova é registrada em `tests/helpers/artAssets.ts` e passa em `tests/art-contract.test.ts`. **Não baixe pisos nem altere as regras do contrato para passar**; melhore a peça. Entregue a captura de `npm run art:preview`. O teste verde não prova que ficou bom. O checklist qualitativo está em "Padrão obrigatório da arte procedural", abaixo; os dois valem juntos.
- **Uma microtarefa por entrega,** com teste de regressão que **falhe sem a mudança**. Mostre a saída dos testes; não declare pronto sem ela.
- **TypeScript:** `strict`, `noUncheckedIndexedAccess` e `exactOptionalPropertyTypes` estão ligados; não os enfraqueça. Regras de jogo ficam em `src/engine|actors|world|monsters|npcs`, sem Angular, Phaser, DOM nem rede (conferido por `architecture:check`).
- **Go:** arquivos novos ou alterados devem passar em `gofmt`. Hoje 34 dos 44 arquivos de `cmd`, `engine` e `presence` não passam; reformatar em lote é uma tarefa separada, para não conflitar com trabalho em andamento.
- **Tamanho (orientativo, não bloqueante):** até 400 linhas em `.ts` é preferível; 401–800 gera aviso; acima de 800 recomenda revisão arquitetural; código gerado é avaliado separadamente. A contagem de linhas, sozinha, **não reprova o CI**, não exige dividir uma responsabilidade coesa nem comprimir código. Extraia módulos quando houver ganho real de coesão, acoplamento, legibilidade ou testabilidade. Os portões de tipagem, arquitetura, testes e contratos permanecem obrigatórios. Regras de jogo ficam no motor, não em `src/game/Game.ts` ([ADR 0013](docs/adr/0013-decomposicao-do-game.md); relatório em `tests/file-size-budget.test.ts`).
- **Determinismo:** sem `Math.random`, `Date.now`, `performance.now`, `new Date()` nem `crypto.getRandomValues` em `src/engine`, `src/actors`, `src/world`, `src/monsters`, `src/npcs` e `src/render`; variação por semente (`hashString`, `hash2`) e tempo pelo `dt` da simulação. Portão: `tests/quality-gates.test.ts`.
- **Sem atalhos para ficar verde:** nada de `@ts-ignore`, `@ts-nocheck`, `@ts-expect-error` ou `any` em `src/` e `server/src/`, nem `test.only`/`test.skip`/`todo` nos testes. Pulo condicional por ambiente só entra na lista `CONDITIONAL_SKIPS` de `tests/quality-gates.test.ts`, com motivo.
- **Invariantes do motor:** quem mexe em combate, derrota, experiência ou save confere a lista "Invariantes do motor", abaixo; cada uma tem regressão em `tests/engine-invariants.test.ts`. Bug corrigido vira invariante com teste, na mesma entrega.
- **Texto e docs em português;** identificadores e nomes de arquivo como o módulo já usa.

## Invariantes do motor

Regras que já quebraram uma vez. Valem para a superfície (`OfflineSimulation`) e para a caverna (`CaveRoom`).

- **Herói derrotado só volta por `respawn()`.** Nenhum efeito colateral (subir de nível, comida, poção) tira a vida de zero.
- **Toda derrota é salva no mesmo passo:** `update` devolve `true` quando o herói cai, seja por contato, veneno, queimadura ou espinhos.
- **Superfície e caverna aplicam a mesma fórmula** de dano, defesa e alvos. Alcance, cone e número de alvos vêm de `swordArc`; quem é atingido vem de `swordStrikeTargets` e o dano, o efeito da lâmina e os abates vêm de `resolveSwordStrike` (`src/engine/SwordCombat.ts`). Não copiar esses números nem esse laço para outro arquivo (`tests/sword-strike.test.ts` exige o mesmo abate nos dois cenários).
- **Golpe com alvo escolhido** exige o alvo ao alcance e à vista; só então a lâmina astral completa o arco com até dois vizinhos. Golpe sem alvo (`null`) não fere ninguém.
- **Recarga só é gasta por golpe que sai:** herói atordoado não consome o intervalo da arma.
- **Nada do save vira estado sem normalizar:** números finitos, inteiros e limitados (`normalizeKills`, `normalizeExperience`, `normalizeInventory`...), tanto em `loadLocalSave` quanto no construtor da simulação.

## Fronteiras arquiteturais

- `src/engine/`, `src/actors/`, `src/monsters/`, `src/npcs/` e `src/world/`: regras independentes de Angular, Phaser, DOM e rede. O validador impede imports de UI/renderer nessas pastas.
- `src/app/`: apresenta dados e recebe ações; não contém lógica autoritativa.
- `src/game/`: orquestrador, não um segundo motor ou autoridade de jogo.
- `server/`: backend Node atual; `server-go/` e Rust têm componentes experimentais; não promover por suposição.
- `docs/indexes/`: **gerados**. Não editar à mão; alterar código/registro e regenerar.

## Padrão obrigatório da arte procedural

Checklist qualitativo. A parte mensurável tem portão automático em `tests/art-contract.test.ts` (contrato completo em [docs/CONTRATO_ARTE_PROCEDURAL.md](docs/CONTRATO_ARTE_PROCEDURAL.md)); a peça de referência é `src/render/reference/barrelReference.ts`.

Antes de criar uma nova peça visual, inspecionar um exemplo existente da mesma categoria:
`src/app/item-icon.component.ts` para ícones (silhueta legível, camadas e contorno),
`src/render/scenery.ts` para construções/árvores e `src/render/actors.ts` para personagens.
Não substituir uma peça elaborada por geometria placeholder só para terminar a tarefa.
O número de linhas não é critério de aprovação, mas a **paridade de acabamento**
(material, volume, sombras, iluminação, detalhes secundários, orientação e escala móvel) é.
Para estruturas grandes, separar o *painter* em `src/render/`; a posição,
colisão, seed e gameplay continuam em `src/world/`.

- Derivar variantes de seed/ID estáveis; não consumir `Math.random()` ou gerar
  gradientes e partículas complexas em cada frame.
- Cachear sprites estáticos com chave que inclua a variante e teto de entradas.
- Reutilizar `draw.ts` e o renderizador canônico, sem duplicar Canvas ou motor.
- Exigir teste determinístico e visual/desktop/Android antes do merge; revisar
  o resultado renderizado, além do TypeScript compilado.
- Ao trabalhar em paralelo com outro agente, comparar o estado atual de `main`
  antes de editar, preservar alterações concorrentes e não mesclar com CI vermelho.

## Diagnóstico e recuperação

Consultar [docs/MANUTENCAO.md](docs/MANUTENCAO.md). Índice, testes e MCP ajudam a localizar problemas; não são backup, rollback, telemetria, alta disponibilidade nem prova de capacidade. Tags Git preservam versões de código; dados de jogadores exigirão uma estratégia própria de persistência/backup.

## MCP local para navegação

Quando houver um cliente MCP stdio disponível, inicie `node scripts/mcp/server.mjs` no checkout da branch. Use primeiro `list_modules`, `locate_file` e `find_tests` para reduzir a área de investigação. Consulte [MCP_NAVEGACAO.md](docs/MCP_NAVEGACAO.md). Os resultados não autorizam edição, shell, deploy ou promoção dos laboratórios Go/Rust.
