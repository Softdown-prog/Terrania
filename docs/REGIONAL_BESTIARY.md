# Bestiário regional procedural — vinte monstros

Os dois lotes nascem de folhas autorais 5×2 fornecidas pelo criador. O código não importa imagens como texturas: cada criatura é reconstruída por Canvas 2D com sombra, silhueta, volume, detalhes, contorno e brilho.

| Origem | Espécie | Região | Caverna |
| --- | --- | --- | --- |
| Superior 1 | Golem de Basalto | Oeste, cordilheiras | Galeria das Montanhas (basalt) |
| Superior 2 | Draconato das Escarpas | Oeste, montanhas | Galeria das Montanhas (basalt) |
| Superior 3 | Hidra de Lodo | Sul-Sudeste, pântano | Masmorra do Brejo (marsh) |
| Superior 4 | Escorpião das Dunas | Sul, deserto | Cripta das Dunas (desert) |
| Superior 5 | Escaravelho Solar | Sul, deserto | Cripta das Dunas (desert) |
| Inferior 1 | Yeti Boreal | Norte, tundra | Gruta das Geadas (glacial) |
| Inferior 2 | Lobo de Cristal Glacial | Norte, gelo | Gruta das Geadas (glacial) |
| Inferior 3 | Espírito da Geada | Norte, gelo | Gruta das Geadas (glacial) |
| Inferior 4 | Caranguejo de Coral Gigante | Leste, arquipélagos | Caverna das Marés (coastal) |
| Inferior 5 | Serpente Abissal da Tempestade | Leste, arquipélagos | Caverna das Marés (coastal) |

## Contratos reais

- src/actors/CreatureCatalog.ts: fonte de atributos, habitats e probabilidades.
- src/actors/RegionalMonster.ts: perseguição, conjuração, colisão e drops determinísticos.
- src/render/regionalCreatures.ts: dez desenhos distintos, 100% procedurais.
- src/engine/CaveRoom.ts: encontros locais, sem ocupar paredes nem saída.
- src/engine/OfflineSimulation.ts: criaturas na superfície, preservando a missão dos slimes.
- src/engine/Inventory.ts: materiais persistidos no save da aventura solo.

A chance de drop aplica-se individualmente por morte; o Escaravelho concede experiência extra e poeira dourada automática. A Espada de Coral Rara é por ora um material obtido, não arma equipável inventada sem definição na forja. A UI detalhada dos materiais ainda precisa de uma etapa de apresentação.

A Hidra envenena por seis segundos; escorpiões acumulam veneno até três aplicações; Yeti congela; Espírito da Geada reduz ritmo de ataque. O lobo é mais veloz em terreno gelado. Conjuração avisa o jogador e exige linha de visão. Escaravelhos explodem ao morrer.

Verificação: npm run typecheck; npm test; npm run build; Playwright desktop/Android; contrato visual de arte. Não há dependência de multiplayer Go.


## Lote 2 — imagens 11 a 20

| Imagem | Espécie | HP | Ataque | Região | Habitat subterrâneo |
| --- | --- | ---: | ---: | --- | --- |
| 11 | Grifo das Cumeadas | 260 | 33 | Oeste, montanhas | Galeria das Montanhas |
| 12 | Salamandra de Magma | 220 | 31 | Oeste, rochas vulcânicas | Galeria das Montanhas |
| 13 | Ent Apodrecido do Pântano | 350 | 27 | Sul-Sudeste, brejos | Masmorra do Brejo |
| 14 | Sapo Batedor Venenoso | 165 | 23 | Sul-Sudeste, brejos | Masmorra do Brejo |
| 15 | Verme da Areia Carniceiro | 310 | 35 | Sul, dunas | Cripta das Dunas |
| 16 | Mamute Blindado da Tundra | 450 | 40 | Norte, tundra | Gruta das Geadas |
| 17 | Banshee da Geada | 155 | 37 | Norte, gelo | Gruta das Geadas |
| 18 | Urso Polar Rúnico | 340 | 34 | Norte, neve | Gruta das Geadas |
| 19 | Polvo Abissal dos Recifes | 275 | 29 | Leste, recifes | Caverna das Marés |
| 20 | Tritão Caçador das Marés | 250 | 36 | Leste, ilhas | Caverna das Marés |

O catálogo de dados em src/actors/CreatureCatalog.ts também define experiência,
natureza, cadência, golpes especiais, duração dos efeitos, cada nome de item e
probabilidade exata de drop, inclusive tridente raro de 4%, ectoplasma de 35%
e fragmento de runa de 12%.

- Grifo: rajada de vento após preparação que empurra até 32 px sem atravessar rochas.
- Salamandra: bola vulcânica com queimadura de quatro segundos.
- Ent: nuvem curta de esporos venenosos, com conjuração visível.
- Sapo: língua venenosa de alcance curto.
- Verme: aproximação subterrânea telegráfica, emergindo apenas em terreno transitável.
- Mamute: pisoteio com atordoamento adjacente.
- Banshee: lanças de gelo; obstáculos *decorativos* não bloqueiam sua posição,
  mas paredes físicas continuam sólidas por contrato do motor.
- Urso: mordida rúnica congelante.
- Polvo: jato de tinta, com vinheta escura e falha de precisão periódica.
- Tritão: raio marítimo com linha de visão e tridente procedural.

Os vinte são criaturas do jogo **solo**; Go/Rust permanecem
experimentais e não devem ser adaptados como se o multiplayer estivesse ativo.
Drops de armas raras e tridente são itens de materiais colecionáveis até a
definição de equipamento correspondente, sem criar armamento falso.

## Auditoria de jogabilidade dos dois lotes (08/11/2026)

Compilar não substitui testar o jogo. A revisão cruzou as espécies com o
controlador de tiles, combate, caverna, inventário e HUD Angular.

### Regressões corrigidas

- Inimigos derrotados são registrados no motor solo; reentrar na mesma caverna
  não cria novos IDs apenas porque outros inimigos foram removidos.
- Movimento por tiles respeita congelamento, atordoamento e lentidão;
  um passo em andamento pausa em vez de atravessar o efeito.
- A Battle List subterrânea usa câmera/personagem subterrâneos,
  permite seleção e perseguição e mantém o alvo de golpes focados.
- HP, HP máximo, nutrição e efeitos temporários são sincronizados
  entre simulações de superfície/caverna ao entrar e sair.
- Cura salva na caverna usa HP atual, sem restaurar valores antigos ao recarregar.
- O loot regional aparece na bolsa Angular com quantidades canônicas
  e ícone de material reutilizável.
- O spawn de superfície seleciona o bioma do tile real, não do centro do chunk.
- O Verme da Areia só ataca se alcançar uma emergência livre dentro
  do alcance melee, respeitando corredores e colisão.
- A caverna glacial aplica um piso gelado real, ativando o bônus do lobo.
- O HUD evita recalcular material e Battle List desnecessariamente a cada frame.

### Limites restantes — não considerar concluídos

- Magias compartilham um modelo de conjuração e dano imediato após preparação:
  ainda faltam projéteis individualizados, trajetórias e impactos animados.
- As formas Canvas são aproximações da folha de referência. O contrato de arte
  verifica complexidade e contraste, mas não semelhança visual.
- Cavernas derrotadas permanecem vazias até que se defina respawn temporizado;
  a correção atual evita farm imediato mas não implementa reaparecimento futuro.
- Espada de Coral e Tridente das Marés ainda são colecionáveis, não armas
  equipáveis sem uma definição de combate e arte.
- HP e nutrição são persistidos ao salvar na caverna, mas o save não retoma
  a posição subterrânea e não serializa estados temporários de debuff.
- Densidade e dificuldade de encontros precisam de playtest prolongado
  nas transições entre biomas e em dispositivos móveis.

Regressões automatizadas em tests/bestiary-audit.test.ts.
Validação: architecture:check, typecheck, testes unitários, build e
Playwright desktop/Android, antes de liberar merge.
