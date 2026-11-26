# ADR 0086 — O bot de QA passa a cobrir as cavernas e o Mago (e acha um monstro numa ilha inalcançável)

**Estado:** entregue em 2026-11-26, direto na `main`, por pedido do dono ("soltar o bot de QA para jogar e caçar bugs e inconsistências"). O bot ([QA_BOT.md](../QA_BOT.md)) cobria só o Cavaleiro na superfície: exatamente onde o dono não achou problema. Os problemas que ele achou estavam nas cavernas e no Mago, que o bot não tocava.

## O que mudou no bot
- **Relatório v7** com dois cenários novos, `caves` e `mage` (o `--strict` reprova qualquer falha, como antes). Seguem o molde dos outros: motor real em memória, sem navegador nem rede, reproduzíveis pela semente.
- **`QaCaves`**: seis temas × quatro cavernas × todos os andares (24 cavernas, 34 andares, 150 criaturas na semente padrão). Confere povoamento, **alcance a pé** de cada criatura e das escadas (busca em largura própria do bot, independente da do jogo) e o ciclo derrubar → saque no chão → recolher → experiência.
- **`QaMage`**: 32 conferências: nascimento, a magia derruba um slime, os **onze cajados** pela regra de mana (10 ÷ intervalo magias de uma barra cheia, ±1), as **14 peças** por nível e por vocação, os números de bônus, a comida que devolve mana e o save.
- A varredura de cavernas agora olha as **oito direções** até 160 células (os outros temas ficam a mais de 35 células do centro; a varredura antiga, de ±8, só via o Centro, e por isso o teste "outros temas intactos" do ADR 0083 não conferia nada; agora exige pelo menos três cavernas por tema).

## O que o bot achou
1. **Um monstro numa ilha isolada** (caverna do Pântano `cave:842136:49:49`, andar 1, `mob:4`): o sorteio de pontos usava qualquer chão transitável, inclusive bolsões cercados de água funda onde ninguém chega a pé. **Corrigido**: `world/caveReach.ts` calcula onde o herói alcança a partir da chegada, e `CaveRoom` (encontros comuns, treino, garantia) e `CaveSlimes` só sorteiam pontos alcançáveis.
2. Ao escrever o teste da função nova: a busca devolvia "sim" para posições fora do andar (a chave do tile de fora repetia a de um tile de dentro). Corrigido na hora, com teste.
3. A regra de mana dos cajados confere nos onze (uma suposição minha de "pelo menos oito magias" estava errada; a regra do documento dá 6 a 10, e o bot agora confere a regra, não um número solto).

## Verificação
- `tests/qa-caves.test.ts` (5) e `tests/qa-mage.test.ts` (2): os cenários passam, cobrem os seis temas e cada cajado e cada peça, são reproduzíveis e rejeitam semente inválida; a regressão da ilha; `caveReach` (ilha, parede, fora do andar, corredor que liga).
- Mutações: **14** estragos de propósito (monstro e slime em ilha, caverna do Centro vazia, chão sem saque, a busca e o predicado, comida sem mana, roupa sem nível, cajado caro, Mago nascendo sem roupa e sem mana). Todas pegas, exceto duas que não mudam o resultado do jogo (um limite da busca que o predicado já cobre, e o teto de bônus, que já tem teste próprio em `mage-gear-bonus.test.ts`).
- O relatório inteiro do bot (`npm run qa:bot -- --strict`) passa nos seis cenários.

## Limites
- Continua sendo QA de **motor** (nada de tela, navegador, celular real ou som), por semente fixa: um defeito que só aparece em outra semente passa; rodar com `--seed=` outras sementes é barato e vale como rotina.
- O bot não joga o Druida nem o Arqueiro (ainda não existem) nem as criaturas novas das regiões (as fichas entram com os bestiários); cada vocação e região nova ganha o seu cenário quando entrar.
