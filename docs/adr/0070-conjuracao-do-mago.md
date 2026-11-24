# ADR 0070 — A conjuração do Mago: pose, projétil e estouro

**Estado:** entregue em 2026-11-24, direto na `main`, por pedido do dono (primeira metade da fatia E do [ADR 0065](0065-heroi-mago-fundacao.md)). A segunda metade (a barra de mana na tela) é a entrega seguinte. Antes desta entrega o Mago causava dano mas não se via nada; agora a magia tem corpo.

## Decisões

1. **Só apresentação.** A simulação continua igual (ADR 0069): o dano é aplicado no instante da saída. O que se vê descobre a saída pela queda de vida do monstro (como já fazia o `Effects`) e atrasa só o que se desenha. Nenhum número de jogo mudou.
2. **A pose de conjurar** (`render/spells/castPose.ts`, `heroPose.staffMount`): no **preparo** (0,12 s) a mão recua e sobe, o cajado se inclina para trás e a gema acende; na **saída** o cajado vai para a frente, na direção do alvo (à esquerda é o espelho; de frente e de costas ele só avança e sobe); depois a carga e o clarão baixam. O corpo faz um passo curto para trás e um balanço bem menor que o do golpe de espada (o Mago não investe contra o alvo) e fica parado no instante da saída. Tudo vem de `castPhase(attackTime, windup)`, a mesma regra de tempo de `Player.consumeStrike`.
3. **A gema carregando** (`paintStaffHead(..., charge)`): com carga, uma auréola maior, um núcleo claro e quatro faíscas em órbita. Com carga 0 o desenho é **idêntico** ao de antes (conferido por assinatura).
4. **O projétil** (`render/spells/bolt.ts`): uma cabeça luminosa com cauda de cometa, fio de luz, faíscas e brilho em cruz; sai da **gema** (a ponta do cajado, `staffTip`) e voa até o **peito** do alvo. O voo dura distância ÷ 1100 px/s, entre 0,05 s e 0,2 s. As cores vêm da gema da ficha do cajado: cada cajado novo (fatia G) já nasce com a cor dele.
5. **O estouro** (`render/spells/burst.ts`): clarão, anel que se abre, brasa, raios e faíscas que caem, e o número do dano (`−8`) na cor da gema. Quem **derrota** o alvo ganha um estouro maior (anel extra, oito raios, 0,52 s em vez de 0,34 s). Sem sorteio: tudo é função da idade, então a cena é reproduzível.
6. **Quem cuida** (`render/spells/SpellBolts.ts`): uma classe só, usada na superfície (dentro do `Effects`, que não mistura o impacto de espada na magia) e na **caverna** (`caveMode` alimenta, `renderCave` desenha). Limites: 12 projéteis, 16 estouros e 16 números ao mesmo tempo. Com os efeitos desligados (ajuste de desempenho) só o projétil aparece. O abate é reconhecido como nos golpes de espada: o monstro some ao alcance da magia com vida de uma magia.
7. **Ligação com a tela:** a superfície e a caverna agora dizem à cena a vocação e o cajado do herói (`playerClass`); antes o Mago seria desenhado como Cavaleiro.

## Contrato de arte

`drawSpellBolt` e `drawSpellBurst` (comum e de abate) e o engaste carregado estão registrados em `tests/helpers/artAssets.ts`, categoria das peças pequenas, **sem baixar piso e sem exceção**. A captura está em `docs/screenshots/mago-conjurando.png` (as quatro direções em seis instantes da conjuração, o projétil em quatro pontos do voo e o estouro comum e de abate).

## Verificação

- `tests/mage-cast.test.ts` (18): as fases e o corpo da conjuração, a mão e a ponta do cajado, a gema carregando, o herói conjurando (pose, braço, corpo e Cavaleiro intacto), o projétil e o estouro, o disparo só por magia, o tempo de voo, a duração do estouro e do abate, o limite de projéteis e as entradas inválidas, a integração com `Effects` e uma luta de verdade na simulação.
- `tests/browser/mage-cast.spec.ts`: um Mago salvo, um monstro real, desktop e Android; o teste mede os pixels violeta na tela durante a magia contra o cajado parado, confere a mana gasta e o alvo derrotado, e falha se o desenho da magia sair.
- O Cavaleiro continua idêntico (as mesmas 216 poses) e o Mago parado também (mesma assinatura antes e depois).
- Mutações: **68** estragos de propósito (cada fase, cada número da pose, a gema, o projétil, o estouro, o disparo, os limites, o `Effects`, a vocação no desenho e a ligação com as telas). Dezenove sobreviveram na primeira rodada e viraram teste (a mão em y, as faíscas que giram, o tamanho do número, a duração do abate, o projétil girando para o alvo, o braço seguindo o cajado, entre outros); hoje só sobrevive um equivalente (uma posição inválida já é descartada mais adiante, com o mesmo resultado).

## Limites

- **A barra de mana na tela ainda não existe** (próxima entrega da fatia E).
- O Mago ainda não é jogável (carta "Em breve"); a liberação é a fatia F2. Hoje ele só aparece com um save de Mago.
- O interior das casas e a prévia do inventário ainda não sabem a vocação (fatia F2).
- O projétil usa a cor da gema; elementos de gelo, fogo, veneno, raio e astral (efeitos diferentes por cajado) entram na fatia G.
- Sem medição de memória ou desempenho num celular de 2018; Android físico não foi testado.
