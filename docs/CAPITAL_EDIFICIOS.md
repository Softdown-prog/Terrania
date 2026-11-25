# Concórdia — para que serve cada edifício e quais abrem

Registro da decisão do dono (2026-11-21): **não se desenha mais edifício sem saber para que ele serve.** Regra: **só entra quem tem função de jogo.** Dos 21 terrenos, **14 abrem** (têm porta, interior e função) e **7 são só fachada** (casas e celeiros, sem interior). Os nomes são de trabalho; o dono ajusta.

Quando um terreno ganha função, ele entra em `CAPITAL_ENTERABLE` (`src/world/center/capital/buildings.ts`): a porta, o interior e o nome do lugar no painel saem daí. As funções marcadas "proposta" ainda esperam o dono confirmar; as marcadas "a decidir" dependem da história.

## Os 21 terrenos

| Terreno | Entra? | Função | Interior (molde) | Estado |
| --- | --- | --- | --- | --- |
| Hospedaria dos Viajantes | sim | descansar por moedas (vida cheia, sem veneno nem queimadura) | estalagem: duas camas e balcão | **pronto** (ADR 0062) |
| Templo da Concórdia | sim | **lugar de renascimento**: a sacerdotisa consagra o Templo (ou a Vila) como onde o herói renasce | nave com altar e dois bancos | **pronto** (ADR 0064) |
| Casa da Moeda e dos Mercadores | sim | **banco**: guarda o dinheiro do herói e paga juros (ver "O banco") | balcão com grade e cofre | **pronto** (ADR 0063) |
| Salão do Conselho dos Povos | sim | missões e decretos da capital | salão com mesa do conselho | a decidir (história) |
| Quartel da Guarda | sim | missões de caça e defesa | sala de armas | a decidir (história) |
| Salão da Ordem dos Cavaleiros | sim | guilda do cavaleiro | salão de guilda | a decidir |
| Academia Arcana | sim | **guilda do mago**: a Mestra Ilvana vende o Cajado da Brisa (30 Terrania Gold); os outros cajados liberam por nível | salão de guilda: duas estantes e a mesa de estudo | **pronto** (ADR 0074) |
| Irmandade dos Arqueiros | sim | guilda do arqueiro | salão de guilda | a decidir |
| Forjas da Travessia | sim | comprar e melhorar armas | forja com bigorna | proposta (edifício ainda não desenhado) |
| Mercado Coberto | sim | comprar e vender itens | balcões de feira | proposta (não desenhado) |
| Arquivo dos Exploradores | sim | registro dos mistérios descobertos | estantes e mesa de leitura | a decidir (não desenhado) |
| Alquimia e Ervas | sim | poções e elixires em moedas | bancada de frascos | proposta (não desenhado) |
| Estábulo e Montarias | sim | alugar e comprar montarias | baias | proposta (não desenhado) |
| Casa de Cura da Concórdia | sim | tratar veneno e queimadura | enfermaria | proposta (não desenhado) |
| 4 casas do Bairro Oeste, 2 do Leste | não | só fachada | — | não desenhadas |
| Celeiros da Capital | não | só fachada | — | não desenhado |

O Templo não cura: ele é o lugar de renascimento, então não se sobrepõe à Hospedaria nem à Casa de Cura. Decisão do dono (2026-11-22): uma bênção temporária de vida máxima serviria pouco; o renascimento serve mais, e deixa espaço para uma NPC e uma missão do Templo depois. A Casa de Cura, quando for desenhada, trata veneno e queimadura.

## O banco (Casa da Moeda)

Decisão do dono (2026-11-21): em vez de trocar moedas, o morador da Casa da Moeda é um **banqueiro** que guarda o dinheiro do jogador, **com juros**. Hoje o herói não perde moedas ao morrer, então os juros é que dão motivo para depositar.

Regra entregue (ADR 0063), com os números confirmados pelo dono:
- **Depositar e sacar** qualquer quantia, só no balcão do banco. O saldo vai no save, separado da carteira.
- **Juros:** 0,5% a cada 10 minutos de jogo (3% por hora), contados só pelo relógio da aventura: nada rende com o jogo fechado, o que evita ganho sem jogar e mantém o resultado igual em qualquer tela.
- **Teto dos juros:** só rendem os primeiros 10.000 Terrania Gold do saldo (no máximo 300 por hora). Um chefe que deixe uma Eclipse Crown não vira máquina de dinheiro.
- **Pagamento:** os juros entram no saldo quando o herói fala com o banqueiro (cálculo na hora, sem rodar nada em segundo plano), com acúmulo de no máximo 24 horas de jogo entre visitas.
- **Teto do saldo:** o mesmo da carteira (`MAX_COINS`), e o save normaliza o saldo como as outras moedas.

Se um dia a morte passar a tirar moedas da carteira, o banco ganha um segundo uso sem mudar nada.

## O Templo (renascimento)

Decisão do dono (2026-11-22): o Templo da Concórdia é **onde o herói renasce**. Como a capital fica a uns 800 tiles da Vila, a escolha é do jogador:
- O herói **começa renascendo na Vila da Travessia**, como sempre foi.
- Ao falar com a **sacerdotisa (Irmã Maelis)** no Templo, escolhe **renascer no Templo** (à porta do edifício) ou **voltar à Vila**. A escolha vale até mudar e fica no save.
- Cada cidade que tiver templo vira uma opção (o Poço Negro, no futuro).
- A sacerdotisa é também o ponto de partida natural de uma futura missão do Templo.

## Moradores

Cada interior com serviço tem um morador na frente da porta (como a Madame Víbora no Poço Negro). Hoje: **Dona Brígida**, hospedeira da Hospedaria (`innkeeper.ts`), **Mestre Aurélio**, banqueiro da Casa da Moeda (`banker.ts`), e **Irmã Maelis**, sacerdotisa do Templo (`priestess.ts`), e **Mestra Ilvana**, da Academia Arcana (`mageMaster.ts`), todos em `src/npcs/center/capital/`.

## Ordem de trabalho

1. Hospedaria (piloto, feito).
2. Casa da Moeda (banco, feito) e Templo (renascimento, feito).
3. Conselho, Quartel e as três guildas, quando o dono decidir a função de cada um.
4. Só depois, os 13 terrenos que faltam desenhar (Ofícios e Bairro Residencial, porta ao norte, vistos de trás), e apenas os que têm função.
