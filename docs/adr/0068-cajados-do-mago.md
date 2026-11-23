# ADR 0068 — Os cajados do Mago e o Cajado de Aprendiz

**Estado:** entregue em 2026-11-23, direto na `main`, por pedido do dono (fatia C do [ADR 0065](0065-heroi-mago-fundacao.md)). O dono aprovou a proposta: um cajado simples de madeira com uma pedra azul-violeta que brilha de leve, e a **Academia Arcana** como lugar onde o mago consegue cajados (a loja é da fatia F).

## Decisões

1. **Um cajado por ficha, como as espadas:** `engine/character/Staves.ts` (catálogo) e `weapons/staves/apprentice.ts` (a ficha). Hoje só o de Aprendiz; os outros dez espelham as onze espadas, com um elemento cada, em lotes (fatia G). O catálogo já tem `StaffElement` (gelo, fogo, veneno, raio, astral) para eles.
2. **A ficha tem combate e visual.** Combate (números **propostos**, valem na fatia D): **8 de dano** (o mesmo da espada de treino), **1 s** entre magias (a espada leva 0,8 s), **0,12 s** de preparo, **5 de mana** por magia e **6 tiles** de alcance. Com a barra do nível 1 (50 de mana) são **dez magias**, e disparando sem parar a mana dura uns 20 s (a barra volta em 20 s): a mana é o que equilibra o alcance. Visual: rampas de três tons da haste (carvalho) e da gema (violeta), couro enrolado, ponteira de ferro, anel dourado, três garras e a fita violeta da Academia.
3. **O desenho em peças** (`render/staves/`): `shaft.ts` (haste afunilada com veios, nós, empunhadura, anel, fio de luz e ponteira) e `head.ts` (garras de madeira, gema facetada, **auréola que pulsa** e **fita que balança**, ambas pelo relógio). `render/staves.ts` junta as duas em `drawMageStaff`. O referencial é o da mão: a empunhadura é a origem e o topo fica em -y.
4. **Na mão do mago** (`heroPose.ts`, `staffMount`): em pé ao lado do corpo, **pendendo um pouco para fora** (para o topo sair da aba do chapéu), na mesma mão da espada e na altura da cintura, **oscilando com o passo**. O braço, a mão e a ordem das camadas são os do Cavaleiro (de costas o cajado fica atrás do corpo). O mago de qualquer vocação segura o `equippedStaff` (padrão: o de Aprendiz).
5. **O Cavaleiro não mudou:** conferi de novo as mesmas 216 poses, idênticas chamada por chamada.

## Contrato de arte

O cajado inteiro e as suas duas peças (haste e engaste) estão registrados em `tests/helpers/artAssets.ts`, na categoria das peças pequenas, e passam sem baixar piso e **sem exceção**. A haste sozinha ficou primeiro abaixo do piso (poucas cores e sem tom claro); ganhou o anel dourado e o fio de luz. O mago com o cajado, ao lado do Cavaleiro, está em `docs/screenshots/heroi-mago-contra-cavaleiro.png`.

## Verificação

- `tests/staves.test.ts` (10): o catálogo e o desbloqueio; a ficha e a coerência com a mana do mago e a espada de treino (dez magias, 20 s de fogo contínuo); a aparência e as rampas; o desenho (determinístico, gema que pulsa, fita que balança, tom de dano); as peças (haste, engaste e a soma dos dois); a empunhadura (mão, inclinação para fora, balanço); o mago com o cajado nas quatro direções e sem espada; a animação com o herói (pulso, rotação e dano).
- `tests/hero-mage-body.test.ts` e `tests/art-contract.test.ts`: atualizados (o mago tem uma mão no cajado, como o Cavaleiro na espada; as três peças novas cumprem o contrato).
- Mutações: **33** estragos de propósito (cada número da ficha, rampas, cores, a empunhadura de couro, o anel, a ponteira, o pulso, o balanço, as garras, a ordem das peças, o relógio, a inclinação, a mão, a altura da empunhadura, o cajado sumindo de frente ou de costas, manga, punho e tom de dano). Sete sobreviveram na primeira rodada, o que revelou lacunas nos testes (nível 0, as peças realmente desenhadas, o balanço e o pulso no herói), todas fechadas; só sobrevive a mutação de controle, equivalente de propósito.

## Limites

- **Ainda não dispara nada:** o cajado é só dados e desenho; o ataque à distância é a fatia D e a animação de conjurar, a fatia E.
- O mago só aparece no jogo (com o cajado) quando for liberado na fatia F; hoje o cajado aparece na carta dele na tela de escolha.
- Com um cajado só, `equippedStaff` não muda nada ainda; ganha efeito quando entrarem os outros (fatia G).
- Android físico não foi testado.
