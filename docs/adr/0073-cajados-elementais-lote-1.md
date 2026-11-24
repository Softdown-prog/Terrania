# ADR 0073 — Os cajados elementais, lote 1 (Brisa, Rocha Viva e Marés)

**Estado:** entregue em 2026-11-24, direto na `main`, por pedido do dono (fatia G1a do [ADR 0065](0065-heroi-mago-fundacao.md)). O dono aprovou a lista dos dez cajados elementais (`docs/MAGO_CAJADOS.md`, com nomes, níveis, números e efeitos) e os quatro lotes. Este é a primeira metade do lote 1; a segunda é a Academia Arcana com função (G1b), que vende a Brisa.

## Decisões

1. **A lista é um documento do projeto** (`docs/MAGO_CAJADOS.md`), e os testes conferem a ficha de cada cajado contra ela. A regra: os cajados espelham as onze espadas (nível e dano da espada correspondente; intervalo = o da espada + 0,2 s; mana por magia = intervalo × mana máxima do nível do cajado ÷ 10, para a barra durar uns 20 s atirando sem parar em qualquer cajado). Números **propostos**, ajustáveis em `engine/character/weapons/staves/`.
2. **Três cajados novos**, cada um num arquivo: **Cajado da Brisa** (vento, nível 10, 16 de dano, empurra o alvo 16 px), **Cajado de Rocha Viva** (terra, nível 15, 21 de dano, alvo 30% mais lento por 2 s) e **Cajado das Marés** (água, nível 20, 26 de dano, cura o mago em 10% do dano causado). A ficha ganhou `effect` (empurrar, desacelerar, curar) e `price` (só a Brisa: 30 Terrania Gold, como a espada de ferro de Toren).
3. **Os efeitos** moram em `SpellCombat` (`applySpellEffect`), a fonte única da superfície e da caverna: o empurrão respeita a parede e não age em quem já caiu; a lentidão é do monstro (`applySpellSlow`: vale a mais forte, soma o tempo, acaba sozinha e convive com o gelo da espada, valendo o menor); a cura é uma parte do **dano realmente causado** (sem contar o excesso do golpe que derrota), no mínimo 1, nunca levanta um herói caído nem passa da vida máxima. `resolveSpellStrike` agora recebe o mundo (para o empurrão).
4. **Como se consegue:** como as espadas, cada cajado libera sozinho no nível (a Rocha Viva no 15, as Marés no 20); a Brisa exige antes a compra. O cajado em mãos e os comprados são um `StaffLoadout` na bolsa (`staves`), que só ocupa o save quando difere do padrão; o save é normalizado (só ids que existem, só comprados os que são vendidos, e o cajado em mãos precisa estar liberado para o nível, senão volta ao Aprendiz). A bolsa ganhou `buyStaff` e `equipStaff`; trocar de cajado é a ação de loja `equipStaff` (só o Mago).
5. **O inventário do Mago** lista os quatro cajados na ordem do catálogo, cada um como em mãos / disponível / à venda (nível alcançado, falta comprar na Academia) / bloqueado (falta nível), com o ícone próprio, e mostra o efeito do cajado em mãos em palavras. A barra de mana avisa pelo custo do cajado em mãos.
6. **O desenho**: cada cajado tem a sua matéria própria, por cima da haste e do engaste (`render/staves/motifs/`, um arquivo por matéria): **penas** do vento (duas grandes de cada lado da gema, duas atadas na haste que balançam, riscos de vento que giram), **rocha** da terra (lascas que abraçam a gema, musgo vivo, rachaduras com luz âmbar, cristais cravados e três cacos em órbita) e **coral** da água (coroa de ramos, alga, pérola numa bolha de luz e bolhas que sobem). A gema de cada um tem a cor do elemento (verde-água, âmbar, azul) e **o projétil e o estouro saem dessa cor**. O Aprendiz não mudou. A captura está em `docs/screenshots/cajados-lote-1.png`.

## Contrato de arte

As três matérias e o despachante estão registrados em `tests/helpers/artAssets.ts`, na categoria das peças pequenas, e passam **sem baixar piso e sem exceção** (a pedra ganhou degradê, musgo e cristais; o coral, tons intermediários e alga; as penas, brilho de vento; e o contorno escuro do projétil ficou mais escuro para as gemas claras). O Cavaleiro e o mago com o Aprendiz continuam idênticos (mesmas assinaturas de desenho de antes).

## Verificação

- `tests/staff-lote-1.test.ts` (13): a lista contra o documento, a regra de espelhar as espadas, cada efeito (empurrão em qualquer direção, parede, lentidão, cura com mínimo, teto e herói caído), a bolsa (compra, troca, nível, save), a simulação e a caverna com os mesmos efeitos, o save do navegador e a ligação jogo → HUD → tela.
- `tests/staff-motifs.test.ts` (9): cada matéria atrás e na frente da gema, o que se mexe com o relógio, a cor da ficha, o brilho de dano em tudo, o cajado inteiro como soma das peças, e o projétil de cada cor.
- `tests/browser/mage-staves.spec.ts` (desktop e Android): o inventário com os quatro cajados e os estados, trocar para as Marés (efeito, save, recarregar), o nível 1 (tudo bloqueado), a Brisa comprada, e o aviso de mana pelo custo do cajado. `hero-select.spec.ts` ajustado (quatro cartas).
- Mutações: **71** estragos de propósito (níveis, preços, efeitos, normalização do save, bolsa, resolvedor, lentidão do monstro, ação de loja, HUD, textos e as três matérias); os que sobreviveram na primeira rodada revelaram testes fracos (empurrão só na horizontal, cura arredondada, tempo da lentidão, estado "equipado" do HUD, camadas do desenho, bolhas, brilho de dano) e todos foram fechados; só sobrevivem dois equivalentes (empurrar sem direção já é recusado pelo movimento; a ordem entre o efeito e o abate não muda o resultado).

## Limites

- **A Academia Arcana ainda não vende:** a Brisa mostra "Comprar na Academia", mas a porta, o interior e a mestra chegam na próxima entrega (G1b). Até lá a Brisa é inalcançável; a Rocha Viva e as Marés já liberam por nível.
- Os efeitos de cura e lentidão não têm animação própria (o projétil e o estouro já têm a cor do cajado); a cura aparece na barra de vida.
- Equilíbrio (dano, mana, efeitos) são propostas do dono, sem medição em jogo real.
- Android físico não foi testado; sem medição em celular de 2018.
