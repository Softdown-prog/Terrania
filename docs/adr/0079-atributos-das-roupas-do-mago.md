# ADR 0079 — Os atributos das roupas do Mago, lote A2: mana máxima, recarga de mana e dano das magias

**Estado:** entregue em 2026-11-25, direto na `main`, por pedido do dono (lista e números em [`docs/MAGO_ROUPAS.md`](../MAGO_ROUPAS.md); o lote A1, em que o Mago passa a vestir, é o [ADR 0078](0078-roupas-do-mago.md)). É o encanamento: **o que está vestido passa a mexer na mana e no dano**, na superfície e na caverna. As peças do conjunto do Aprendiz seguem sem bônus (como na lista), então **hoje nada muda no jogo que o jogador veja**; os bônus aparecem com os conjuntos dos níveis 10 em diante (lotes B a E).

## Decisões

1. **Três atributos por peça**, em porcentagem inteira e opcionais na ficha da peça (`bonus: { mana, regen, damage }` em `GearDefinition`): **mana máxima**, **recarga de mana** e **dano das magias**. Sem o campo, a peça não dá bônus. Os dados ficam nos arquivos das peças (um conjunto por arquivo, como o do Aprendiz).
2. **A soma** (`engine/character/gearBonus.ts`, `gearBonus(gear)`): o total de cada atributo é a soma do que está vestido; valor negativo, infinito ou que não é número não soma; a fração é cortada; **cada atributo tem teto de 100%** no total (um jogador nunca passa do dobro). Sem bônus nenhum o resultado é sempre o mesmo objeto (`NO_GEAR_BONUS`).
3. **Mana máxima:** o máximo do nível mais `mana`%, arredondado (`scaledMaxMana`); vale na barra do HUD (que já lê `sim.maxMana`), no limite da mana devolvida e no mundo carregado (a mana salva acima do máximo base volta inteira se as peças estão vestidas). Tirar a peça baixa o máximo e a mana cai ao novo máximo no passo seguinte.
4. **Recarga de mana:** a barra maior **enche no mesmo tempo** (o ritmo de recarga cresce junto com o máximo: 20 s de jogo em qualquer tamanho) e o bônus de recarga soma velocidade por cima: o ritmo é o do nível × (1 + mana%) × (1 + recarga%). Com 100% de recarga a barra enche em 10 s.
5. **Dano das magias:** o bônus aumenta o dano do cajado **antes da defesa do alvo e antes dos saltos do raio** (o salto da Tempestade leva 60% do dano já com o bônus): 115 com +50% são 173, o salto leva 104. A mana devolvida pela Lua Negra e o efeito do cajado usam o dano real, então também crescem. A superfície passa o bônus para a resolução da magia (`resolveSpellStrike`) e a caverna também, pelo lançador (`damagePercent`), de modo que **as duas valem igual**.
6. **Só quem usa mana tem bônus** (`OfflineSimulation.gearBonus`): o Cavaleiro nunca recebe, mesmo que um dia vista uma peça com bônus.
7. **No inventário:** o cabeçalho do equipamento do Mago mostra os totais ("Mana +0% · Recarga +0% · Dano +0%"), a mochila e o painel de cada peça dizem o bônus dela ("mana máxima +2% · recarga de mana +2% · dano das magias +1%"), quando existe.

## Verificação

- `tests/mage-gear-bonus.test.ts` (7), com peças de teste que entram no catálogo só durante cada teste (as do Aprendiz têm bônus zero): a soma (peças, teto, lixo, infinito, id inexistente), a mana máxima e a recarga (cada bônus separado e juntos, o mesmo tempo para encher, o teto, a mana acima do máximo, o Cavaleiro sem mana), o mundo (vestir e tirar muda na hora, o bônus é só de quem usa mana, a barra enche em 20 s sem bônus e mais depressa com recarga), o save com bônus, o dano (arredondamento, defesa depois, salto, feixe, mana devolvida, sem argumento nada muda), a superfície e a caverna de ponta a ponta, o texto e as ligações.
- `tests/browser/mage-gear.spec.ts`: o cabeçalho do inventário mostra os totais zerados do Aprendiz.
- Mutações: **27** estragos de propósito (cada soma, o teto, valor negativo e infinito, o arredondamento, cada fator da recarga, o máximo na simulação e na regeneração, o bônus só de quem usa mana, o dano na superfície, na caverna e nos saltos, os textos e a tela). Um passou batido na primeira rodada (bônus infinito virando 100%) e foi fechado com teste novo; os 27 foram pegos.

## Limites

- **Hoje não muda nada para o jogador**: o conjunto do Aprendiz não dá bônus. Os números reais (nível ÷ 5 por cento de mana e recarga, nível ÷ 10 de dano) entram com cada conjunto nos lotes B a E, com a tabela de `docs/MAGO_ROUPAS.md`; a escala vai de +2% de mana no nível 10 a +20% no nível 100.
- O bônus de **mana máxima** muda a barra, mas não o custo de cada magia (fixo no cajado): com 20% a mais de mana, o Mago lança 20% mais magias antes de esvaziar.
- Os números e o teto de 100% são propostas do dono. Android físico não foi testado.
