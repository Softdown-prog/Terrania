# ADR 0019 — Torres dos Ermos do Sul (parte de fora)

**Estado:** fatia 3a entregue em 2026-11-10. O interior (andares de 2 a 3 por torre) é a fatia 3b e depende dos andares múltiplos do ADR 0018 (PR #137).

## Contexto

Depois das ruínas e do lago negro (ADR 0017) e dos andares nas cavernas (ADR 0018), o plano do Sul pedia torres de 2 a 3 andares. O dono pediu também que cada região fique separada e que **cada coisa tenha o seu arquivo e a sua pasta**, sem juntar várias peças num arquivo só.

## Decisões

1. **Três torres, cada uma com ficha e pintor em arquivo próprio, na pasta da região:**
   - fichas em `src/world/towers/south/` (`vigia-caida.ts`, `miragem.ts`, `sol-negro.ts`) com nome, andares, peso no sorteio, blocos de colisão e porta;
   - pintores em `src/render/south/towers/` (um arquivo por torre) e `common.ts` com a `TowerBrush` (pincel de pedra, janela, porta, entulho);
   - `index.ts` de cada pasta só agrega. Norte, Leste e Oeste entram depois em `towers/north/`, `towers/east/`..., sem tocar no Sul.
2. **Torre do Vigia Caída** (2 andares, comum), **Torre da Miragem** (3 andares, cúpula de vidro roxo) e **Torre do Sol Negro** (3 andares, rara, basalto e disco dourado).
3. **Sistema próprio de colocação** (`src/world/towers/placement.ts`), como as ruínas: não mexe em `regionalLandmarks.ts`, que o Go espelha. Célula de 224 tiles, ~30% das células, só com influência do Sul ≥ 0,62, fora da cidade e do Poço Negro, longe de ruína e de marco regional (14 tiles), pegada em chão livre e margem de 4 tiles no bloco desenhado.
4. **Colisão pelos blocos da ficha** (`southTowerBlocks`, ligada em `landmarkBlocks`): o corpo bloqueia; a frente e a porta ficam livres.
5. **Arte em sprite cacheado** (`south-tower-<id>`), registrada como `structure` no contrato de arte. O atlas "próximo" marca as torres em roxo.
6. O Go não espelha as torres (como as ruínas). As amostras de paridade continuam idênticas.

## Verificação

- `tests/south-towers.test.ts` (6 testes): um arquivo por torre nas duas pastas e pintores com as mesmas chaves; porta livre; torres determinísticas, só no Sul, de todos os modelos; pegada livre, dentro do bloco, longe de ruína e de caverna; consulta por área; o corpo bloqueia e a porta é alcançável.
- Mutações conferidas: tirar a colisão de `landmarkBlocks` e afrouxar a margem do bloco reprovam.
- Contrato de arte: as três torres passam sem baixar piso.

## Limites

- Por fora só: **a porta ainda não leva a lugar nenhum**. O interior vem na fatia 3b, reaproveitando `CaveFloor` e as escadas.
- Não verificado: Android físico, desempenho no aparelho, espelho no Go.

## Próximas fatias

1. **3b — interior das torres** (depois do PR #137): masmorras `src/dungeons/south/torre-*.ts`, andares com escada, chefe no topo.
2. Monstros nos lagos e nas ruínas, loot raro dos chefes, interações da cidade do Sul.
