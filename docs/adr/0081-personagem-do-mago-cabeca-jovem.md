# ADR 0081 — O personagem do Mago, lote M1: cabeça e rosto próprios e cabelo solto

**Estado:** entregue em 2026-11-26, direto na `main`, por pedido do dono (proposta e etapas em [`docs/MAGO_APARENCIA.md`](../MAGO_APARENCIA.md)). O Mago deixa de ser "o Cavaleiro de chapéu": **ganha cabeça, rosto e cabelo próprios**. Este é o lote M1, só o **Mago jovem**; a barba e o cabelo que envelhecem com o nível (M2) e o corpo que se fortalece (M3) vêm nos próximos lotes.

## Decisões

1. **A cabeça é da vocação** (`HeroLook.head`, opcional): se a aparência traz a cabeça, `renderHero` a usa no lugar do rabo de cavalo, do cabelo-base, do rosto e da franja do Cavaleiro (que continuam no mesmo código, no `else`). O chapéu e o elmo vêm depois, por cima. As aparências do Mago sempre trazem a cabeça, mesmo sem nenhuma roupa vestida.
2. **O quadro do rosto vem do herói** (`HeroDrawContext`: `closed`, `fierce`, `shout`, `hurting`): a piscada, o dano que fecha os olhos, o franzir e a boca aberta ao golpear ou ao ser ferido saem do mesmo cálculo do Cavaleiro; a cabeça do Mago só os lê.
3. **O personagem** (`render/hero/mage/head.ts` e `body/`): rosto mais comprido e fino que o do Cavaleiro (queixo marcado), olhos azul-acinzentados com cílios, sobrancelhas finas, nariz e boca pequenos; cabelo castanho-escuro, mais frio que o do Cavaleiro; **solto, nunca amarrado**: mechas de trás que caem até perto dos ombros e balançam com a inércia do passo (`tailSway`), franja repartida de lado e mechas curtas que emolduram o rosto; de costas, o cabelo cobre a nuca. A pele é a mesma do Cavaleiro (decisão da proposta). Um arquivo por assunto: paleta, cabelo de trás, rosto e cabelo da frente.
4. **O Cavaleiro não muda**: 40 poses dele (cinco direções, andando, golpeando, ferido, com e sem armadura) dão exatamente o mesmo desenho do commit anterior (resumo guardado no teste).
5. **Arte**: a cabeça é registrada no contrato de arte de frente e de lado, sem baixar piso. De costas é só cabelo, sem cores para o piso das peças; essa vista é testada pelo desenho do herói (quantidade de olhos, rosto ausente, cabelo que cobre a nuca e balança). Os pintores internos (`hairBack`, `face`, `hairFront`) recebem o quadro antes do canvas por serem detalhes da cabeça, não peças avulsas.

## Verificação

- `tests/mage-head.test.ts` (8): o Mago não tem nenhuma cor da cabeça do Cavaleiro (olho, cabelo, faixa) em três direções e o Cavaleiro tem; a cabeça existe com e sem roupa; o Cavaleiro igual a antes (resumo de 40 poses); dois olhos de frente, um de lado, nenhum de costas; o rosto reage (pálpebra, boca, boca mais aberta ao ferir, as duas sobrancelhas se inclinam); o cabelo da frente e o de trás balançam e a quantidade de camadas de cabelo por vista; a ligação em `actors.ts` (a cabeça entra no lugar da do Cavaleiro e antes do chapéu, com o quadro do rosto vindo do herói); o registro de arte.
- Mutações: **22** estragos de propósito (cada olho, a pálpebra, o franzir, a boca e o dano, o balanço, o rosto de costas, cada camada de cabelo, o uso da cabeça própria, o quadro do rosto, as cores do Cavaleiro e a pele). Três passaram batido na primeira rodada (a sobrancelha inclinava só de um lado, o balanço das mechas da frente e a franja removida) e foram fechadas com testes novos; as 22 foram pegas.
- Captura: `docs/screenshots/mago-personagem-jovem.png` (de frente, de lado e de costas).

## Limites

- Só o Mago jovem. O nível ainda não chega ao desenho; ele passa a chegar no M2, junto com as etapas (barba, cabelo e cor por nível).
- O cabelo de lado (perfil) mostra uma mecha de cada vez, a de trás da cabeça; o desenho do perfil é simples e pode ganhar volume no acabamento (M3).
- As cores e as formas são propostas do dono (ajustam-se em `render/hero/mage/body/`). Android físico não foi testado.
