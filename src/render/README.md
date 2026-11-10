# Renderizador e UI adaptável

> **Atualização 2026-11-08:** o modo online/sala Node foi retirado ([ADR 0012](../../docs/adr/0012-retirada-do-multiplayer.md)). Trechos abaixo sobre sala, snapshot, `online` ou servidor autoritativo descrevem o que existiu e foi removido.

**Papel:** CanvasScene e módulos de render desenham mundo, entidades e efeitos; GameUi é a fronteira com o HUD.

`Game` traduz o estado do herói e as interações com o mundo para dados de leitura em `GameUi`. A interface recebe vida, posição em tiles, quantidades da bolsa e as ações conversar, ler ou entrar. O orquestrador executa os comandos e atualiza o HUD.

**Ponto de entrada:** consulte [registro central](../../architecture/modules.json) e o índice gerado em [docs/INDEX.md](../../docs/INDEX.md). Os caminhos de código completos são listados automaticamente; não repetir listas manuais aqui.

**Ao alterar:** Preservar contratos de render e tratar zoom, câmera e resize.

**Verificação:** Playwright desktop/Android, smoke render e build.

**Limites:** Não tratar renderização como fonte autoritativa de estado de jogo.

**Pose do herói:** `heroPose.swordSwing` usa os mesmos tempos do combate para alinhar a espada ao alvo no instante autorizado de impacto. Não decide dano. Os pés seguem a velocidade real enquanto o torso acompanha o alvo; a arma muda a ordem de desenho ao olhar para o norte. A apresentação online usa o relógio do buffer de snapshots.

**SAC visual integrado:** `tests/browser/app.spec.ts` confere em Chromium real (desktop e perfil Android) se a saída final do `canvas#game` contém pixels variados/opacos do mundo, rejeita um Canvas sintético vazio com o mesmo avaliador e repete a observação após movimento e resize para paisagem. Também registra dimensões da captura contra a largura CSS e o `devicePixelRatio`. Esta prova observa frames efetivamente mostrados pelo Phaser, mas **não** compara igualdade de pixels entre sementes, nem certifica arte, FPS, colisões ou todos os dispositivos físicos.

**Arte procedural recuperada (`fc4d579`):** `draw.ts` contém primitivas visuais reutilizadas e `animation.ts` contém funções de passada, piscar e squash/stretch. `actors.ts` e `npcs.ts` desenham personagens; `terrain.ts` rasteriza o solo no cache dos chunks; `WorldRenderer.ts` desenha espuma de margem durante a animação. `Effects.ts` apresenta partículas, dano e rastro, sem autorizar golpes. A opção de efeitos deve continuar controlando animações decorativas, e alterações precisam ser medidas no Chromium desktop e Android (não presumir desempenho a partir do build). Tests de poses matemáticas ficam em `tests/hero-pose.test.ts`.


**Prévia do cavaleiro no inventário:** GamePageComponent reutiliza renderHero de actors.ts em Canvas separado quando a bolsa está aberta, limitando atualização a 20 FPS e cancelando animação ao fechar/destruir. O botão Girar alterna as quatro orientações, e `equippedWeapon` apresenta a espada realmente selecionada. Elmo, escudo, peitoral e demais peças do conjunto inicial são desenhadas pelo mesmo renderizador procedural.

**Aparência de equipamento do Cavaleiro:** `renderHero` recebe `gear?: GearState` e desenha elmo, peitoral, escudo, botas, pernas, mochila e pingente como peças procedurais no mesmo corpo animado (sem Canvas de personagem paralelo). Elmo acompanha o rosto e deixa os olhos à mostra; escudo acompanha o antebraço livre; botas seguem os tornozelos de `gait`; peças sobrepostas respeitam a direção frente/costas. A tela de inventário passa o conjunto real de `HudService`, a cena do jogo recebe `Inventory.gear`; na sala Node, o snapshot de jogadores próximos transmite somente o equipamento visual de cada um, preservando as quantidades/recibos da bolsa como dados privados. Clientes antigos ignoram o campo opcional. Testes: `tests/browser/app.spec.ts`, `server/tests/room.test.ts`, `tests/snapshot-timeline.test.ts`. Verificar arte em dispositivo físico antes da aprovação.

**Atlas no inventário:** `drawWorldAtlas` usa o mesmo `getTile` do terreno e fica exclusivamente na aba **Mapa do mundo** do inventário Angular. O Canvas de jogo nunca é encoberto pelo mapa. O atlas tem as escalas mundo inteiro (62.500 × 62.500 tiles, limite técnico de colisão), setor (um terço da largura) e arredores (128 tiles); nas duas escalas grandes, mostra amostragem e não rotas exatas. O desenho é acionado apenas com a aba aberta, sem segundo motor, polling ou frame extra de gameplay. O centro da vila e a posição do herói vêm das coordenadas reais, os outros jogadores vêm só dos snapshots de proximidade da sala.

**Setores:** o atlas separa a extensão de movimento em nove regiões cardeais (Noroeste/Norte/Nordeste/Oeste/Centro/Leste/Sudoeste/Sul/Sudeste). A legenda de terreno predominante resulta de amostras determinísticas da seed; são setores cartográficos, não biomas autorais, missões ou cidades adicionais. Não confundir `WORLD_EDGE_PIXELS` (bloqueio técnico de 1.000.000 px por eixo) com costa, fronteira narrativa ou região totalmente explorada.

**Retorno inesperado à origem:** a sala Node faz respawn automático na morte e volta a gerar um visitante novo após reconexão; `HeroState.respawns` opcional informa o contador autoritativo apenas ao próprio jogador. O HUD identifica quando houve morte e quando uma nova conexão gerou nova sessão, sem afirmar persistência de personagem online. Servidores Go ou legados podem não enviar esse campo; a migração de posição persistente e as causas de quedas de rede ainda exigem investigação separada.

**Espada ociosa e em ataque:** `renderHero` desenha `equippedWeapon` quando o herói está parado, mas usa `attackWeapon` enquanto um golpe iniciado ainda está em execução. O render não armazena outro inventário e recebe o estado real do motor solo ou do snapshot online.

**Acabamento do atlas (8/11):** o mapa reutiliza a paleta de `terrain.ts`, o mesmo ruído de cor do terreno e primitivas Canvas para uma rosa dos ventos, vinheta suave, grade cartográfica e marcadores contrastados. A camada estática amostrada é mantida em `WeakMap` por Canvas e viewport; snapshots online redesenham apenas os marcadores, evitando reamostrar dezenas de milhares de tiles a cada mudança de jogadores. Não há loop novo. Ao fechar o inventário, o Angular retorna à aba Bolsa e remove o Canvas do atlas, reparando a regressão de Playwright da main. Acabamento de molduras e legenda segue os materiais/relevo do inventário do cavaleiro. Testes observam o Canvas vivo e o ciclo fechar/reabrir no desktop e Android; validação visual em aparelho real continua necessária.

**Padrão de acabamento visual (8/11):** `regionalLandmarkArt.ts` isola a
pintura dos quatro marcos, com camadas de pedra/gelo/metal, facetas, argamassa,
rachaduras, reflexos, desgaste, musgo e variantes determinísticas. Reutiliza
`draw.ts`, o sprite cache 2× de `scenery.ts` e mantém o corpo colidível em
`world/regionalLandmarks.ts`. O jogo desenha somente o cache; nenhum detalhe
gráfico altera posição, colisão ou estado autoritativo. O teste
`tests/regional-landmark-art.test.ts` valida a sequência de Canvas reproduzível,
diversidade de formas e variantes; testes de navegador e inspeção visual real
continuam necessários antes do merge. O checklist de autores fica em
`AGENTS.md`.

**Contrato de arte procedural:** toda peça nova segue [docs/CONTRATO_ARTE_PROCEDURAL.md](../../docs/CONTRATO_ARTE_PROCEDURAL.md) e é registrada em `tests/helpers/artAssets.ts`. `src/render/reference/barrelReference.ts` é a peça de referência, não usada no jogo. `tests/art-contract.test.ts` mede cada peça com um gravador de Canvas (cores, gradientes, traços, curvas, tons escuro/claro, `save`/`restore`, determinismo) e proíbe aleatório, relógio, imagens e rede no render. `npm run art:preview` gera a captura das peças para revisão visual. Corrigido: a barra de vida do slime ferido era desenhada longe da criatura por um `save()` ausente em `renderSlime`.

**Arte subterrânea:** `cave.ts` gera textura procedural e a cacheia por
`CaveFloor` usando `WeakMap`; `CanvasScene` reutiliza Phaser e o canvas
existentes. O render oferece rochas facetadas, fissuras, minerais, água profunda,
musgo, gelo e areia conforme a região, além de entrada exterior por buraco,
escada ou escadaria. O atlas desenha *somente* a planta daquele andar, com
jogador e saída; não sobrepõe cartografia da superfície.

**Revisão visual do subsolo (8/11):** o primeiro desenho dos interiores
exibia uma grade de 32 pixels, fissuras idênticas em quase toda célula e
um mapa pouco legível. O novo `cave.ts` suaviza a variação de cor entre
tiles com `valueNoise` contínuo, aplica sombra de contato apenas na borda
física das paredes, reduz as fissuras repetidas e adiciona formações
regionalizadas. A escadaria recebe volume em perspectiva. A planta do
subsolo tem contorno contínuo das câmaras, seta para o herói e marcador
da saída. Textura de chão e fundo cartográfico são cacheados por
`CaveFloor` (a posição atual só redesenha os marcadores), sem mudar
colisões, salas, seeds ou protocolo online. `npm run art:preview`
agora gera `cavernas-regionais.png` com as **seis** áreas e seus mapas
reais para revisão comparativa (além de `pecas.png`); os screenshots
de desktop e Android continuam exigidos antes do merge.

**Peças do subsolo auditadas:** `caveDetails.ts` contém formações (gelo,
basalto, raízes, brejo, pedra costeira e deserto) e a escada do andar −1.
Não são exceções de cena: ambas entram em `ASSETS` para cada região, com
validação de material recortado, gradiente, contorno, detalhes de profundidade,
contraste e determinismo. A composição `cave.ts` continua em cache por
`CaveFloor` e tem teste específico de seis temas/atlas para fechar a
lacuna anterior sem criar renderizador ou motor paralelo.

**Prévia de cavernas com parede à vista:** além da planta e da imagem da
câmara inicial, `art:preview` produz `cavernas-paredes.png`, escolhendo
para cada seed uma célula transitável com rocha adjacente. Assim a revisão
enxerga relevo, material e formas regionais, não apenas o piso plano da saída.

### Arte das montarias
`mounts.ts` contém silhuetas procedurais diferentes para as dez montarias, além do cercado da vila. `renderMount` e `renderStableFence` estão em `tests/helpers/artAssets.ts` como `creature` e `structure`; sem imagens externas ou novas exceções ao contrato.

**Ruínas e lago negro do Sul (ADR 0017):** `southRuinsArt.ts` desenha as mesmas peças que a colisão usa (`world/southRuins.ts`), em duas camadas de profundidade (`back` e `front`) cacheadas por `scenery.ts`. O lago negro é desenhado em `terrain.ts` (paleta, margem de lama, juncos secos) e animado em `WorldRenderer.ts` com ondas e fio roxo no lugar da espuma branca.

**Torres do Sul (ADR 0019):** `south/towers/` tem um pintor por torre (`vigia-caida.ts`, `miragem.ts`, `sol-negro.ts`), `common.ts` com o pincel compartilhado (`TowerBrush`) e `index.ts` com `TOWER_PAINTERS`. A posição e a colisão ficam em `world/towers/`; `scenery.ts` cacheia o sprite `south-tower-<id>`.

**Interior das torres (ADR 0021):** `south/towers/interior/` tem um estilo por torre (cores e luz), as peças `wallFace.ts`, `window.ts` e `sconce.ts` (registradas como `prop`) e `floor.ts`, que pinta o andar inteiro (laje, tijolo, janelas, lampiões). `cave.ts` usa esse pintor quando a entrada é de torre.


## Arte de espécies com anatomia própria — 10/11/2026

A diferença entre ficha, IA e desenho é deliberada: as fichas canônicas e o loot
ficam em `src/monsters/`; colisão/dano em `src/actors/`; arte Canvas em
`src/render/creatures/`. As espécies prioritárias agora têm arquivos individuais
de acabamento que são **chamados pelo renderizador do jogo**, não demonstrações
isoladas: Rato das Dunas, Goblin Saqueador e Orc Nômade; além das montarias
Lagarto das Areias e Escaravelho de Carga.

O código específico acrescenta volumes, materiais, olhos, boca, cicatrizes,
vestes, armas, escamas, animação de pose e efeitos condicionais. Usa estados
verdadeiros (`hp`, `hurtTime`, `moving`, `motionPhase`, `casting`) quando
disponíveis. Não simula loot em Canvas nem muda os números de combate.

**Incompleto por design:** outras 29 espécies e oito montarias ainda precisam
do mesmo nível de acabamento em arquivos próprios. Cada atualização deve
ser medida por diferenças verificáveis de silhueta, legibilidade, reação a
estados e custo em Canvas real; 500 linhas cheias de repetições não garantem
qualidade. O lote atual não declara as demais espécies como concluídas.

**Arquivos individuais de anatomia:** as dez criaturas comuns dos Ermos agora
separam silhueta/ficha em módulos próprios em `src/render/creatures/south/`.
`regionalWave3.ts` apenas seleciona a espécie e aplica os estados globais de
render. Sete delas mantêm a anatomia original enquanto aguardam a mesma
rodada de acabamento aprofundado das três primeiras. A extração não afirma
que sete receberam arte nova.

**Anatomia por região e categoria (10/11):** os **32** arquivos de desenho
agora espelham a taxonomia canônica das fichas em
`src/monsters/<região>/<categoria>/<espécie>.ts`. A arte está em
`src/render/creatures/<região>/<categoria>/<espécieEmCamelCase>.ts`.
Exemplos: `south/rats/duneRat.ts`, `south/goblins/sandGoblin.ts`,
`north/wolves/glacialWolf.ts`, `east/serpents/stormSerpent.ts` e
`center/slimes/slime.ts`. Os 30 desenhos extraídos anteriormente foram
**movidos**, não reescritos; danos, IA, loot e algoritmo de animação continuam
os mesmos. O Besouro da Areia também está em `south/beetles/sandBeetle.ts`.
As três famílias de primitivas continuam reutilizáveis exclusivamente em
`src/render/creatures/shared/{southGeometry,wave2Geometry,regionalGeometry}.ts`;
`regionalWave2.ts`, `regionalWave3.ts` e `regionalCreatures.ts` continuam
despachantes, não repositórios de anatomias. Não há animação ou lógica nova
inventada: aprofundamento por criatura será trabalho posterior com testes.

### Montarias separadas por espécie — 10/11/2026

O renderizador `mounts.ts` agora seleciona cada um dos **dez** módulos de
`src/render/creatures/mounts/`. O arquivo `geometry.ts` guarda apenas
primitivas de volume, membros, textura, olhos e acessórios. Silhuetas,
cabeças, chifres, crinas, asas, penas, cauda, escamas e nadadeiras ficam
nos próprios arquivos, com movimento temporal determinístico. As fichas
individuais foram movidas para `src/actors/mounts/` e continuam
consumidas pelo contrato público `MountCatalog.ts`.

O primeiro acabamento aprofundado de Lagarto das Areias e Escaravelho
de Carga permanece; as outras oito montarias ganharam desenhos individuais
com materiais e movimentos característicos. Nenhuma mudança de loot,
velocidade, colisão, domar ou habilidades do motor foi feita. A avaliação
de fidelidade artística em Android físico e o aprofundamento de animações
sincronizadas ao estado real de movimento ainda são trabalhos pendentes.

**Slime em módulo próprio:** `src/render/creatures/center/slimes/slime.ts` contém
a renderização gelatinosa completa, expressões, efeitos e HP. A reexportação
em `src/render/actors.ts` preserva os imports existentes do jogo. Assim o
herói e a Slime não precisam mais dividir um arquivo de implementação.

**Escada que desce (ADR 0018):** `caveStairsDownArt.ts` desenha a descida ao andar de baixo; a de saída segue em `caveDetails.ts`. A planta (`cave.ts`) só chama as duas.

**Espadas procedurais individuais:** `src/render/swords.ts` preserva a API do jogo e despacha para os onze arquivos `src/render/swords/<id>.ts`, cada qual dono de sua silhueta, materiais, ornamentos e efeitos. `src/render/swords/shared.ts` contém somente desenho genérico de cabo, volume, iluminação e fita de ataque. Regras e progressão continuam em `src/engine/character/weapons/swords/<id>.ts`, sem dependência de Canvas no motor.


## Renderização individual dos monstros (2026-11-10)

As 32 espécies possuem arquivos próprios de anatomia em `src/render/creatures/<região>/<família>/<espécie>.ts`, correspondentes a `src/monsters/`. Cada espécie agora é dona da paleta, do desenho procedural e da função de renderização. Os três arquivos `src/render/creatures/shared/*Frame.ts` contêm apenas composição Canvas comum (pose, sombra, reflexos, indicação de vida), sem selecionar corpos ou cores por monstro.

`src/render/regionalCreatures.ts` é registro tipado que despacha para a espécie correta, sem paleta global ou `switch` de anatomia. `regionalWave2.ts` e `regionalWave3.ts` preservam a API pública antiga, encaminhando ao registro. A Slime e o Besouro da Areia já implementam renderização própria integral. A apresentação nunca decide combate, dano ou loot.

**Acabamento temporal de espadas (10/11):** as espadas de Obsidiana, Tempestade e Astral recebem, respectivamente, fissura incandescente, descarga viajante e brilho orbital na própria arte `src/render/swords/<id>.ts`. O relógio vem do parâmetro `time` de `renderHero`, inclusive na prévia do inventário, sem aleatoriedade, partículas persistidas ou efeitos sobre dano/alcance. A espada forjada ganha canal de têmpera e rebites; madeira e metais comuns permanecem estáticos quando o herói está parado. A API anterior continua válida com `time=0`.

**Acabamento individual das seis lâminas elementais:** a Areia agora tem reflexos de quartzo móveis sobre a face da lâmina, o Gelo recebe um brilho frio deslocando-se pelas facetas e o Pântano mostra veneno percorrendo os sulcos. Todos usam `animate(ctx,s,tone,time)` no arquivo específico, mesmo renderizador do jogo e prévia, `save/restore` balanceados e `time` determinístico. Madeira, Bronze e Cobre ganharam nós, pátina, marcas de forja e filetes de luz, mas **nenhuma animação mágica**. Dano, tempo de preparo e colisão não mudaram.

**Rastros físicos individuais (10/11):** Madeira desenha dois riscos de ar/poeira, Ferro projeta dois filetes de reflexão no gume, Bronze produz uma meia-lua curta e Cobre marca uma varredura pesada com duas faixas assimétricas. Cada um implementa `slashAccent` no próprio módulo da espada: a geometria usa tangente/normal do golpe e a transparência vem da janela de ataque existente. O compositor compartilhado delega ao pintor disponível, sem exigir `trailAccent` elemental nas fichas físicas. Nenhum desses rastros aparece em repouso e nenhuma regra de dano/colisão foi alterada.

**Espada Comum de Ferro (nível 15):** o motor registra `src/engine/character/weapons/swords/common.ts`, entre Ferro Batido (10) e Bronze (20). `src/render/swords/common.ts` desenha lâmina reta com canal central, rampa metálica, reflexos moderados, guarda simples e rastro físico próprio. `src/app/item-icon.component.ts` fornece ícone SVG específico. Sem aura mágica, nova regra de impacto ou bloqueio de posse: o arsenal desbloqueia normalmente com `weaponUnlocked` no nível 15, sem exigir comprar a espada de Toren.
