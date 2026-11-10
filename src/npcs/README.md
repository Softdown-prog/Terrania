# NPCs por região — Terrania

As fichas contêm nome, função, coordenadas, aparência e diálogos.
O renderizador `src/render/npcs.ts` desenha as figuras usando as mesmas
cores e parâmetros anteriores. `src/world/npcs.ts` é uma reexportação
de compatibilidade, **sem cadastro duplicado**.

- **Centro:** cinco NPCs em [center/](center/index.ts): Aela, Mira, Toren, Lina e Eron.
- **Norte:** [north/](north/README.md) — nenhum NPC ativo.
- **Sul:** [south/](south/README.md) — nenhum NPC ativo.
- **Leste:** [east/](east/README.md) — nenhum NPC ativo.
- **Oeste:** [west/](west/README.md) — nenhum NPC ativo.

Placas e portas são objetos de `src/world/village.ts`, não NPCs.
O ID de Eron continua `stablemaster` para manter todas as integrações.

Para criar um NPC: escreva a ficha em sua região, registre-a em
`<região>/index.ts` e agregue os NPCs reais ao `src/npcs/catalog.ts`.
Use o mesmo sistema compartilhado de interação e desenho. Atualize índices
e testes antes de integrar; não crie lógica de quest duplicada por NPC.
