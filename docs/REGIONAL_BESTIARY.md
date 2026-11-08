# Bestiário regional procedural — dez monstros

Este lote nasce da folha autoral 5×2 fornecida pelo criador. O código não importa imagem como textura: cada criatura é reconstruída por Canvas 2D com sombra, silhueta, volume, detalhes, contorno e brilho.

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
