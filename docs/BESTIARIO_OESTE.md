# Bestiário do Oeste (as montanhas: dragões, gigantes, golems, gnomos, goblins e anões)

**Proposta** do dono (2026-11-26): a região dos dragões, gigantes, golems de pedra, gnomos, goblins e anões (hoje há 4 criaturas). **Todos os números e nomes são propostas que o dono ajusta.** **Nada está feito ainda.** Mesmo molde do Leste ([BESTIARIO_LESTE.md](BESTIARIO_LESTE.md)): **um arquivo por criatura** em `src/monsters/west/<espécie>/`, painter em `src/render/creatures/west/...`, entrada no contrato de arte. A escala (comum, médio, elite, chefe) é a do Leste.

## As 25 criaturas (4 que já existem + 21 novas)
| # | Criatura | Tier | Vida | Dano | XP | Ataque e efeito | Onde | Saque |
| ---: | --- | --- | ---: | ---: | ---: | --- | --- | --- |
| 1 | Salamandra de Magma *(existe)* | elite | 220 | 31 | 205 | jato de lava, queima | encostas, caverna | Glândula de magma |
| 2 | Draconato das Escarpas *(existe)* | elite | 190 | 34 | 185 | sopro curto | escarpas | Escama de draconato |
| 3 | Golem de Basalto *(existe)* | elite | 320 | 28 | 240 | pedras, deixa lento | pedreiras, caverna | Núcleo de basalto |
| 4 | Grifo das Cumeadas *(existe)* | elite | 260 | 33 | 220 | mergulho | cumes | Pena de grifo |
| 5 | Goblin Minerador | comum | 55 | 9 | 22 | picareta, foge ao ver o herói forte | minas, caverna | Minério bruto |
| 6 | Goblin de Funda | comum | 45 | 8 | 20 | atira pedras (5 tiles) | encostas | Pedra lapidada |
| 7 | Goblin Sapador | comum | 60 | 14 | 30 | corre e explode (área) ao morrer | minas | Pólvora grossa |
| 8 | Gnomo Inventor | comum | 50 | 10 | 28 | engenhoca que dá choque e quebra depois de 3 usos | oficinas, minas | Engrenagem |
| 9 | Gnomo Alquimista | médio | 90 | 15 | 70 | joga poções: cura os aliados, veneno no herói | oficinas | Frasco de poção |
| 10 | Cão-de-Pedra | comum | 80 | 14 | 36 | investida, pele de pedra (defesa +) | encostas | Presa pétrea |
| 11 | Anão Mineiro | médio | 150 | 18 | 75 | picareta, lento mas firme | minas | Picareta rúnica |
| 12 | Anão Guerreiro | médio | 190 | 22 | 105 | machado e escudo: golpe frontal reduzido | fortalezas | Machado de anão |
| 13 | Anão Besteiro | médio | 120 | 24 | 100 | besta (7 tiles), recarga lenta | fortalezas | Virote de ferro |
| 14 | Anão Forjador | médio | 175 | 25 | 125 | martelo, brasa que queima | forjas | Martelo de forja |
| 15 | Gárgula de Pedra | médio | 160 | 23 | 115 | fica imóvel como estátua até chegarem perto, ataque aéreo | ruínas, fortalezas | Asa de pedra |
| 16 | Troll das Cavernas | médio | 185 | 26 | 120 | regenera devagar, cacete | cavernas | Dente de troll |
| 17 | Ogro das Escarpas | elite | 340 | 36 | 260 | pancada de área, lento | escarpas | Clava de ogro |
| 18 | Golem de Granito | elite | 380 | 30 | 290 | pedras de área, resiste a golpes | pedreiras | Núcleo de granito |
| 19 | Golem de Ferro | elite | 420 | 33 | 320 | soco pesado, imune a lentidão | forjas | Placa de ferro |
| 20 | Golem de Cristal | elite | 360 | 34 | 310 | raios de cristal (7 tiles), refletem magia fraca | cavernas de cristal | Cristal bruto |
| 21 | Wyvern das Montanhas | elite | 300 | 37 | 280 | mergulho com veneno | cumes | Ferrão de wyvern |
| 22 | Gigante das Pedras | elite | 450 | 40 | 340 | arremessa pedras (6 tiles), pisão de área | vales | Pedra de gigante |
| 23 | Dragão Jovem das Cinzas | elite | 440 | 40 | 350 | sopro de fogo em cone, queima | encostas vulcânicas | Escama de cinzas |
| 24 | Dragão de Obsidiana | elite | 480 | 42 | 380 | sopro e cauda de área | cavernas vulcânicas | Escama de obsidiana |
| 25 | **Dragão Ancião de Terrania** | chefe | 1500 | 60 | 1200 | sopro em cadeia, voo curto | masmorra do Oeste | baú de Cripta Coin, Coração do Dragão |

## Os povos
- **Goblins, gnomos e anões** vivem em **minas, oficinas e fortalezas** (acampamentos com barracas, forjas e engenhocas); alguns são hostis a humanos e outros não (a cidade do Oeste, em proposta própria, é de um povo que tolera humanos).
- **Gigantes e golems** moram nos vales e pedreiras; **dragões e wyverns** nos cumes e encostas vulcânicas.
- **Caverna das Montanhas** (tema `basalt`): salamandras, golems, trolls, gárgulas, cão-de-pedra, goblins; a masmorra de vários andares do Oeste (chefe: Dragão Ancião).

## Os lotes (proposta)
1. **L1:** goblins (5 a 7), gnomos (8, 9) e o cão-de-pedra (10): bandos pequenos e comuns, com o cenário de mina.
2. **L2:** os anões (11 a 14) e a fortaleza de anões.
3. **L3:** gárgula, troll, ogro (15 a 17).
4. **L4:** os golems (18 a 20), com a pedreira e a forja.
5. **L5:** wyvern, gigante e os dois dragões (21 a 24).
6. **L6:** a masmorra do Oeste (3 andares) e o Dragão Ancião.
Cada lote: ficha, painter, arte no contrato, saque, testes, e o bot de QA ganha as criaturas.
