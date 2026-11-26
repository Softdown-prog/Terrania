# Bestiário do Norte (o gelo: gigantes e dragões de gelo, yetis, esquimós, bárbaros e fantasmas)

**Proposta** do dono (2026-11-26): a região de gelo, com gigantes e dragões de gelo, yetis, esquimós hostis, bárbaros da neve, fantasmas das montanhas frias e tudo o mais (hoje há 6 criaturas). **Todos os números e nomes são propostas que o dono ajusta.** **Nada está feito ainda.** Mesmo molde do Leste: **um arquivo por criatura** em `src/monsters/north/<espécie>/`, painter em `src/render/creatures/north/...`, entrada no contrato de arte. Escala: comum, médio, elite, chefe (a do [Leste](BESTIARIO_LESTE.md)).

## As 26 criaturas (6 que já existem + 20 novas)
| # | Criatura | Tier | Vida | Dano | XP | Ataque e efeito | Onde | Saque |
| ---: | --- | --- | ---: | ---: | ---: | --- | --- | --- |
| 1 | Lobo de Cristal Glacial *(existe)* | médio | 140 | 25 | 110 | mordida rápida | tundra, caverna | Presa de cristal |
| 2 | Urso Polar Rúnico *(existe)* | elite | 340 | 34 | 260 | congela | gelo | Garra rúnica |
| 3 | Yeti Boreal *(existe)* | elite | 380 | 36 | 280 | bola de neve, congela | montanhas | Pelo de yeti |
| 4 | Mamute Blindado da Tundra *(existe)* | elite | 450 | 40 | 340 | pisão que atordoa | tundra | Presa de mamute |
| 5 | Banshee Gélida *(existe)* | médio | 200 | 27 | 150 | grito, deixa lento | cavernas | Essência gélida |
| 6 | Espírito do Gelo *(existe)* | médio | 190 | 26 | 140 | lança gelo, atrasa os golpes | cavernas | Fragmento espectral |
| 7 | Lebre da Neve | comum | 30 | 5 | 12 | foge aos saltos | planícies nevadas | Pelo branco |
| 8 | Raposa Ártica | comum | 45 | 9 | 20 | mordida e fuga | planícies nevadas | Pele de raposa |
| 9 | Morsa Brutal | médio | 180 | 20 | 90 | pancada com as presas, lenta | costa gelada | Presa de morsa |
| 10 | Foca-Leopardo | médio | 130 | 22 | 85 | investida no gelo fino | costa gelada | Pele manchada |
| 11 | Esquimó Caçador (hostil) | médio | 110 | 20 | 80 | lança curta (6 tiles) | vilas e acampamentos de gelo | Lança de osso |
| 12 | Esquimó Xamã (hostil) | médio | 95 | 22 | 110 | totem que congela o herói; cura os aliados | acampamentos | Totem de osso |
| 13 | Bárbaro da Neve | médio | 170 | 24 | 100 | machado, investida | acampamentos | Machado de gelo |
| 14 | Bárbaro Berserker | médio | 150 | 28 | 115 | enlouquece com vida baixa (mais dano, sem defesa) | acampamentos | Colar de dentes |
| 15 | Arqueiro Bárbaro | médio | 105 | 24 | 95 | arco (7 tiles) com flecha de gelo (lento) | acampamentos | Flecha de gelo |
| 16 | Corvo da Nevasca | comum | 35 | 8 | 16 | mergulha, em bando | todo o norte | Pena negra |
| 17 | Golem de Neve | médio | 210 | 22 | 110 | soco pesado; fraco a fogo | tundra | Núcleo de neve |
| 18 | Troll do Gelo | médio | 200 | 27 | 125 | regenera no frio, cacete | cavernas, montanhas | Dente gelado |
| 19 | Elemental de Gelo | elite | 330 | 33 | 270 | estilhaços de área, imune a congelamento | cavernas | Cristal elemental |
| 20 | Fantasma da Montanha | médio | 150 | 24 | 135 | atravessa pedras baixas, drena (lentidão), some e reaparece | montanhas | Névoa engarrafada |
| 21 | Espectro do Nevoeiro | elite | 280 | 32 | 260 | nuvem que cega, grito | vales cobertos de névoa | Essência de nevoeiro |
| 22 | Cavaleiro Congelado | elite | 400 | 35 | 300 | espada e escudo, imune a lentidão | ruínas geladas | Elmo congelado |
| 23 | Gigante de Gelo | elite | 470 | 42 | 360 | arremessa blocos (6 tiles), pisão de área | vales, cavernas | Bloco de gelo eterno |
| 24 | Dragão de Gelo Jovem | elite | 440 | 40 | 350 | sopro gélido em cone, congela | montanhas | Escama de gelo |
| 25 | Gigante de Gelo Ancião | elite | 520 | 44 | 400 | blocos e tremor de área | masmorra do Norte | Coroa de gelo |
| 26 | **Dragão Boreal** | chefe | 1500 | 60 | 1200 | sopro em cadeia, tempestade de gelo | masmorra do Norte | baú de Cripta Coin, Coração de Gelo |

## Os povos
- **Esquimós** e **bárbaros da neve** vivem em acampamentos e vilas de gelo; **hostis aos humanos** nas bordas, e mais ao norte há os que tolerem comércio (a cidade do Norte, em proposta própria).
- **Fantasmas, espectros e o cavaleiro** assombram **ruínas e vales de névoa**.
- **Gigantes e dragões** no alto das montanhas; **a masmorra de vários andares do Norte** (tema `glacial`) termina no Dragão Boreal.

## Os lotes (proposta)
1. **L1:** fauna comum (lebre, raposa, corvo), morsa e foca (7 a 10, 16).
2. **L2:** esquimós e bárbaros (11 a 15) e os acampamentos de gelo.
3. **L3:** golem de neve, troll do gelo, elemental (17 a 19).
4. **L4:** fantasma, espectro e o cavaleiro congelado (20 a 22), com as ruínas.
5. **L5:** gigante e dragão jovem (23, 24).
6. **L6:** a masmorra do Norte (3 andares), o gigante ancião e o Dragão Boreal.
Cada lote: ficha, painter, arte no contrato, saque, testes, e o bot de QA ganha as criaturas.
