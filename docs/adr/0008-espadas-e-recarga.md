# ADR 0008 — Dez espadas procedurais e recarga (atualização 08/11/2026)

O jogo solo passa a usar as dez espadas da sprite sheet autoral em um catálogo canônico de progressão do Cavaleiro. Nível máximo agora é **100**, sem alterar a fórmula existente de experiência. O nível inicial do herói continua sendo 1; a Espada de Treino (tier nível 0) está disponível desde o início.

| Arma | ID | Nível | Dano | Intervalo | Habilidade |
| --- | --- | ---: | ---: | ---: | --- |
| Espada de Treino de Carvalho | starter | 0 | 8 | 0,8 s | poeira |
| Espada Curta de Ferro Batido | forge | 10 | 16 | 1,0 s | aço |
| Gládio de Bronze Temperado | bronze | 20 | 26 | 0,95 s | feixe duplo |
| Montante de Cobre Rubro | copper | 30 | 38 | 1,35 s | empurrão 12 px |
| Lâmina Serrilhada das Dunas | dunes | 45 | 52 | 1,15 s | sangramento 15%, 3 s |
| Espada de Cristal Boreal | boreal | 60 | 68 | 1,1 s | lentidão 20%, 2 s |
| Lâmina Vulcânica de Obsidiana | obsidian | 70 | 84 | 1,25 s | queimadura 6 HP/s, 4 s |
| Cutelo Peçonhento do Charco | marsh | 80 | 98 | 1,3 s | 10 HP/s, 5 s |
| Sabre Abissal da Tempestade | tempest | 90 | 115 | 1,15 s | corrente até 2 inimigos |
| Espada Astral de Terrania | astral | 100 | 140 | 1,4 s | arco maior e 25% penetração |

**Decisões compatíveis:** o ID legado forge identifica a espada de ferro, preservando a compra feita com Toren e os saves antigos. A compra continua a custar 5 géis, mas equipar exige nível 10. As outras armas são desbloqueadas por nível, sem inventar preços nem receitas de crafting ainda não definidos. Os intervalos não especificados originalmente são parâmetros provisórios para o balanceamento, incluindo o bronze 5% mais rápido que uma cadência-base de 1 s.

**Efeitos reais:** SwordCombat.ts executa status, penetração, empurrão e corrente em até 2 inimigos adjacentes com colisão real. Slime.ts e RegionalMonster.ts atualizam temporizadores de sangramento, fogo, veneno e gelo. CaveRoom.ts e OfflineSimulation.ts registram mortes por dano periódico, atribuindo experiência e drops uma única vez. Sangramento usa 2 HP/s por 3 s, corrente usa 30% do dano contra dois vizinhos a até 52 px: ambos são valores provisórios. O ataque astral alcança 72 px e até três alvos no arco com checagem de linha de visão. Isso vale também para o golpe com alvo escolhido (o modo normal do jogo): o alvo precisa estar ao alcance, vem primeiro, e os dois vizinhos mais próximos do arco completam o golpe; `swordArc` e `swordStrikeTargets` são a única fonte desses números para superfície, caverna e alvo clássico. Apenas criaturas justificadamente blindadas têm defesa especial.

**Arte:** src/render/swords.ts contém dez lâminas e dez rastros Canvas 2D baseados na imagem do criador, sem usar sprite/PNG. render/actors.ts apresenta as espadas equipadas, inclusive na prévia do inventário, e Effects.ts usa partículas específicas. As diferenças estéticas finais ainda requerem screenshots reais em desktop e Android.

**Limites:** efeitos elementais são ligados ao acerto, mas objetos-projéteis completos e trajetórias físicas separadas não fazem parte deste PR. Não há ainda quest de obtenção nem crafting das espadas superiores. Essa expansão não restaura o multiplayer. Testes de nível, save, cooldown, status, loot, arte e navegador devem ficar verdes antes do merge.
