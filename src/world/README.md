# Mundo procedural

> **Atualização 2026-11-08:** o modo online/sala Node foi retirado ([ADR 0012](../../docs/adr/0012-retirada-do-multiplayer.md)). Trechos abaixo sobre sala, snapshot, `online` ou servidor autoritativo descrevem o que existiu e foi removido.

**Papel:** Terreno por seed, colisão, vila e marcos; fichas e diálogos de NPCs em `src/npcs/`.

A regra de progresso da missão da Aela fica em `aelaQuest.ts`. As falas da vila, o inventário solo e o HUD usam a mesma meta e a mesma condição de conclusão.

**Ponto de entrada:** consulte [registro central](../../architecture/modules.json) e o índice gerado em [docs/INDEX.md](../../docs/INDEX.md). Os caminhos de código completos são listados automaticamente; não repetir listas manuais aqui.

**Ao alterar:** Preservar determinismo e coordenadas globais/tamanho de tile; registrar mudanças que alterem saves.

**Verificação:** tests/world, physics, village, NPCs e paridade com Go.

**Limites:** Não permitir atravessar colisões; cuidado com divergência entre cliente e servidor.

**Escala do atlas:** `atlas.ts` partilha com `collision.ts` o limite técnico de movimento (±1.000.000 px em cada eixo; tiles de 32 px). O gerador `getTile` continua procedural, sem borda geográfica explícita. Os nove setores são divisões de coordenadas e as classificações de terreno são amostragens reprodutíveis; não se deve tratá-las como garantia de travessia ou mapa totalmente revelado. O render fica em `src/render/terrain.ts`, fora do domínio.

**Regionalização:** consulte [docs/MACRO_REGIONS.md](../../docs/MACRO_REGIONS.md) para biomas, risco, rotas e conteúdo pendente. A geração de ambos os lados do multiplayer usa as mesmas regras de `terrain.ts`.

**Cavernas regionais (primeiro andar, solo):** `caves.ts` coloca entradas
determinísticas em células de 96 tiles, com um acesso acessível fora da vila
inicial. `CaveRoom` gera uma planta 42×30 independente das coordenadas de
superfície, com câmaras conectadas, paredes e águas profundas bloqueadas e uma
escada para voltar pela mesma entrada. A diagonal sudeste recebe a identidade
pantanosa; gelo, deserto, costa, montanha e centro usam temas próprios.
Este primeiro andar não possui combate, monstros, drops, teleporte para outros
andares ou persistência de posição subterrânea. Não confundir com masmorras
sincronizadas: a autoridade do multiplayer Node/Go **não** suporta transições de
subsolo e a interação está desabilitada nas salas online.
`tests/caves.test.ts` testa seeds, acessibilidade, conectividade e paredes.

### Localizações do primeiro estábulo
`mountLocations.ts` declara posições determinísticas de Eron, Cavalo de Batalha fugitivo e Maçã Silvestre. São dados de mundo, e não regras de quest nem lógica de interface.

**Quests de montarias:** `mountQuests.ts` é o catálogo de histórias,
desbloqueios e objetivos para as dez espécies, mas só a missão inicial está
habilitada. `mountLocations.ts` fixa Eron, as marcas de cascos e o cavalo
fugitivo no mapa da vila, sem criar terrenos secretos nem colisões novas.

**Camadas (ADR 0016):** `world` fica na base e só importa `world`. O vocabulário das montarias (`mountIds.ts`) mora aqui para que `mountQuests.ts` não dependa de `actors/`; `tests/layering.test.ts` confere. Única exceção hoje: `npcs.ts` (reexportação de `npcs/`), que sai junto com o PR da vila.
