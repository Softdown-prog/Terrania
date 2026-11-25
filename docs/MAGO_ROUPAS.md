# As roupas do Mago

**Proposta** do dono (2026-11-25), no mesmo molde dos cajados ([MAGO_CAJADOS.md](MAGO_CAJADOS.md)), seguida com as opções recomendadas. **Todos os números são propostas que o dono ajusta.** **Feito:** o lote A1 ([ADR 0078](adr/0078-roupas-do-mago.md)): o Mago veste, com o conjunto do Aprendiz. O lote A2 ([ADR 0079](adr/0079-atributos-das-roupas-do-mago.md)): os bônus de mana máxima, recarga de mana e dano das magias funcionam no motor. **A fazer:** os conjuntos dos níveis 10 em diante, com os números reais (lotes B a E).

## Onde estamos hoje

- O Cavaleiro tem só o **kit inicial** de 9 peças (defesa de 0 a 2, no total 3), e o desenho do herói só reconhece essas peças pelo nome. **Não existe progressão de roupas por nível**; a do Mago será a primeira.
- O Mago **ainda não pode vestir nada** (decisão do F2, [ADR 0072](adr/0072-mago-jogavel.md)): o inventário dele só mostra o cajado.
- Só existe **defesa** como atributo de roupa. **Mana máxima, recarga de mana e dano das magias não existem** e entram junto com as roupas.
- A defesa tira um número fixo do dano de contato dos monstros (de 6 a 40, mínimo 1 de dano). O Mago tem 80% da vida do Cavaleiro (872 no nível 100).

## A regra

- **Onze conjuntos, um para cada cajado** (o Aprendiz e os dez elementais), no mesmo nível e com o mesmo tema: o Mago de nível 45 usa o conjunto do Espinheiro, o de nível 100 o Astral.
- **Sete peças por conjunto** (as sete que o Mago usa, 77 no total): **chapéu**, **túnica** (peitoral), **calça**, **botas**, **livro de magias** (o escudo do Mago: ocupa a mão livre), **anel** e **colar**. Ficam de fora a **mochila** (hoje é só enfeite, sem efeito) e as **flechas** (são dos arqueiros).
- **Quem usa:** as peças são só do Mago, e o kit do Cavaleiro continua só dele. O Cavaleiro não muda em nada.
- **O que cada peça dá** (cada uma tem um papel, para não virar tudo igual):
  - **Túnica, calça, livro, chapéu e botas: defesa**, em partes de 35%, 20%, 20%, 15% e 10% da defesa total do conjunto.
  - **Chapéu: mana máxima.** **Colar: recarga de mana.** **Anel e livro: dano das magias.**
- **Defesa total do conjunto** = nível ÷ 4 (arredondado, mínimo 1): 25 no nível 100 (o kit inicial do Cavaleiro soma 3), longe de tornar o Mago imune: um monstro de 40 de dano de contato passa a dar 15.
- **Bônus de mana máxima e de recarga** = nível ÷ 5 por cento (20% no nível 100); **bônus de dano** = nível ÷ 10 por cento, dividido entre o anel e o livro (10% no nível 100). Tudo vale em porcentagem para acompanhar a mana do nível sem conta nova.
- **Como se consegue (recomendada):** cada peça **libera sozinha no nível do conjunto**, como as espadas e os cajados, sem compra. *Alternativas:* comprar na Academia Arcana com moedas, ou sair de monstros e chefes.
- **O Mago nasce** com o **conjunto do Aprendiz** já vestido (o desenho de hoje: chapéu pontudo azul-noite, túnica e botas), como o Cavaleiro nasce com o kit inicial.
- Quando o Mago passa de nível, **vale o que ele escolher vestir**: pode misturar peças de conjuntos diferentes (por exemplo, o chapéu do gelo com o anel do raio).

## Os conjuntos (números)

| Nível | Conjunto (do cajado) | Tema | Defesa total | Túnica | Calça | Livro | Chapéu | Botas | Mana máx. (chapéu) | Recarga (colar) | Dano (anel e livro) |
| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | Aprendiz | arcano comum | 1 | 1 | 0 | 0 | 0 | 0 | +0% | +0% | +0% (0+0) |
| 10 | Brisa | vento | 2 | 1 | 1 | 0 | 0 | 0 | +2% | +2% | +1% (1+0) |
| 15 | Rocha Viva | terra | 4 | 1 | 1 | 1 | 1 | 0 | +3% | +3% | +2% (1+1) |
| 20 | Marés | água | 5 | 2 | 1 | 1 | 1 | 0 | +4% | +4% | +2% (1+1) |
| 30 | Brasa Rubra | fogo | 8 | 3 | 2 | 1 | 1 | 1 | +6% | +6% | +3% (2+1) |
| 45 | Espinheiro | natureza | 11 | 4 | 2 | 2 | 2 | 1 | +9% | +9% | +4% (2+2) |
| 60 | Geada Boreal | gelo | 15 | 5 | 3 | 3 | 2 | 2 | +12% | +12% | +6% (3+3) |
| 70 | Sol Nascente | luz | 18 | 6 | 4 | 3 | 3 | 2 | +14% | +14% | +7% (4+3) |
| 80 | Lua Negra | sombra | 20 | 7 | 4 | 4 | 3 | 2 | +16% | +16% | +8% (4+4) |
| 90 | Tempestade | raio | 22 | 8 | 5 | 4 | 3 | 2 | +18% | +18% | +9% (5+4) |
| 100 | Astral | astral | 25 | 9 | 5 | 5 | 4 | 2 | +20% | +20% | +10% (5+5) |

Defesa, em pontos de defesa por peça (a soma de cada linha é a defesa total). Conjuntos baixos têm peças de defesa 0, como o kit inicial do Cavaleiro; nelas o que vale é o bônus.

## As peças (nomes)

| Nível | Chapéu | Túnica | Calça | Botas | Livro de magias | Anel | Colar |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 1 | Chapéu de Aprendiz | Túnica de Aprendiz | Calça de Aprendiz | Botas de Aprendiz | Caderno de Feitiços | Anel de Latão | Pingente de Cristal Baço |
| 10 | Chapéu de Penas | Túnica da Brisa | Calça do Vento Leve | Botas de Sopro | Compêndio das Brisas | Anel do Sopro | Colar de Pena e Vidro |
| 15 | Capuz de Rocha Viva | Túnica de Cascalho | Calça de Seixos | Botas de Pedra Lisa | Tomo de Pedra | Anel de Ocre | Colar de Geodo |
| 20 | Chapéu de Concha | Túnica das Marés | Calça de Algas | Botas de Espuma | Livro das Marés | Anel de Pérola | Colar de Coral |
| 30 | Chapéu de Brasa | Túnica Ardente | Calça de Cinzas | Botas de Carvão | Livro de Chamas | Anel de Brasa | Colar de Cinza Viva |
| 45 | Coroa de Folhas | Túnica de Cipó | Calça de Raízes | Botas de Musgo | Herbário Vivo | Anel de Espinho | Colar de Sementes |
| 60 | Capuz de Geada | Túnica Boreal | Calça de Cristal Frio | Botas de Gelo Azul | Livro da Geada | Anel de Cristal Boreal | Colar de Floco de Neve |
| 70 | Chapéu do Alvorecer | Túnica do Sol | Calça Dourada | Sandálias de Ouro | Livro da Aurora | Anel Solar | Colar do Sol Nascente |
| 80 | Capuz da Lua Negra | Manto Noturno | Calça de Sombra | Botas de Penumbra | Livro das Sombras | Anel da Lua Escura | Colar de Ônix |
| 90 | Chapéu de Cobre | Túnica do Trovão | Calça Condutora | Botas de Faísca | Livro das Tempestades | Anel de Relâmpago | Colar de Bobina |
| 100 | Chapéu Estrelado | Túnica Estrelada | Calça Celeste | Botas de Poeira de Estrela | Grimório Astral | Anel das Constelações | Colar Astral |


## O desenho

- Cada peça tem um **desenho próprio** no corpo do Mago, no mesmo padrão dos cajados (uma ficha de aparência por peça e um arquivo por peça, tudo no contrato de arte): o **chapéu** troca o chapéu, a **túnica** a cor e a estampa, a **calça** e as **botas** as pernas e os pés, o **livro** aparece na mão livre (aberto, flutuando ou preso à cintura), o **anel** e o **colar** são detalhes pequenos (o anel brilha na mão, o colar no peito).
- O desenho do herói hoje reconhece as 9 peças do Cavaleiro por nome fixo; vira **dado por peça** (como os cajados), e o Cavaleiro continua igual.
- Cada peça nova é registrada em `tests/helpers/artAssets.ts`, sem baixar piso. São **77 peças**: por isso entram em lotes.

## Os lotes (proposta)

1. **Lote A1 (feito, [ADR 0078](adr/0078-roupas-do-mago.md)):** o Mago passa a vestir (os oito espaços dele no inventário, sem mochila e sem flechas), a regra de vocação das peças e o **conjunto do Aprendiz** completo (sete peças desenhadas no corpo do Mago e com ícone). O Cavaleiro não muda.
2. **Lote A2 (feito, [ADR 0079](adr/0079-atributos-das-roupas-do-mago.md)):** os três atributos novos no motor (mana máxima, recarga de mana, dano das magias), na superfície e na caverna, com o texto no inventário. As peças do Aprendiz seguem sem bônus; os números reais entram com cada conjunto.
3. **Lote B:** Brisa, Rocha Viva e Marés (níveis 10, 15 e 20).
4. **Lote C:** Brasa Rubra, Espinheiro e Geada Boreal (níveis 30, 45 e 60).
5. **Lote D:** Sol Nascente, Lua Negra e Tempestade (níveis 70, 80 e 90).
6. **Lote E:** o Astral (nível 100).

## Decidido (as opções recomendadas, seguidas em 2026-11-25; o dono ajusta quando quiser)

1. **Como se consegue:** libera no nível (adotada). *Alternativas:* comprar ou sair de monstros.
2. **Os números:** defesa total = nível ÷ 4, e bônus de 20% de mana máxima, 20% de recarga e 10% de dano no topo (adotados). Ficam em `src/engine/character/` e mudam com uma linha.
3. **Os nomes:** os 77 acima são de trabalho e se trocam à vontade. Os sete do Aprendiz já estão no jogo.
4. **Misturar conjuntos** é livre (adotado). *Não proposto aqui:* bônus por conjunto completo; entra depois se o dono quiser.
5. **Mochila e flechas:** ficam de fora para o Mago (adotado).
6. **Armaduras do Cavaleiro:** o Cavaleiro continua só com o kit inicial. Uma progressão de armaduras para ele seria uma entrega própria, depois (em aberto).
