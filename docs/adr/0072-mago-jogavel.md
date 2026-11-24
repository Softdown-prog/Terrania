# ADR 0072 — O Mago jogável

**Estado:** entregue em 2026-11-24, direto na `main`, por pedido do dono (fatia F2 do [ADR 0065](0065-heroi-mago-fundacao.md)). O Mago passa a ser escolhido na tela de início e no "Novo mundo". O dono aprovou as duas propostas: **o mago já nasce com o cajado de Aprendiz** (a Academia Arcana ganha função junto com o 2º cajado) e **sem armadura por enquanto**.

## Decisões

1. **Liberado:** `playable: true` na ficha do Mago. A carta dele na tela de escolha vira "Jogar como Mago" (sem a etiqueta "Em breve"). O texto dela não promete mais "cajados de 11 níveis": diz que ele começa com o cajado de Aprendiz e que outros virão. A trava "Em breve" continua existindo para as próximas vocações.
2. **O que cada vocação usa**, na ficha (`usesSwords`, `wearsArmor`): o Cavaleiro luta com as onze espadas e veste o conjunto de armadura; o Mago luta com o cajado e **não veste armadura** (as roupas mágicas dele, com defesa e desenho próprios, entram com os cajados, fatia G). Uma regra só, na ficha, que o jogo e a tela leem.
3. **O ferreiro não vende espada ao Mago** (`npcOffer(npc, vocação)`), e as ações de loja recusam, com a razão dita ao jogador, comprar ou equipar espada e vestir armadura (`messages/classRules.ts`). Tirar uma peça que não está vestida não é erro. O save do Mago nunca ganha espada nem armadura.
4. **O inventário do Mago** mostra o que é dele: o título é "Inventário do mago", a aba de equipamento tem **um só espaço, o do cajado** (com o ícone novo do cajado de Aprendiz, no mesmo estilo dos ícones de espada), a ficha do cajado em mãos (8 de dano, 1 s entre magias, 5 de mana, alcance de 6 tiles) e a legenda "Cajados do mago · 1 de 11 · os outros virão com a Academia Arcana". A mochila dele não lista espadas nem armadura, e a defesa não aparece. O cajado inicial é chamado de "Inicial", não de "Nível 0". A prévia mostra o Mago de verdade (escala um pouco menor, por causa do chapéu). O Cavaleiro continua exatamente como era: dez espaços, onze espadas, defesa.
5. **Dentro das casas** o herói agora é desenhado pela vocação (antes o Mago apareceria como Cavaleiro).
6. **A Academia Arcana fica como está** (fachada): uma loja de um único item não faz sentido. Porta, interior e mestre chegam junto com o 2º cajado (fatia G), seguindo a regra do dono de que só entra quem tem função.
7. `isHeroClassPlayable` passou a aceitar qualquer valor sem lançar erro (uma vocação desconhecida não é jogável).

## Verificação

- `tests/mage-release.test.ts` (6): as fichas, a oferta do ferreiro por vocação, as ações de loja recusadas (e o Cavaleiro intacto, vestindo o elmo e ganhando defesa), as mensagens, o ícone, e a ligação jogo → HUD → tela (espaços, mochila, título, prévia, interior, layout).
- `tests/hero-select.test.ts` e `tests/browser/hero-select.spec.ts`: os dois heróis liberados; **escolher o Mago** num mundo novo começa um mundo de Mago (salvo como Mago, barra de mana, 80 de vida), abre o inventário com o cajado, um só espaço, sem defesa e com a prévia, e não pede a escolha de novo ao recarregar; o Cavaleiro mantém dez espaços, onze espadas e a defesa. Desktop e Android.
- Mutações: **31** estragos de propósito (a liberação, cada flag das fichas, a oferta do ferreiro, cada recusa, o que o HUD esconde, o título, a prévia, o interior e o texto da escolha): todos pegos pelos testes na primeira rodada.
- Captura: `docs/screenshots/inventario-do-mago.png`.

## Limites

- **Sem loja de cajados e sem Academia Arcana com função** até o 2º cajado (fatia G).
- Sem armadura para o Mago: o equilíbrio de defesa dele (vida a 80%, sem armadura) não foi medido em jogo real; é proposta do dono para ajustar com as roupas mágicas.
- O inventário ainda tem textos de Cavaleiro em partes que o Mago não vê (arsenal, Toren).
- Android físico não foi testado; sem medição em celular de 2018.
