# ADR 0067 — O corpo do herói Mago (túnica azul-violeta, manto escuro e chapéu pontudo)

**Estado:** entregue em 2026-11-23, direto na `main`, por pedido do dono (fatia B do [ADR 0065](0065-heroi-mago-fundacao.md)). O dono, diante das três ideias de visual (túnica azul-violeta com capuz, chapéu pontudo de feiticeiro e manto escuro e sombrio), pediu **um misto das três**.

## O visual

- **Túnica azul-violeta** (a cor da Academia Arcana) com decote em V e debrum dourado, abotoadura, cinto com fivela e bolsa, e uma **barra** que balança com o passo, com forro violeta à mostra, debrum dourado, sombra no pé e estrelinhas douradas bordadas.
- **Manto escuro azul-noite**, mais largo e mais longo que a túnica (de frente emoldura o corpo), com forro violeta, fio de prata nas bordas e estrelinhas douradas bordadas; o **capuz fica caído** sobre os ombros (de frente é uma gola escura, de costas aparece inteiro, com uma gema bordada). Um **fecho de prata com gema** prende o manto no pescoço.
- **Chapéu pontudo de feiticeiro** de abas largas, com a ponta caída que balança com o passo, faixa dourada com fivela de prata e gema, e uma estrela dourada no cone; de costas mostra a aba e o cone.
- As mangas são violeta, com punho um tom mais escuro (para a mão não parecer luva). O cabelo e o rosto são os do herói. **Não há cajado ainda** (fatia C): o Mago anda de mãos livres.

## Como foi feito

1. **Uma só função de herói.** O mago é desenhado pelo mesmo `renderHero` do Cavaleiro (mesmo andar, respiração, piscar, rosto e ordem de camadas), com `heroClass: "mage"` no `HeroVisual`. A vocação escolhe uma **aparência** (`render/hero/look.ts`): as cores da túnica e das mangas e quatro peças (barra, manto, detalhes do tronco e chapéu). Sem classe, é o Cavaleiro.
2. **Uma peça por arquivo** em `render/hero/mage/` (`hat.ts`, `cloak.ts`, `robe.ts`, `torso.ts`, `palette.ts`, `index.ts`), recebendo um `HeroDrawContext` (orientação, passo, inércia da capa, cabeça) que `renderHero` monta.
3. **O Cavaleiro não mudou.** As mudanças dele são só condicionais; conferi que **216 poses** (seis direções, três fases de passo, três de golpe, com e sem equipamento, com e sem dano) saem **idênticas, chamada por chamada**, antes e depois.
4. **O Mago não veste o equipamento do Cavaleiro** nem desenha espada, rastro ou escudo (o equipamento e o cajado dele vêm depois).

## Contrato de arte

Quatro peças do herói inteiro (frente, costas, lado e andando, na categoria `character`) **e as quatro peças do mago sozinhas** (chapéu, manto com capuz, barra da túnica e detalhes do tronco, na categoria `prop`) estão registradas em `tests/helpers/artAssets.ts` e passam sem baixar nenhum piso e **sem nenhuma exceção em `NOT_AN_ASSET`**. As primeiras versões das peças ficavam abaixo dos pisos sozinhas (poucas operações e cores); em vez de abrir exceção, ganharam detalhe de verdade (estrelinhas bordadas, forro e sombra, gema no capuz e aro no fecho). Na captura, o mago e o Cavaleiro lado a lado estão em `docs/screenshots/`.

## Onde o Mago aparece

- **Na tela de escolha do herói** (ADR 0066): a carta do Mago, ainda bloqueada ("Em breve"), mostra agora o próprio mago desenhado.
- **No jogo ainda não:** o jogo não pede o desenho do mago (a superfície, a caverna, o interior e a prévia do inventário ainda não passam a vocação ao `renderHero`). Isso é ligado na fatia F, junto de liberar o Mago, para ninguém jogar com um mago sem cajado nem ataque.

## Verificação

- `tests/hero-mage-body.test.ts` (7): o mago é outro desenho nas quatro direções, determinístico, e o Cavaleiro continua o de sempre; rampas de três tons e cores; as três ideias juntas (e nada da túnica, capa, faixa e mochila do Cavaleiro); cada peça onde deve (fivela e fecho só de frente, capuz só de costas); sem espada, rastro nem equipamento de Cavaleiro; a barra e os dois braços; reação ao dano e ao passo.
- `tests/art-contract.test.ts`: as oito peças novas cumprem o contrato e são determinísticas.
- `tests/hero-select.test.ts` e `tests/browser/hero-select.spec.ts`: a carta do Mago desenha o mago.
- Mutações: 20 estragos de propósito (mago nunca desenhado, equipamento, espada, rastro, capa ou túnica do Cavaleiro no mago, mago sem chapéu, barra, detalhes do tronco ou um braço, fivela, capuz e fecho no lado errado, rampas, cores do Cavaleiro, punhos dourados, carta do mago desenhando o Cavaleiro). Sete sobreviveram na primeira rodada, o que revelou lacunas nos testes (costas e rastro do golpe, barra, braços), todas fechadas.

## Limites

- O mago ainda anda de mãos vazias e sem animação de conjurar (fatias C a E).
- A escala do chapéu faz o mago ficar mais alto que o Cavaleiro (cerca de 59 unidades contra 43); a câmera e as colisões não dependem da altura do desenho.
- Android físico não foi testado.
