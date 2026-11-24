# ADR 0071 — A barra de mana na tela

**Estado:** entregue em 2026-11-24, direto na `main`, por pedido do dono (segunda metade da fatia E do [ADR 0065](0065-heroi-mago-fundacao.md)). Com ela o Mago sabe quantas magias ainda tem; antes só a conjuração (ADR 0070) mostrava que a mana existia.

## Decisões

1. **Uma barra ao lado da vida, só para quem usa mana.** O Cavaleiro (mana máxima 0) não ganha barra nem espaço novo na tela. O Mago vê, logo abaixo da vida, o texto `MANA 32 / 50` e uma barra fina violeta (a cor da gema do cajado de Aprendiz).
2. **O número é inteiro e sem arredondar para cima** (`32,9` aparece como `32`): a mana anda por frações a cada quadro, e mostrar `33` quando ainda faltam décimos para o 33 enganaria quem conta as magias.
3. **O aviso de pouca mana** acende quando a mana exata é **menor que o custo de uma magia** do cajado em mãos (5 no de Aprendiz): a barra e o número ficam vermelhos e o leitor de tela diz "sem mana para uma magia". É a mesma conta da simulação (`manaPoints >= custo`), então o aviso some no instante em que a próxima magia sai.
4. **A leitura é uma função pura do motor** (`engine/character/classes/manaMeter.ts`: `manaMeter` e `sameManaMeter`); o jogo só a repassa ao HUD (`Game.updateHud`) e o HUD só a guarda. O sinal do HUD compara pelo que se vê (número inteiro, máximo, porcentagem e aviso), então o Angular **não** redesenha a cada quadro: só a cada ~0,4 s, quando a mana sobe 1.
5. **A mesma barra na superfície, na caverna e dentro de casas**, porque a mana vive na simulação (que o relógio da caverna e o dos interiores já fazem andar, ADR 0069).
6. **Celular:** barra de 5 px (a de vida tem 6), margem menor, sem mexer no painel de missão: o teste confere que a barra não o cobre nem passa da tela (390 px de largura).

## Verificação

- `tests/mana-meter.test.ts` (4): a leitura (inteiro, máximo, porcentagem, aviso no custo exato, valores inválidos), a leitura a partir da simulação de verdade (Cavaleiro sem barra; Mago gasta, zera, recupera; o máximo sobe com o nível), a igualdade que evita redesenhar, e a ligação jogo → HUD → tela (texto, largura, aviso, vermelho).
- `tests/browser/mana-bar.spec.ts` (desktop e Android): o Cavaleiro não tem barra; o Mago vê a mana de um save e ela sobe com o tempo; a barra fica abaixo da de vida, cabe na tela e não cobre o painel de missão; com 1 de mana o aviso vermelho aparece e some em poucos segundos.
- Mutações: **27** estragos de propósito (arredondamento, valores inválidos, máximo, porcentagem, aviso no custo exato, a igualdade do HUD, o envio do jogo, o texto e a largura da tela, o vermelho). Seis sobreviveram na primeira rodada: os testes não separavam o número, o máximo e o aviso, e o aviso não olhava custos fracionários; todos viraram teste, e duas verificações redundantes foram removidas do código (uma mana inválida já não passa na comparação).

## Limites

- O inventário ainda se chama "do cavaleiro" e não mostra a mana; o inventário do Mago e a loja de cajados são da fatia F2.
- Só o cajado de Aprendiz existe: o aviso usa o custo dele (o do cajado equipado, quando houver mais de um).
- O Mago ainda não é jogável (carta "Em breve"); a liberação é a fatia F2.
- Sem medição em celular de 2018; Android físico não foi testado.
