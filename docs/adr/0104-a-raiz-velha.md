# ADR 0104 — A Raiz Velha: a missão da Gruta das Raízes (L5d)

**Estado:** entregue em 2026-11-27, quarta fatia do pedido do dono para a Gruta das Raízes ("coisas para fazer dentro da gruta"). Depois dos [cinco andares](0101-toda-gruta-das-raizes-e-masmorra.md), das [tocas e atalhos](0102-tocas-e-atalhos-da-masmorra-das-raizes.md) e dos [baús](0103-baus-das-tocas.md), a masmorra ganha um **objetivo**. Falta só a coleta que volta.

## A missão
Segunda missão da **Aela** (a do começo do jogo), no [diário de missões](0100-diario-de-missoes.md):
1. Só depois de **receber a recompensa da clareira**, e na conversa seguinte (não na mesma em que a recompensa sai), Aela conta da **Raiz Velha**: as raízes do Ent Ancião crescem sob a clareira. Falar com ela **aceita** a missão.
2. Entrar numa **Masmorra das Raízes** (qualquer gruta de pedra verde), descer os cinco andares e **derrotar o Ent Ancião** no Coração da Gruta. O abate fica guardado mesmo que o chefe volte (ele volta em 30 minutos) e só vale depois de aceita a missão e só do chefe do último andar.
3. Voltar a falar com Aela: ela paga **300 Terrania Gold**, uma única vez (com a carteira cheia, a missão espera sem ser marcada como paga).

No diário a missão aparece como "para começar" (dizendo o que falta, "Termine antes a missão da clareira"), "em andamento" com as três etapas e o **guia de direção até a Masmorra das Raízes mais perto** do herói, e "concluída". O painel da tela segue o que já fazia: acompanha a missão em andamento e a concluída sai dele.

## Onde está
`src/engine/quests/center/roots/` (um arquivo por assunto: constantes, estado, eventos, normalização, a regra `RootsQuest` e o `index.ts`), a entrada do diário em `quests/journal/roots.ts`, as falas em `src/game/messages/center/roots/` (um arquivo por evento), `src/world/nearestRootsDungeon.ts` (a gruta verde mais perto, para o guia). `OfflineSimulation.roots` guarda o estado e o save leva `rootsQuest` só depois de aceita; `applyCaveVictories` anota o abate do chefe; `Game` liga a conversa com Aela. O save normaliza cada etapa (não se derrota o Ent sem ter aceitado, nem se é pago sem ter derrotado).

## Testes e mutações
`tests/roots-quest.test.ts` (11): quem pode contar da missão e quando; lembrete sem mudar nada; o abate (só o Ent, só o chefe, só depois de aceita); pagamento único; carteira cheia; normalização do save; ciclo pela simulação, com save e recarga e outro mundo; carregamento do navegador; entradas do diário em cada estado; gruta mais perto; falas e ligação no jogo. `tests/quest-journal.test.ts` passou a quatro missões. Navegador (desktop e Android): `app.spec` (a segunda conversa com Aela aceita a missão e o painel muda) e `quest-journal.spec` (para começar, com o Ent derrotado, paga, e a conversa que paga 300 Terrania Gold uma vez). 28 mutações: nenhuma sobrevive; uma sobrevivia por ser equivalente (a torre já fica de fora pelo tema) e o código redundante foi **removido**.

## Limites
Quem derrotou o Ent Ancião **antes** de aceitar a missão precisa vencê-lo de novo (ele volta em 30 minutos). A missão paga só moedas; roupas e cajados como recompensa de missão são um item à parte do plano.
