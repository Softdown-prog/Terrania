# Bestiário regional procedural — trinta monstros

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

- src/monsters/<região>/<espécie>.ts: fonte única de atributos, habitats e probabilidades; src/monsters/catalog.ts apenas agrega as fichas.
- src/actors/RegionalMonster.ts: perseguição, conjuração, colisão e drops determinísticos.
- src/render/regionalCreatures.ts: dez desenhos distintos, 100% procedurais.
- src/engine/rooms/CaveRoom.ts: encontros locais, sem ocupar paredes nem saída.
- src/engine/OfflineSimulation.ts: criaturas na superfície, preservando a missão dos slimes.
- src/engine/character/Inventory.ts: materiais persistidos no save da aventura solo.

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

O catálogo de dados em src/monsters/catalog.ts também define experiência,
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

## Terceiro lote — criaturas comuns do Sul (21–30)

O criador forneceu a ficha completa e, em seguida, a imagem autoral
da terceira sprite sheet 5×2, numerada 21–30. A referência visual é usada
para preservar proporções, trajes, postura, paleta e anatomia; **não é importada
como textura em produção**. Os dez desenhos são reconstruídos com geometria
Canvas 2D em src/render/regionalWave3.ts.

### Diretrizes visuais fundamentadas na folha autoral

- 21: rato grande, pardo e peludo, cauda rosada longa, patas curtas e bigodes.
- 22: goblin verde com turbante claro, adaga curva e bolsa de saqueador.
- 23: orc corpulento de armadura tribal, clava com ponta de osso.
- 24: troll alto e cor de barro, membros longos, textura de argila seca.
- 25: pequeno viajante de capuz areia, bolsa e funda de pedrinhas.
- 26: patrulheiro com robes brancos/bege e lança longa, não armadura verde.
- 27: espírito de fogo dourado flutuante; **não tem asas de morcego**.
- 28: víbora ocre enrolada, cabeça erguida, chifres e manchas romboidais.
- 29: abutre com asas recolhidas, cabeça rosada e bico escuro, pousado em galho.
- 30: cacto antropomorfo verde, braços ramificados, espinhos e flor rosa/dourada.

Não confundir verificação automática de complexidade da arte com equivalência
pixel a pixel: contraste, volume e silhueta continuam sujeitos a revisão visual
de screenshots em desktop e Android.

| # | Criatura | HP | Ataque | Bioma de superfície | Cripta |
| ---: | --- | ---: | ---: | --- | --- |
| 21 | Rato das Dunas | 35 | 6 | Dunas, oásis, ruínas | Dunas |
| 22 | Goblin Saqueador da Areia | 65 | 11 | Dunas e ruínas | Dunas |
| 23 | Orc Nômade do Deserto | 110 | 17 | Dunas e ruínas | Dunas |
| 24 | Troll de Barro Seco | 145 | 15 | Transição árida / oásis e ruínas | Dunas e Brejo |
| 25 | Pequenino Batedor das Dunas | 75 | 12 | Rotas áridas, oásis e ruínas | Dunas |
| 26 | Elfo Patrulheiro do Oásis | 90 | 16 | Oásis e ruínas | Dunas |
| 27 | Diabrete de Miragem | 55 | 14 | Dunas e ruínas | Dunas |
| 28 | Víbora-de-Chifre Comum | 45 | 10 | Dunas, oásis e ruínas | Dunas |
| 29 | Abutre Carniceiro do Sul | 50 | 9 | Dunas e ruínas | Dunas |
| 30 | Brotinho de Cacto Animado | 60 | 8 | Dunas, oásis e ruínas | Dunas |

A codificação dos encontros usa os biomas reais **dunes, ruins e oasis**;
nenhum acampamento, estrada de caravana, santuário ou campo de cactos foi
inventado como entidade no mapa. Essas características ainda são ambientação
narrativa até existir um local geográfico próprio.

### Combate e economia

- Rato: mordidas rápidas, com 10% de chance de infecção de 1 HP/s durante
  3 segundos. A rolagem por golpe é determinística por ID e contador.
- Goblin: só arremessa areia/pedras ao ficar abaixo de 35% HP.
- Orc: empurra 12 pixels no terceiro ataque corpo a corpo bem-sucedido.
- Troll: recupera 1 HP/s após 4 segundos sem receber dano **e**
  longe do jogador; lança torrões após o aviso de conjuração.
- Pequenino: alterna faca e funda, respeitando intervalo e linha de visão.
- Elfo: lança curta imbuída causa +2 de dano no contato.
- Diabrete: faíscas com desorientação breve (efeito temporário de mira).
- Víbora: veneno leve separado do veneno cumulativo, 2 HP/s por 4 s.
- Abutre: ganha velocidade e agressividade com a vítima abaixo de 50% HP.
- Cacto: rebate 2 HP por contato de uma **espada inicial** efetiva, não
  ao receber uma magia ou golpe que não chegou a atingir.
- Chances de drops ficam no catálogo como probabilidades por item,
  inclusive 45% de Pó Cintilante e 55% de nenhuma recompensa do Diabrete.

### Densidade e segurança

As criaturas comuns têm um gerador dedicado de 2–3 tentativas por chunk
em 86% dos chunks de Sul, além da fauna regional anterior, sujeito a
bioma, solo transitável e à região real do tile. Há IDs fixos por
seed/chunk/tentativa para manter o histórico de derrotados. Nas criptas
áridas, a seleção favorece as comuns, sem remover as espécies antigas.

As espécies reutilizam a mesma bolsa, IA, mapa, sistema de caverna, save,
combate e renderização. Não criam novo motor nem reativam multiplayer.

Limitações: lugares específicos de spawn (acampamentos, santuários,
vilarejos, rotas de caravanas) ainda não têm marcadores próprios
no mapa. Magias e objetos arremessados são ataques com preparação e
linha de visão, mas não têm simulação contínua de trajetórias.
Testes em desktop e Android ainda são necessários antes de merge.
