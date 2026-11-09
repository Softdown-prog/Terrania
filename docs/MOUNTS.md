# Montarias — Cavalaria solo, estábulo e domesticação

Montarias são companheiras do **jogo solo**. O motor online não sincroniza
posições nem criaturas entre jogadores. O catálogo canônico está em
[MountCatalog.ts](../src/actors/MountCatalog.ts); toda regra fica em
[MountStable.ts](../src/engine/MountStable.ts), sem Angular/DOM.

## Conteúdo do primeiro lote

A folha 5×2 fornecida pelo criador representa, em ordem: Cavalo de Batalha,
Bode Montanhês Gigante, Alce Imperial, Leão do Fogo, Lagarto das Areias,
Urso-das-Cavernas, Unicórnio de Prata, Grifo-Sombrio, Escaravelho de Carga e
Hipocampo das Marés. **Não** é o lote 11–20 de monstros. Os dez possuem
fichas completas e silhuetas Canvas específicas, registradas como criatura no
contrato de arte; não se lê a sprite sheet como textura.

| Montaria | Tier | Nível | HP | Energia | Velocidade | Ataque | Habilidade planejada |
| --- | ---: | ---: | ---: | ---: | --- | ---: | --- |
| Cavalo de Batalha | I | 15 | 200 | 180 | +40% | 12 | Investida Firme |
| Bode Montanhês Gigante | I | 25 | 230 | 220 | +30% | 15 | Andarilho do Cume |
| Alce Imperial | II | 35 | 310 | 260 | +45% | 18 | Agilidade das Sombras |
| Leão do Fogo | III | 55 | 450 | 320 | +55% | 35 | Crina Ardente |
| Lagarto das Areias | II | 40 | 280 | 200 | +35% | 22 | Fervor Desértico |
| Urso-das-Cavernas | II | 45 | 550 | 180 | +25% | 40 | Quebra-Barreiras |
| Unicórnio de Prata | III | 60 | 400 | 450 | +60% | 25 | Purificação |
| Grifo-Sombrio | III | 65 | 380 | 340 | +50% | 30 | Voo Curto |
| Escaravelho de Carga | I | 30 | 480 | 300 | +20% | 10 | Estoque Extra |
| Hipocampo das Marés | II | 40 | 300 | 280 | Terra +25% / água +75% | 15 | Navegador Anfíbio |

As dez quests de domesticação, descrições, regiões, selas, iscas e drops
exatos estão no catálogo. Quests regionais não são tratadas como concluídas:
precisam de artefatos/interações, novos pontos de interesse e lógica de habilidades.

## Fluxo jogável — O Garrano Fugitivo (nova narrativa)

1. Com nível 15, vá até **Eron** e repare o cercado do estábulo (12 gel).
   Treine Cavalaria I e aceite a missão. Eron entrega automaticamente
   uma **Maçã Silvestre Doce**, registrada no estado da quest.
2. Examine as **marcas de cascos** na saída oeste da Vila da Travessia.
   A trilha tem representação física Canvas auditada no contrato de arte.
3. Afaste **cinco slimes derrotados depois de aceitar a missão**; derrotas
   anteriores não servem. O estado de avanço é serializável e determinístico.
4. Volte a Eron para fabricar **Cabresto** por 3 gel e aproxime-se do Garrano.
   O cavalo só aceita a maçã após os objetivos anteriores.
5. Acalme o animal e **conduza-o de volta ao estábulo**: uma representação
   visual do cavalo acompanha o herói, sem ignorar colisões do jogador.
6. A recompensa **Cavalo de Batalha + Sela de Couro Simples** é entregue
   apenas ao retornar a Eron; também são sorteados os drops de captura
   de forma determinística e uma única vez. Montar/desmontar permanece no HUD.

O estado é gerenciado por `MountQuestState.ts` (reducer por evento) e
`MountStable.ts` (regras, proximidade, gastos e recompensas), sem misturar
a quest de Aela. A maçã doce é **item vinculado à missão** exibido no painel,
não material de comércio ou loot. Uma nova quest não pode ser ativada
enquanto seus locais, gatilhos e testes não estiverem implementados.

## Evolução e pendências deliberadas

Cavalaria I, II, III exige níveis 15, 35, 55; o teto de nível sobe para 70
para permitir unicórnio (60) e grifo (65). Cada melhoria do cercado exige
12, 25 ou 40 gel e treinamento correspondente. O estábulo será a casa para
trocar montarias depois que as outras quests forem jogáveis.

**Ainda não implementado como ação real nesta etapa:** quests regionais 2–10,
fabricação de suas selas e iscas, dano de montarias, combate montado próprio,
cura do unicórnio, planado, novos tipos de colisão (areia movediça/gelo
destrutível) e navegação oceânica, estoque extra do besouro. Esses recursos
exigem testes separados; o código não os concede só por haver uma ficha no
catálogo. Não declarar montaria capturável sem uma quest física validada.

## Portões de qualidade

- \`npm run architecture:check\`: registro dos módulos/entradas e índices.
- \`npm run typecheck\`, \`npm test\`, \`npm run build\`.
- \`npm run art:preview\`: revisar a aparência procedural das dez espécies.
- \`npm run test:browser\`: desktop e Android; acompanhar toque nos botões.
- Não adicionar exceção \`NOT_AN_ASSET\`, nem diminuir \`FLOORS.creature\`.

## As dez histórias e o que realmente está liberado

`src/world/mountQuests.ts` contém os dez roteiros sugeridos: local,
origem, nível, gatilho, introdução, item inicial, objetivos tipados e dicas.
Somente o **Garrano Fugitivo** está `playable: true`; as outras nove usam
`playable: false`, pois faltar um barco, pesca, furtividade, ritual lunar,
planado ou ponto de interesse real não pode ser disfarçado por um botão.

Os eventos possíveis são `inspect`, `defeat`, `craft`, `collect`,
`protect`, `interact`, `escort`, `traverse` e `ritual`. A classe de
progresso só aceita o evento correspondente ao **objetivo atual**, com
alvo e quantidade validados. Quest não pode ser concluída antecipadamente
com um evento de outro monstro ou outro local.
