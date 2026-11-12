# ADR 0045 — Proteção do crescimento, parte 1: kit neutro do Sul e travas de fronteira

**Estado:** entregue em 2026-11-12, direto na `main`, depois de o dono perguntar até onde é seguro continuar evoluindo o jogo (que roda no navegador) sem que uma mudança num lugar quebre outro, como nos servidores abertos de Tibia que ele editava. Primeira de uma rodada de proteções; as demais estão em "Próximos passos".

## Contexto

Medido no repositório em 2026-11-12: 417 arquivos de código em `src/` (856 com testes e docs). Cada entrega recente mexeu em 10 a 25 arquivos, então o custo de uma tarefa depende da área tocada, não do tamanho total, desde que a organização se mantenha. Os pontos fracos encontrados:

- **Zero importações entre regiões** (bom), mas **uma dependência entre áreas irmãs**: a cidade importava o pincel das torres (6 importações). Mexer no pincel das torres mudaria a cidade.
- **Arquivos compartilhados muito usados**: `draw.ts` (125 importadores), `types.ts` (107), `random.ts` (47). Qualquer mudança neles se espalha.
- **Pontos de passagem**: `scenery.ts` (459 linhas) e `terrain.ts` (581) recebem uma linha a cada tipo novo de coisa.
- **Cadastros centrais** (`monsters/behavior.ts` importa cada monstro): padrão certo, mas cresce com o conteúdo.
- **Tetos de execução**, medidos: o mapa é desenhado por chunk em ~15–18 ms (no computador), o download é de 2,3 MB (um pedaço de 1,4 MB) e a suíte de navegador leva ~15 min.

## Decisões

1. **Kit neutro do Sul** (`src/render/south/kit/`): o pincel de alvenaria, o desgaste, o entulho de blocos, a areia e as rampas de cor saíram de `south/towers/` e ganharam nomes que dizem o que são: `MasonryBrush` (era `TowerBrush`), `MasonryWear`, `MasonryBlocks` e `SandDrift`. Torres e cidade dependem do kit; nenhuma depende da outra. Comportamento idêntico (os testes de arte, de torres e de prédios passaram sem mudar uma asserção de desenho).
2. **Duas regras travadas por teste** (`tests/region-boundaries.test.ts`, com a varredura pura em `tests/helpers/boundaries.ts`):
   - um arquivo de uma região (`south/`, `north/`, `west/`, `east/`, em **qualquer camada**) nunca importa outra região;
   - dentro de uma região, uma subpasta nunca importa uma subpasta irmã; **só o `kit/`** é compartilhado, e o kit nunca importa irmãs.
   A varredura lê `from "…"`, `import("…")` e `import "…"` (a forma sem nome passava despercebida; foi achada e corrigida na própria entrega).
3. **Regra deliberadamente não adotada:** "de fora só se importa o `index.ts` da subpasta". A medição mostrou 102 casos legítimos (os cadastros de monstros importam cada arquivo), então a regra geraria ruído, não proteção.
4. A regra entrou no `AGENTS.md` para humanos e outras IAs.

## Verificação

- `tests/region-boundaries.test.ts` (5 testes): o repositório inteiro limpo; a varredura achando importação entre regiões em qualquer camada, subpasta importando irmã, kit importando irmã e imports dinâmicos e sem nome; e deixando passar o que é permitido (própria subpasta, o que é comum, quem está fora das regiões, a mesma região em outra camada).
- Mutações da varredura (todas reprovadas): região livre, região só na mesma camada, torres viram compartilhadas, kit pode importar irmãs, irmãs livres, irmãs de outra camada, ignora import dinâmico e ignora import sem nome. Violações reais plantadas no repositório (cidade importando torres e arte do Sul importando monstros do Norte) foram pegas.
- Testes de torres e de prédios atualizados para o novo caminho do kit; contrato de arte, 885 testes e navegador seguem verdes.

## Próximos passos (rodada de proteção)

1. ~~Orçamento de desempenho e de tamanho~~ — feito no ADR 0046 (e a carga de região sob demanda foi descartada por ora, pelos números).
2. **Desenhar os chunks vizinhos antes de precisarem**, um por quadro, para o tranco ao entrar numa região pesada (a cidade) sumir.
3. **Cadastro de cenário por região:** trocar a sequência de `if` de `scenery.ts` por um cadastro em que cada região registra os próprios tipos, para uma região nova não editar o arquivo comum.
