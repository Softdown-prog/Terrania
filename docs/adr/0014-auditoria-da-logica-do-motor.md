# ADR 0014 — Auditoria da lógica de `src/engine`

**Estado:** em andamento. Sessões 1 e 2 entregues em 2026-11-10; sessões 3 e 4 abaixo.

## Contexto

`src/engine` tem 20 arquivos e ~2.000 linhas; o maior tem 233. **Não há problema de tamanho** (ao contrário do `Game.ts`, ADR 0013). O problema é de **lógica copiada**: duas regras que deveriam ser uma existiam em dois lugares e foram divergindo. Os erros corrigidos em 2026-11-10 (defesa ignorada na caverna, arco da espada astral inalcançável) nasceram exatamente assim. Esta auditoria lista o que ainda pode divergir e fixa a ordem de correção, uma microtarefa por entrega.

## Achados

| # | Achado | Risco | Sessão |
| --- | --- | --- | --- |
| 1 | O laço de golpe (dano, efeito da lâmina, abates) estava escrito duas vezes: `OfflineSimulation.update` e `CaveRoom.update` | **Alto**: foi a origem dos dois erros acima | **1 (feita)** |
| 2 | `MAX_KILLS` declarado em `OfflineSimulation.ts` e em `MountQuestState.ts`; o `99` da pilha escrito solto em `Inventory.ts` e `Food.ts` em vez de `MAX_STACK` | Médio: mudar um e esquecer o outro | 2 |
| 3 | `MountStable.tame` compara o nível com `15` fixo; `beginWarhorse` usa `MOUNTS.warhorse.level` | Médio: o catálogo muda e a domesticação não acompanha | 2 |
| 4 | `Inventory.equipWeapon(weapon, level = this.level)`: o nível padrão é o de quando a bolsa foi criada e fica velho após subir de nível. Hoje o único chamador passa o nível, então não falha | Baixo, armadilha latente | 2 |
| 5 | `CaveFloor` (geração do mapa da caverna, ~70 linhas) mora em `engine/CaveRoom.ts`; é mundo, não regra de combate | Médio: o arquivo mistura duas responsabilidades | 3 |
| 6 | `OfflineSimulation.update` faz movimento, IA das criaturas, golpe e coleta no mesmo método | Médio: difícil de testar por partes | 4 |
| 7 | `engine/README.md` e comentários ainda falam de "sala Node" e servidor autoritativo (retirados no ADR 0012) | Baixo, confunde quem lê | 4 |
| 8 | Estilo misto (código compacto sem espaços em `CaveRoom`, `MountStable`, `OfflineSimulation`) e comentários em dois idiomas | Cosmético | só ao tocar o arquivo |

## Sessão 1 (feita): uma resolução de golpe

`resolveSwordStrike` (em `SwordCombat.ts`) recebe quem foi atingido (já escolhido por `swordStrikeTargets`), o conjunto vivo do cenário e uma função de abate. Aplica dano com defesa, efeito da lâmina e avisa os abates na ordem *secundárias primeiro, principal depois*. A superfície e a caverna só decidem o que fazer com cada abate (XP, saque, remoção). `applySwordImpact` passou a ser genérico, o que eliminou o `as RegionalMonster` da caverna.

**Prova de que o comportamento não mudou:** o teste de paridade (`tests/sword-strike.test.ts`) roda seis combinações de lâmina e alvo nos dois cenários e exige o mesmo conjunto de abates; ele **passa também no código anterior**. Os testes da própria função falham se a ordem, a defesa, o filtro de criatura caída ou o conjunto do cenário forem alterados (quatro mutações conferidas); a mutação "sem `onSwordHit`" reprova as suítes existentes.

**O que continua separado, de propósito:** quem vira o herói (a superfície vira para o alvo escolhido *antes*; a caverna vira para o primeiro alvo *depois*), a recarga e a regra de derrota. São decisões de cada cenário, não do golpe.

## Sessão 2 (feita): eliminar limites e níveis divergentes

`Limits.ts` passa a definir `MAX_KILLS` e `MAX_STACK` para save, missão de montaria, alimentos, materiais e bolsa. Os exports anteriores em `OfflineSimulation.ts` e `Inventory.ts` continuam disponíveis. O Garrano consulta `MOUNTS.warhorse.level` também ao domar; `equipWeapon` exige o nível atual do chamador, já fornecido por `shopActions.ts`.

**Regressões:** normalização de abates, marcos da missão e pilhas; tentativa de domar com nível de catálogo alterado; chamada de equipamento sem nível não pode usar o nível antigo do inventário. Nenhum balanceamento ou save foi alterado.

## Próximas sessões
- **Sessão 3 — `CaveFloor` para `src/world/`:** atualizar `architecture/modules.json` e regenerar os índices. O gerador do mapa deve produzir **o mesmo mapa** para a mesma semente (teste de igualdade célula a célula antes e depois).
- **Sessão 4 — `OfflineSimulation.update` em partes** (movimento, criaturas, golpe, coleta) e atualização do README do motor.

Fora de escopo: mudar regra de jogo, balanceamento, protocolo ou qualquer coisa de `server/`. Compilar não comprova jogar bem: cada sessão passa também pela suíte de navegador.
