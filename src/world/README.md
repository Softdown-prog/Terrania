# Mundo procedural

> **Atualização 2026-11-08:** o modo online/sala Node foi retirado ([ADR 0012](../../docs/adr/0012-retirada-do-multiplayer.md)). Trechos abaixo sobre sala, snapshot, `online` ou servidor autoritativo descrevem o que existiu e foi removido.

**Papel:** Terreno por seed, colisão, vila, marcos e NPCs.

A regra de progresso da missão da Aela fica em `aelaQuest.ts`. As falas da vila, o inventário solo e o HUD usam a mesma meta e a mesma condição de conclusão.

**Ponto de entrada:** consulte [registro central](../../architecture/modules.json) e o índice gerado em [docs/INDEX.md](../../docs/INDEX.md). Os caminhos de código completos são listados automaticamente; não repetir listas manuais aqui.

**Ao alterar:** Preservar determinismo e coordenadas globais/tamanho de tile; registrar mudanças que alterem saves.

**Verificação:** tests/world, physics, village, NPCs e paridade com Go.

**Limites:** Não permitir atravessar colisões; cuidado com divergência entre cliente e servidor.

**Escala do atlas:** `atlas.ts` partilha com `collision.ts` o limite técnico de movimento (±1.000.000 px em cada eixo; tiles de 32 px). O gerador `getTile` continua procedural, sem borda geográfica explícita. Os nove setores são divisões de coordenadas e as classificações de terreno são amostragens reprodutíveis; não se deve tratá-las como garantia de travessia ou mapa totalmente revelado. O render fica em `src/render/terrain.ts`, fora do domínio.

**Regionalização:** consulte [docs/MACRO_REGIONS.md](../../docs/MACRO_REGIONS.md) para biomas, risco, rotas e conteúdo pendente. A geração de ambos os lados do multiplayer usa as mesmas regras de `terrain.ts`.
