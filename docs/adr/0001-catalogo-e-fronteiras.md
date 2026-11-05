# ADR 0001 — Registro central e índices derivados

- **Data:** 2026-11-04
- **Estado:** aceito para a branch experimental, sem aprovação de merge/deploy
- **Escopo:** navegação do repositório e processo de manutenção; não muda gameplay

## Contexto

O Terrania combina Angular/Phaser, motor TypeScript local, backend Node, protótipos Go/Rust e múltiplas linhas de pesquisa. Para futuros mantenedores e agentes de IA, um número crescente de arquivos sem índice de responsabilidade exige busca repetitiva, favorece decisões contraditórias e mistura laboratórios com produção.

## Decisão

- Um registro versionado em `architecture/modules.json` descreve **módulos, camadas, estado, pastas, pontos de entrada e documentação**.
- `scripts/index-project.mjs` produz uma entrada central (`docs/INDEX.md`) e índices de arquivos por módulo (`docs/indexes/*.md`), determinísticos e conferidos por CI.
- A maioria dos arquivos **permanece em seu lugar**; não criar barrel `index.ts` apenas por estilo, pois eles podem mascarar dependências e criar ciclos.
- Impedir imports de Angular/Phaser/DOM em módulos de domínio, sem proibir imports válidos de mundo/atores.
- Operações de infraestrutura e MCP são etapas separadas; o catálogo não implica acesso à VPS nem implantação em produção.

## Consequências

- Quando surgir, mover ou excluir arquivo indexado, será necessário regenerar os índices (`npm run architecture:index`); o check falha se o índice estiver desatualizado.
- Mudança comportamental requer atualizar a documentação **quando pertinente**. Decisões importantes ganham ADR, sem exigir ADR para cada correção pequena.
- Não há prova automática de independência completa dos módulos; revisar arquitetura e executar testes, especialmente se alterar contratos cliente-servidor.

## Alternativas evitadas

Refatoração massiva das pastas, dezenas de wrappers sem função, MCP administrativo prematuro, repositórios separados por espécie e cópias de todas as versões antigas dentro do projeto.
