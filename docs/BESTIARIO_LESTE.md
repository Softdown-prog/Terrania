# Bestiário do Leste (as ilhas e o mar)

**Proposta** do dono (2026-11-26): piratas, criaturas marinhas, tartarugas, polvos, mutantes aquáticos e tudo o mais que a imaginação der, **pelo menos umas 20 criaturas** (hoje há 4). **Todos os números e nomes são propostas que o dono ajusta.** **Nada está feito ainda.** Cada criatura segue o molde das existentes: uma ficha em `src/monsters/east/<espécie>/<criatura>.ts` (dados e comportamento), um painter em `src/render/creatures/east/...` e uma entrada no contrato de arte, **um arquivo por criatura**.

## A escala (a mesma do resto do mundo)
- **Comum** (vem em bando, XP baixo): vida 30 a 90, dano 5 a 14, XP 12 a 40.
- **Médio**: vida 100 a 190, dano 15 a 26, XP 50 a 130.
- **Elite** (as 4 que já existem são elites): vida 200 a 450, dano 26 a 40, XP 130 a 340.
- **Chefe de masmorra** (um por masmorra do Leste): vida 900 a 1500, dano 45 a 60, XP 700 a 1200; deixa o baú (Cripta Coin e, raro, uma Eclipse Crown).

## As 24 criaturas (4 que já existem + 20 novas)
| # | Criatura | Tier | Vida | Dano | XP | Ataque e efeito | Onde | Saque |
| ---: | --- | --- | ---: | ---: | ---: | --- | --- | --- |
| 1 | Caranguejo de Coral Gigante *(existe)* | elite | 240 | 21 | 150 | pedras de recife | recifes | Casca de coral |
| 2 | Serpente Abissal da Tempestade *(existe)* | elite | 290 | 38 | 270 | raio das marés | mar aberto, caverna | Escama elétrica |
| 3 | Polvo Abissal dos Recifes *(existe)* | elite | 275 | 29 | 220 | tinta que cega | recifes, caverna | Tinta abissal |
| 4 | Tritão Caçador das Marés *(existe)* | elite | 250 | 36 | 245 | tridente | costa, caverna | Tridente de coral |
| 5 | Caranguejo-Ermitão | comum | 45 | 8 | 18 | pinça, se esconde na concha com vida baixa | praia | Concha vazia |
| 6 | Gaivota Saqueadora | comum | 30 | 6 | 12 | mergulha, morde e foge | praia, ilhas | Pena de gaivota |
| 7 | Peixe-Balão Espinhoso | comum | 40 | 9 | 16 | infla e solta espinhos ao morrer | praia rasa | Espinho de balão |
| 8 | Água-Viva Lanterna | comum | 55 | 7 | 22 | choque que deixa lento | mar raso, caverna | Filamento brilhante |
| 9 | Marujo Afogado | comum | 85 | 13 | 38 | arrasta os pés, ataque de contato | naufrágios | Botão de latão |
| 10 | Pirata Grumete | comum | 70 | 11 | 30 | faca e fuga curta | portos, ilhas | Bandana, moedas |
| 11 | Piranha Mutante | comum | 50 | 12 | 26 | bando, mordida rápida | rios da costa | Dente mutante |
| 12 | Tartaruga do Recife | médio | 190 | 16 | 85 | casco: defesa dobrada com a cabeça recolhida; lenta | praias, ilhas | Casco polido |
| 13 | Pirata Arruaceiro | médio | 140 | 20 | 80 | sabre, investida | ilhas piratas | Sabre enferrujado |
| 14 | Pirata Atirador | médio | 110 | 22 | 95 | arcabuz à distância (7 tiles), recarrega devagar | ilhas piratas | Pólvora molhada |
| 15 | Contrabandista das Marés | médio | 120 | 18 | 90 | frasco de veneno que acumula | portos, ilhas | Frasco vazio |
| 16 | Moreia Elétrica | médio | 130 | 24 | 100 | emerge da água e dá choque | rochas da costa | Glândula elétrica |
| 17 | Lula Predadora | médio | 175 | 22 | 115 | tentáculos que prendem (lento) | mar fundo, caverna | Tentáculo |
| 18 | Sereia das Rochas | médio | 100 | 20 | 110 | canto: deixa lento a todos em volta; frágil | rochedos | Escama de sereia |
| 19 | Tubarão-Martelo das Marés | elite | 330 | 38 | 280 | investida na água rasa, sangramento | costa | Dente de tubarão |
| 20 | Tartaruga-Dragão das Profundezas | elite | 420 | 34 | 330 | jato de vapor, casco blindado | ilhas vulcânicas | Escama de dragão-do-mar |
| 21 | Golem de Coral e Concha | elite | 400 | 30 | 310 | pedras de recife, regenera na água | recifes | Coral vivo |
| 22 | Capitão Fantasma do Naufrágio | elite | 300 | 35 | 300 | espectro: atravessa o que for obstáculo curto, grito lento | naufrágios, caverna | Bússola amaldiçoada |
| 23 | Kraken Filhote | elite | 440 | 40 | 340 | tentáculos de área e tinta | mar aberto | Olho de kraken |
| 24 | **Leviatã das Tempestades** | chefe | 1400 | 58 | 1100 | raio em cadeia, ondas | masmorra do Leste | baú de Cripta Coin, Escama do Leviatã |

## Os mutantes aquáticos (ideia à parte)
Uma linhagem própria, "da Maré Suja", perto de esgotos e portos: **Piranha Mutante** (11), **Peixe-Lanterna Mutante** (comum, brilha e cega), **Sapo-Boi Mutante** (médio, língua longa), **Caranguejo Ferrugem** (médio, casca de metal que reduz o dano). Entram em lote próprio se o dono gostar.

## Onde moram
- **Praia e recifes**: os comuns e o Caranguejo de Coral.
- **Ilhas piratas** (acampamentos com barracas e barris): piratas e contrabandistas.
- **Naufrágios**: marujos afogados e o Capitão Fantasma.
- **Mar aberto e fundo**: serpente, polvo, lula, tubarão, kraken (só onde há água navegável; hoje o herói anda na costa).
- **Caverna das Marés**: tema `coastal`: polvos, tritões, água-viva, lula, moreia, sereia; a masmorra de vários andares do Leste (chefe: Leviatã).

## Os lotes (proposta)
1. **L1:** os 7 comuns (5 a 11) com um novo bando por tipo e o cenário de praia.
2. **L2:** os 5 médios de terra e costa (12 a 15 e 18).
3. **L3:** os médios aquáticos (16, 17) e os 3 elites novos de costa (19 a 21).
4. **L4:** o Capitão Fantasma e o Kraken Filhote, com os naufrágios.
5. **L5:** a masmorra do Leste (3 andares) e o Leviatã.
6. **L6:** os mutantes (opcional).
Cada lote: ficha, painter, arte no contrato, saque, testes que falham sem a mudança, e o bot de QA ganha as criaturas.

## O que fica de fora por enquanto
Combate dentro da água (o herói não nada), a cidade do Leste (proposta própria) e as montarias marinhas (`docs/MOUNTS.md`).
