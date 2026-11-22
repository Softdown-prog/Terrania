# ADR 0063 — Capital: o banco da Casa da Moeda (Mestre Aurélio, saldo e juros)

**Estado:** entregue em 2026-11-22, direto na `main`, por pedido do dono: o morador da Casa da Moeda não troca moedas, **guarda o dinheiro do jogador**, e a regra de juros é a proposta registrada em [CAPITAL_EDIFICIOS.md](../CAPITAL_EDIFICIOS.md) (o dono confirmou com "vamos continuar"). Segunda porta da capital, depois da Hospedaria (ADR 0062).

## Decisões

1. **Porta e interior:** `casa-da-moeda` entra em `CAPITAL_ENTERABLE`; a porta, o nome do lugar ("Interior · Concórdia") e a paleta vêm do mesmo caminho da Hospedaria. A sala tem duas estantes de livros-razão e o balcão do banqueiro.
2. **Banqueiro:** **Mestre Aurélio** (nome de trabalho) fica na rua, a 2 tiles da porta, com a balança na mão (`npcs/center/capital/banker.ts`).
3. **O banco** (`engine/character/center/bank/`, um arquivo por assunto: regras, estado, normalização, juros, resultados e a classe `Bank`). O saldo é um número inteiro em Terrania Gold, **separado da carteira**, com o mesmo teto (`MAX_COINS`).
4. **Juros** (inteiros, para dar o mesmo resultado em qualquer tela): **5 por mil a cada 600 s de jogo**, simples, por período inteiro, arredondados para baixo e **só sobre os primeiros 10.000** do saldo (no máximo 300 por hora). Entre duas visitas rendem **no máximo 144 períodos (24 h de jogo)**: o que passa disso se perde, a sobra de um período incompleto fica para a próxima vez. Sem saldo nada rende, e o primeiro depósito começa o relógio dos juros nele (o tempo antes não rende).
5. **Quando os juros entram:** ao começar a conversa com o banqueiro e antes de todo depósito ou saque (nada roda em segundo plano). O relógio é o **da aventura**, que só anda enquanto se joga: com o jogo fechado nada rende.
6. **Guardar e retirar:** botões de 100, 1.000 e "tudo", só com a conversa aberta, ao lado do banqueiro, fora de interior e com o herói de pé. Guarda ou tira menos se faltar dinheiro, saldo ou espaço (carteira ou cofre cheios); cada recusa diz o motivo e não mexe em nada. Quantia que não é número (NaN, infinito) vale zero.
7. **Save:** `bank {balance, interestAt}` só existe com saldo; conta zerada não ocupa espaço. Tudo é normalizado ao carregar (saldo inteiro de 0 ao teto, data de juros nunca no futuro). **Correção que o banco exigiu:** `loadLocalSave` **descartava o relógio da aventura (`time`)**, que voltava a zero a cada abertura do jogo; agora ele volta com o save, e é por ele que os juros contam.
8. **Tela:** painel do banco no diálogo (carteira, saldo, uma linha de botões para guardar e outra para retirar, a regra dos juros); o saldo vai pelo `GameUi.updateBank`.

## Verificação

- `tests/center-bank.test.ts` (12): as regras combinadas; juros contados à mão (períodos, teto de 10.000, 300 por hora, arredondamento, 24 h, sobra de período, sem saldo, relógio para trás); depósito e saque nos limites; juros pagos antes de cada operação; primeiro depósito; banco do save com lixo; save e relógio do jogo e do navegador; quantias inválidas.
- `tests/center-capital-bank.test.ts` (8): a porta, a sala, o banqueiro (posição, ficha, fala, oferta), recusas, guardar, retirar, juros na operação e na conversa, e a fiação em `Game.ts` e na tela.
- `tests/browser/capital-bank.spec.ts` (desktop e Android): entrar e sair pela porta; conversar com 1.200 s de jogo e 2.000 no banco (20 de juros pagos e salvos), guardar, retirar, guardar tudo e retirar tudo, conferindo carteira, saldo e relógio no save.
- Os testes da Hospedaria passaram a contar duas portas.
- Mutações: 22 estragos de propósito (teto, 24 h, taxa, período, data futura, tetos da carteira e do cofre, NaN, conta vazia no save, relógio e banco perdidos ao carregar, distância, queda, porta fechada, oferta, saldo na tela...); os testes pegaram todos. Um teste achou, antes da entrega, que uma quantia NaN corrompia o saldo; foi corrigido.

## Limites

- Hoje a morte não tira moedas da carteira, então o banco vale pelos juros. Se a morte passar a custar moedas, o banco ganha outro motivo sem mudar nada.
- A taxa e o teto de juros são números de jogo: o dono pode ajustar em `constants.ts` e no texto do painel e da fala do banqueiro.
- Só a Hospedaria e o banco abrem; os outros edifícios seguem fechados até terem função e interior.
- Android físico não foi testado.
