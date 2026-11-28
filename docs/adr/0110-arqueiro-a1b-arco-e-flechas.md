# ADR 0110 — O Arco de Caça, a flecha de junco e a aljava (Arqueiro, lote A1b)

**Estado:** entregue em 2026-11-28, segunda fatia do Arqueiro de [ARQUEIRO.md](../ARQUEIRO.md) (a primeira foi o [ADR 0109](0109-arqueiro-a1a-vocacao.md)). É trabalho de **motor**, sem nada novo na tela: o Arqueiro continua bloqueado ("Em breve") até o disparo, o projétil e o inventário (A1c) ficarem prontos.

## O que mudou
- **O Arco de Caça** (`src/engine/character/Bows.ts`, ficha em `weapons/bows/hunting.ts`, um arquivo por arco como os cajados): nível 0, **8 de dano**, **0,8 s** entre tiros, **0,12 s** de preparo, **7 tiles** de alcance, **uma flecha por tiro**, madeira de freixo. É a ficha da espada de treino, só que à distância; o dono ajusta os números no arquivo do arco. Os outros dez arcos entram no lote A4.
- **A flecha de junco** (`Arrows.ts`, ficha em `weapons/arrows/reed.ts`): a comum, sem dano extra (o tiro vale o dano do arco); **no máximo 99 por tipo**. Os outros sete tipos entram no lote A3.
- **A aljava** (`Quiver.ts`): quantas flechas de cada tipo o Arqueiro leva e qual está em uso. Começa com **30 de junco**. Gastar é **tudo ou nada** (sem flecha suficiente nada muda); ganhar para no máximo do tipo e devolve quantas entraram. O save é limpo como os outros: só tipos que existem, inteiros de 0 a 99, e a flecha em uso conhecida.
- **Na bolsa** (`Inventory`): `quiver`, `spendArrows` e `gainArrows`, só para o Arqueiro (Cavaleiro e Mago têm aljava vazia, não gastam, não ganham e não ganham campo novo no save). O Arqueiro **sem registro** de aljava (mundo novo) nasce com as 30; um registro com **zero** flechas continua zero, não volta a 30. O save do Arqueiro sempre guarda a aljava.
- **No combate** (`OfflineSimulation.combatProfile`): o Arqueiro tem perfil **à distância**, com intervalo e alcance do arco (7 tiles, parada de perseguição 4 px antes) e fica **pronto só com flecha** na aljava: `ranged.ready` é falso com a aljava vazia, como é falso o do Mago sem mana. O disparo em si (gastar a flecha, projétil, dano, animação) vem no A1c.

## Testes
`tests/archer-bow.test.ts` (6): a ficha do arco e o desbloqueio por nível; a flecha de junco e os limites; a aljava (gastar tudo ou nada, encher até 99, entradas ruins e save sujo); a bolsa do Arqueiro (nasce com 30, gasta, ganha, sobrevive ao save, aljava de zero não volta a 30, as outras vocações sem aljava); o perfil de combate (pronto com uma flecha, não pronto sem, alcance de 7 tiles em pixels, Cavaleiro sem alcance); o save da aventura inteira. Mutações pegas nas 13 que tentei: dano, alcance, `>=` do nível, 30 inicial, `<=` ao gastar, tirar o teto de 99 na leitura e no ganho, `amount < 0`, a vocação da aljava, o campo no `snapshot` e na leitura do save, `>` no pronto e o `followStop`.

## O que vem depois
A1c: o tiro de verdade na superfície e na caverna (gastar uma flecha, a flecha que voa, dano e o aviso "Sem flechas"), o espaço Flechas do inventário e a liberação do Arqueiro na tela de escolha. Depois A2 (desenho e animação), A3 (tipos de flecha e a compra na Irmandade), A4 a A6.
