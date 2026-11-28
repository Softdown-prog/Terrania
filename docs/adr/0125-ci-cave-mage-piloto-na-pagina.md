# ADR 0125 — O teste do Mago na caverna pilota o herói dentro da página

**Estado:** entregue em 2026-11-28. Segue o endurecimento da CI do [ADR 0115](0115-ci-masmorra-solta-a-tecla-na-pagina.md) (`cave-floors`).

## O que aconteceu
No CI do commit das roupas do Arqueiro (A6a, execução 46168033500, executor lento: a suíte levou 51 min em vez de uns 35), o teste `cave-mage` do **desktop** falhou com "o Mago chegou perto do slime seguindo o caminho" depois de 3,6 min, enquanto o do Android e os outros 322 testes passaram. O log mostra o herói parado no tile 19,15 ("caminho 13/25") nos passos 100, 200 e 300, com a vida intacta, e cada volta do laço levando cerca de 0,7 s (no computador de desenvolvimento são centésimos). O commit só mexia em roupas do Arqueiro, nada que o Mago use; o teste passou nos CIs de antes e passa aqui.

## Hipótese e o que mudou
Como no `cave-floors`: o piloto decidia **pelo teste**, com três idas e voltas ao navegador por decisão (ler `#coords`, escolher a tecla, segurá-la). Numa volta de 0,7 s o herói (126 px/s, uns 3 tiles) passa do tile do passo seguinte, a rota é refeita para voltar, passa de novo, e o Mago fica indo e voltando sem chegar.
- **O piloto mora dentro da página** (`requestAnimationFrame`): a cada quadro lê `#coords`, acha o ponto do caminho mais perto e segura a tecla para o seguinte, mandando `keydown`/`keyup` sintéticos para a janela (o jogo lê `event.code` nela, como o `holdUntil` do `cave-floors`). O atraso cai de segundos para um quadro.
- **Quando falhar, o erro diz por onde o herói andou:** o estado final (`chegou`, `sem avançar no caminho` por 60 s, `prazo` ou `saiu da caverna`), o ponto do caminho alcançado, a vida e os **últimos 24 tiles**.
- **Uma repetição** (`retries: 1`), como no `cave-floors`; o Playwright a mostra como "flaky".

## Resultado e limites
O teste passa em 14 s (desktop) e 11 s (Android), e com a CPU 8 vezes mais lenta passou 4 de 4 vezes (38 s com 6 vezes). **Isto não prova a causa:** a versão antiga também passa com a CPU 6 vezes mais lenta (42 s) e as duas falham do mesmo jeito com 12 vezes, numa etapa anterior à caminhada (o botão "Entrar" demora a aparecer); a trava do CI não foi reproduzida. Se ela voltar, o log da própria CI traz agora o trajeto.
