# ADR 0005 — Progressão por abates

A recompensa de XP pertence ao catálogo de criaturas. O Slime concede 10 XP ao autor do abate confirmado. A curva acumulada para o nível L é `15 × L × (L − 1)`, com teto de nível 50. O nível 2 começa em 30 XP e o nível 3 em 90 XP. Cada nível soma 10 à vida atual e à máxima, preservando a diferença entre elas.

O solo grava XP no save e deriva nível e vida máxima ao carregar. Saves anteriores mantêm a missão e começam com XP zero. Morrer conserva XP, e retornar à Vila da Travessia restaura a vida até o máximo do nível. Gerar outro mundo inicia uma nova progressão.

No protocolo v3, o navegador pede `progression=xp`. O Node atribui XP na simulação e envia `experience` apenas no estado do próprio jogador. A sessão mantém o nível no respawn e começa do zero em uma nova conexão. O cliente exibe o HUD de XP quando recebe um valor válido. Sessões legadas conservam a vida base de 100.
