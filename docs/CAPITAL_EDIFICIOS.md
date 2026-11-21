# Concórdia — para que serve cada edifício e quais abrem

Registro da decisão do dono (2026-11-21): **não se desenha mais edifício sem saber para que ele serve.** Regra: **só entra quem tem função de jogo.** Dos 21 terrenos, **14 abrem** (têm porta, interior e função) e **7 são só fachada** (casas e celeiros, sem interior). Os nomes são de trabalho; o dono ajusta.

Quando um terreno ganha função, ele entra em `CAPITAL_ENTERABLE` (`src/world/center/capital/buildings.ts`): a porta, o interior e o nome do lugar no painel saem daí. As funções marcadas "proposta" ainda esperam o dono confirmar; as marcadas "a decidir" dependem da história.

## Os 21 terrenos

| Terreno | Entra? | Função | Interior (molde) | Estado |
| --- | --- | --- | --- | --- |
| Hospedaria dos Viajantes | sim | descansar por moedas (vida cheia, sem veneno nem queimadura) | estalagem: duas camas e balcão | **pronto** (ADR 0062) |
| Templo da Concórdia | sim | cura e bênção | nave com altar | proposta |
| Casa da Moeda e dos Mercadores | sim | **banco**: guarda o dinheiro do herói e paga juros (ver "O banco") | balcão com grade e cofre | decidido pelo dono (2026-11-21); regra de juros proposta, a confirmar |
| Salão do Conselho dos Povos | sim | missões e decretos da capital | salão com mesa do conselho | a decidir (história) |
| Quartel da Guarda | sim | missões de caça e defesa | sala de armas | a decidir (história) |
| Salão da Ordem dos Cavaleiros | sim | guilda do cavaleiro | salão de guilda | a decidir |
| Academia Arcana | sim | guilda do mago | salão de guilda | a decidir |
| Irmandade dos Arqueiros | sim | guilda do arqueiro | salão de guilda | a decidir |
| Forjas da Travessia | sim | comprar e melhorar armas | forja com bigorna | proposta (edifício ainda não desenhado) |
| Mercado Coberto | sim | comprar e vender itens | balcões de feira | proposta (não desenhado) |
| Arquivo dos Exploradores | sim | registro dos mistérios descobertos | estantes e mesa de leitura | a decidir (não desenhado) |
| Alquimia e Ervas | sim | poções e elixires em moedas | bancada de frascos | proposta (não desenhado) |
| Estábulo e Montarias | sim | alugar e comprar montarias | baias | proposta (não desenhado) |
| Casa de Cura da Concórdia | sim | tratar veneno e queimadura | enfermaria | proposta (não desenhado) |
| 4 casas do Bairro Oeste, 2 do Leste | não | só fachada | — | não desenhadas |
| Celeiros da Capital | não | só fachada | — | não desenhado |

A Casa de Cura e o Templo se sobrepõem (as duas curam): antes de desenhar a Casa de Cura, decidir o que a separa do Templo (por exemplo, o Templo abençoa e a Casa de Cura trata).

## O banco (Casa da Moeda)

Decisão do dono (2026-11-21): em vez de trocar moedas, o morador da Casa da Moeda é um **banqueiro** que guarda o dinheiro do jogador, **com juros**. Hoje o herói não perde moedas ao morrer, então os juros é que dão motivo para depositar.

Regra proposta (os números esperam confirmação do dono):
- **Depositar e sacar** qualquer quantia, só no balcão do banco. O saldo vai no save, separado da carteira.
- **Juros:** 0,5% a cada 10 minutos de jogo (3% por hora), contados só pelo relógio da aventura: nada rende com o jogo fechado, o que evita ganho sem jogar e mantém o resultado igual em qualquer tela.
- **Teto dos juros:** só rendem os primeiros 10.000 Terrania Gold do saldo (no máximo 300 por hora). Um chefe que deixe uma Eclipse Crown não vira máquina de dinheiro.
- **Pagamento:** os juros entram no saldo quando o herói fala com o banqueiro (cálculo na hora, sem rodar nada em segundo plano), com acúmulo de no máximo 24 horas de jogo entre visitas.
- **Teto do saldo:** o mesmo da carteira (`MAX_COINS`), e o save normaliza o saldo como as outras moedas.

Se um dia a morte passar a tirar moedas da carteira, o banco ganha um segundo uso sem mudar nada.

## Moradores

Cada interior com serviço tem um morador na frente da porta (como a Madame Víbora no Poço Negro). Hoje: **Dona Brígida**, hospedeira da Hospedaria (`src/npcs/center/capital/innkeeper.ts`).

## Ordem de trabalho

1. Hospedaria (piloto, feito).
2. Templo e Casa da Moeda, que já têm edifício desenhado e função clara.
3. Conselho, Quartel e as três guildas, quando o dono decidir a função de cada um.
4. Só depois, os 13 terrenos que faltam desenhar (Ofícios e Bairro Residencial, porta ao norte, vistos de trás), e apenas os que têm função.
