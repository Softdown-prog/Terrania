# ADR 0115 — O teste das masmorras de três andares solta a tecla dentro da página

**Estado:** entregue em 2026-11-28. Segue o endurecimento da CI iniciado no [ADR 0107](0107-transicao-suave-do-solo.md) (`cave-floors` e o rastro guardado como artefato).

## O que aconteceu
No CI do commit do A1c-3 (execução 46110803829, executor lento: a suíte levou 1,0 h em vez de uns 40 min), o teste `cave-floors` do **desktop** falhou nas duas tentativas com "o herói não chegou ao destino" (8,5 min cada, 300 passos), enquanto o do Android passou em 26 s e os outros 306 testes passaram. Era a mesma família das falhas 732, 734, 736 e 743. O rastro de 663 MB foi guardado, mas vem de um endereço de armazenamento que o proxy deste ambiente não alcança, então a causa **não pôde ser lida**; a CPU lenta simulada (fatores 6, 9 e 16) também não a reproduziu (o teste só fica mais lento).

## Hipótese e o que mudou
O herói não parou (a contagem de "parado" não disparou) nem saiu da caverna: ele andou 300 passos sem chegar. O que fica de pé é um **vai e volta**: o teste segura a tecla e solta quando lê, pelo navegador, que o herói chegou ao tile; cada leitura mais a soltura custam idas e voltas que, num executor lento, chegam a segundos. Nesse intervalo o herói (126 px/s) passa um ou mais tiles do ponto, a rota é refeita para voltar, passa de novo, e assim por diante.

- **A tecla é solta dentro da página** (`holdUntil` em `tests/browser/cave-floors.spec.ts`): um laço em `requestAnimationFrame` lê `#coords` e, no quadro em que o herói chega ao tile do trecho (ou o andar muda, ou o prazo acaba), manda o `keyup` do próprio jogo. O atraso cai de segundos para um quadro.
- **Quando falhar, o erro diz por onde o herói andou**: os últimos 24 tiles vão em todas as mensagens ("não chegou", "parou", "passou N vezes"), e passar **8 vezes pelo mesmo tile** falha na hora (era 8,5 min de espera), em vez de girar os 300 passos.

## Resultado e limites
O teste passa em 25 s (desktop) e 21 s (Android), e com a CPU 9 vezes mais lenta em 1,3 min (antes, 1,5 min). **Isto não prova a causa**: se a falha voltar, o log da própria CI traz agora o trajeto. As tentativas (`retries: 1`) e o limite de 15 min ficam como estavam.
