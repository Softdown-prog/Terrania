# Qualidade do projeto

**Papel:** Testes de regras TypeScript e testes E2E com Playwright para desktop e Android.

**Ponto de entrada:** consulte [registro central](../architecture/modules.json) e o índice gerado em [docs/INDEX.md](../docs/INDEX.md). Os caminhos de código completos são listados automaticamente; não repetir listas manuais aqui.

**Ao alterar:** Adicionar regressão próxima da regra alterada; não aceitar apenas build como prova de comportamento.

**Verificação:** npm test; npm run test:browser; check de arquitetura.

**Limites:** Testes não substituem observabilidade real nem carga de 500 jogadores.

**MCP:** `mcp-navigator.test.ts` verifica leitura limitada dos índices, respostas de protocolo stdio, bloqueio de caminhos maliciosos e ausência de comandos de escrita.

**Subsolo:** `tests/caves.test.ts` valida entradas determinísticas,
variação regional (incluindo sudeste pantanoso), limites, colisão do
primeiro andar e conectividade das câmaras. Antes de integrar, executar
também o Playwright de desktop/Android com descida, atlas interno e retorno
pela escada; CI verde sem esse cenário não comprova que a navegação está correta.

### Montarias
`mounts.test.ts`: dez fichas, tier/nível, stable, taming, captura idempotente, stamina, save e colisão com velocidade montada. `browser/mounts.spec.ts` exercita controles reais do mestre de estábulos e Android. As dez artes obedecem ao mesmo contrato de criaturas existente.

### Invariantes do motor e portões de qualidade
`engine-invariants.test.ts` guarda as regressões dos bugs de combate, derrota e save já corrigidos (lista em "Invariantes do motor" no `AGENTS.md`); cada teste falha se a correção correspondente for desfeita. `quality-gates.test.ts` reprova acaso global ou relógio de parede nas regras e no render, TypeScript estrito enfraquecido (`@ts-ignore`, `any`) e testes pulados ou isolados fora da lista de exceções.

### Tamanho de arquivos (aconselhamento, não reprovação)

`file-size-budget.test.ts` percorre os arquivos TypeScript de `src/` e `server/src/`, excluindo declarações `.d.ts`. Até 400 linhas é tamanho preferencial; 401 a 800 emite aviso; acima de 800 recomenda revisão de arquitetura. Fontes com cabeçalho de geração são registradas separadamente. **Nenhum arquivo falha exclusivamente por ter mais linhas.** Os avisos aparecem nos diagnósticos do teste Node e servem para a revisão do PR, não para obrigar divisão arbitrária.

A orientação é dividir por responsabilidade, e não por contagem: mantenha funções coesas e confira a direção das dependências, o typecheck, testes de regressão e Playwright quando alterar jogabilidade. Os portões em `quality-gates.test.ts` continuam obrigatórios.


### Capacidade por pasta e organização modular

`folder-capacity.test.ts` verifica até **200 arquivos diretos em cada pasta** do código-fonte, testes e automações (não a soma da árvore inteira). Diretórios gerados como `node_modules` e `dist` são ignorados. Novas categorias e subpastas são permitidas por responsabilidade; `engine-layout.test.ts` evita manifestos de nomes imutáveis e mantém apenas contratos essenciais, inclusive uma ficha por espada cadastrada. Os checks de importação, tipagem e integridade do catálogo continuam obrigatórios.
