# ADR 0027 — Moradores dos lagos negros e das ruínas do Sul

**Estado:** entregue em 2026-11-10, direto na `main` por pedido do dono. Segunda de três tarefas seguidas no Sul (a primeira foi o ADR 0026).

## Contexto

O lago negro e as ruínas abandonadas (ADR 0017) eram só cenário: bonitos, mas sem ninguém. O plano do Sul previa "monstros nos lagos e nas ruínas". As espécies já existiam no bestiário: Sapo Batedor Venenoso, Ent Podre do Brejo e Hidra de Lodo (bioma de brejo e oásis) e o Diabrete de Miragem, o Elfo Patrulheiro do Oásis e o Goblin Saqueador (bioma de ruínas), mas nada as punha nesses lugares.

## Decisões

1. **Um sistema à parte do povoamento comum** (`southCommonSpawns`): a posição vem do **lugar**, não do bioma. Fica em `src/actors/southSiteSpawns.ts` e entra no mesmo laço de povoamento da simulação, sem mexer em terreno, em marcos regionais (espelhados pelo Go) nem nas fichas das criaturas.
2. **Margens dos lagos negros** (`src/world/blackLakeShore.ts`): uma margem é chão livre, sem árvore nem rocha, com água de lago negro a até 2 tiles. Cada bloco de 16 tiles sorteia 8 pontos por hash, ordem fixa; no máximo **2 moradores por bloco**. Quem mora: **Sapo Batedor Venenoso** (peso 70), **Ent Podre do Brejo** (24) e **Hidra de Lodo** (6), esta **só em lago grande** (20 ou mais tiles de lago na janela 7 × 7).
3. **Ruínas:** cada ruína tem **2 moradores**, à frente das peças sólidas, em chão onde o herói também anda: **Diabrete de Miragem** (55), **Elfo Patrulheiro do Oásis** (35) e, às vezes, **Goblin Saqueador** (10).
4. **Um arquivo por tabela de moradores,** em `src/monsters/sites/south/` (`lake-dwellers.ts`, `ruin-dwellers.ts`, mais `types.ts` e `index.ts`). Ficam fora das pastas de espécies de `monsters/south/` (o teste do bestiário exige só espécies ali); Norte, Leste e Oeste ganham as suas pastas depois, em `monsters/sites/`.
5. **Ids estáveis** (`south-site:<semente>:lake:<bloco>:<n>` e `south-site:<semente>:ruin:<ruína>:<n>`), então quem foi derrotado não reaparece e o saque e as moedas valem como para qualquer criatura. Nada nasce na cidade nem em chão bloqueado.
6. Fora do Sul não mora ninguém. Sem mudança de Go, de save ou de arte.

## Verificação

- `tests/south-site-spawns.test.ts` (6 testes): a tabela (sapo comum, ent às vezes, hidra rara; diabrete e elfo nas ruínas); lagos: determinísticos, em chão livre à beira da água, ids únicos, hidra só em lago grande, outra semente muda o mapa; no máximo dois por bloco; cada ruína tem seus moradores perto das peças e em chão livre, com diabrete e elfo aparecendo; nada fora do Sul e valores inválidos; no jogo o herói encontra os moradores e o derrotado não volta. Mutações conferidas: hidra em qualquer lago, ruína sem checar o chão, sem ligar na simulação e margem frouxa reprovam. (A checagem de região em `blackLakeShoreSpots` é só um atalho de custo: lagos só existem no Sul de qualquer jeito.)
- Captura no jogo real (Chromium desktop) do Ent e do Sapo à beira de um lago negro.

## Limites

- Os moradores usam a IA e o desenho que as espécies já têm; **não entram na água**, ficam na margem. Não há ninho, território nem comportamento de "guardar o lago".
- Quantidade e pesos são um primeiro palpite, sem medição de jogo; a hidra (de dungeon) na superfície pode ser forte demais para um herói de nível baixo.
- Os moradores aparecem como os demais da Battle List; nenhum aviso especial.
- Não verificado: Android físico e o custo do povoamento no aparelho (os blocos do Sul agora também varrem as margens).
