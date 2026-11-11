# ADR 0031 — Missão "A Água Escura" (investigação do Poço Negro)

**Estado:** entregue em 2026-11-11, direto na `main` por pedido do dono. Continua o ADR 0030 (alquimia). Quarta tarefa seguida no Sul.

## Contexto

As falas de Gorrak, Khemet, Sylrael, Pip, Ixtal e da placa do poço já falavam de uma "água que deixou de refletir as estrelas", com "três histórias diferentes", e a fala de Khemet chamava a investigação de "missão futura". Faltava um jogo por trás dessas falas, e a única missão do painel era a de Aela.

## Decisões

1. **Cinco etapas, em ordem, sem texto de missão inventado fora delas:** ouvir as **três versões** (Gorrak, Khemet, Sylrael, em qualquer ordem, uma vez cada) → **examinar o poço** pela placa (só depois das três) → **Ixtal compara** a água com 1 **Gosma Tóxica** (saque da hidra do brejo; a gosma é gasta) → **contar a Gorrak**, que paga **150 Terrania Gold** uma única vez.
2. **Estado pequeno e serializável** (`src/engine/quests/south/well/`, um arquivo por assunto): `witness.ts`, `questState.ts` (estado), `events.ts`, `constants.ts`, `normalize.ts`, `summary.ts` (resumo do painel) e `WellInvestigation.ts` (a regra), com `index.ts` só reexportando. `OfflineSimulation.well` guarda o estado; o campo `wellQuest` do save só existe depois de a missão começar.
3. **Save nunca confiável:** `normalizeWellQuest` só aceita uma etapa se as anteriores valem (não se inspeciona sem as três versões, não se analisa sem inspecionar, não se recebe sem analisar), tanto em `loadLocalSave` quanto no construtor.
4. **Conversa decide, texto fica à parte:** `WellInvestigation.talk(npcId, bolsa)` devolve um evento (ou `null`); `src/game/messages/well/` (um arquivo por evento) traduz cada evento em falas acrescentadas ao fim do diálogo do NPC. Fora da etapa certa o diálogo comum segue intacto.
5. **Atômico e seguro:** sem Gosma Tóxica nada é gasto e a etapa não avança (`Inventory.spendMaterial`, novo, tudo-ou-nada). **Carteira sem espaço para 150 não marca a missão como paga:** Gorrak avisa e a missão continua aberta.
6. **Painel de missão:** a da clareira continua até ser concluída; depois, se a água escura já começou, o painel mostra o título, o passo seguinte e a barra (17%, 50%, 65%, 90%, 100%).
7. Fala de Khemet atualizada. Sem mudança de Go, de arte ou de servidor.

## Verificação

- `tests/south-well-quest.test.ts` (9 testes): atores e saque reais; as três versões em qualquer ordem e uma vez só; o poço só com as três versões e Ixtal só depois do poço; gasto de uma única gosma; recompensa única e carteira cheia; save (ida e volta, outro mundo recomeça, normalização com entradas inválidas e etapas fora de ordem); painel em cada etapa; todo evento com falas; `spendMaterial` atômico.
- Mutações conferidas (todas reprovadas): examinar sem as três versões, não gastar a gosma, pagar duas vezes, ignorar carteira cheia, Ixtal sem a etapa do poço, contar a mesma versão duas vezes, normalizar sem exigir a etapa anterior, não salvar a missão e mudar a recompensa.
- `tests/browser/south-well-quest.spec.ts` (desktop e Android): a missão inteira no jogo real, NPC por NPC, com o save passando de uma página à outra (gosma gasta, 150 moedas pagas uma vez só), e o painel mostrando "A Água Escura".

## Limites

- Desfecho propositalmente aberto ("alguém ou algo despeja a toxina"): a continuação (quem faz isso, o Escaravelho Solar, o culto) fica para missões futuras.
- A recompensa e o texto são um primeiro palpite, sem balanceamento. A missão não tem marcador no mapa.
- Só a gosma comum da hidra do brejo serve; a hidra vive longe da cidade, o que torna a etapa uma pequena expedição.
- Não verificado: Android físico.
