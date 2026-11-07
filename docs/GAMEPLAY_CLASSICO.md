# Terrania — combate clássico e caminhada por tiles

## Referência histórica
O período desejado é o MMORPG clássico entre 2008 e 2010. A versão 8.60 de Tibia saiu em 30/06/2010; a sensação de 2008/2009 aproxima-se de 8.4/8.5. São referências de *regras de interação*, não de código, sprites, mapa, efeitos, nomes exclusivos ou interface copiada.

## Isolamento
O combate por alvo e a caminhada por tiles fazem parte da entrada normal de Jogar. As salas Node executam os mesmos controles com autoridade no servidor.

## Recorte CLASSIC-001
- A aventura solo e as salas Node compatíveis oferecem seleção de alvo e ataque automático. A URL `?modo=classico` continua abrindo a aventura solo.
- Clique ou toque sobre criatura para selecionar alvo; Space/J ou botão ATACAR escolhe a criatura mais próxima. Escape cancela o alvo. Clicar no chão continua a caminhar.
- Cada acionamento de Space/J ou ATACAR solicita seleção ou retomada da perseguição uma vez. Segurar o comando permite cancelar o alvo e sair da perseguição sem que o mesmo acionamento os reative. O combate segue automaticamente enquanto houver um alvo selecionado.
- Ao apertar ATACAR durante uma caminhada por toque, o herói só troca a rota pela perseguição se selecionar uma criatura ou retomar um alvo vivo. Sem alvo, continua até o destino escolhido. Nas salas Node, o servidor decide a troca.
- Personagem executa ataques automáticos periódicos contra **o único alvo selecionado**, apenas quando alcance, linha de visão, estado do herói e intervalo permitem. O motor decide impacto, abate, loot e inventário. Selecionar outro alvo, cancelar o alvo, perdê-lo ou trocar de espada preserva a recarga em curso. O relógio continua avançando nos ticks de simulação. Trocar de mundo ou morrer reinicia o estado de combate.
- Se o jogador trocar ou cancelar o alvo durante a preparação (70 ms na espada inicial e 180 ms na forjada), a animação termina sem causar dano. O alvo recém-selecionado fica disponível para o próximo ataque após a recarga.
- Se o herói e a criatura estiverem sobrepostos em terreno caminhável, o ataque pode começar no lugar com a última direção do herói. A perseguição considera o alvo já ao alcance e, ao planejar uma aproximação, procura um ponto separado da posição da criatura.
- Nas salas Node, o servidor valida a criatura, calcula o seguimento e aplica o dano. O [contrato de combate](adr/0004-combate-por-alvo.md) descreve a compatibilidade entre versões.
- A apresentação Angular mostra o alvo sem painel de jogadores sobre o mapa; input funciona com teclado e touch.

## Recorte CLASSIC-002 — Perseguição automática por A*
- Selecionar um monstro habilita a aproximação até um dos pontos caminháveis próximos da criatura, em passos de 32 px.
- O planejador usa tiles de 32 px para gerar posições válidas de ataque ao redor do alvo e o TapNavigator com A* para contornar árvores, paredes e pedras. Não teleporta nem atravessa obstáculos.
- Persegue alvos vivos dentro de 16 tiles (512 px). O A* procura os centros válidos de ataque em uma busca, com intervalo mínimo de 0,4 s entre recálculos. A espada inicial tem 1,6 s de recarga e a espada de Toren tem 2 s.
- Para quando entra no alcance real da espada e há linha de visão. Tenta outros pontos próximos se a posição ideal estiver bloqueada. Alvos removidos ou morte do herói cancelam o seguimento.
- WASD/joystick têm prioridade enquanto acionados. Toque no terreno permite caminhar manualmente sem perseguição até escolher o alvo novamente ou apertar ATACAR; o alvo permanece selecionado para ataque se estiver ao alcance.
- Regressões: tests/classic-pursuit.test.ts, tests/classic-combat.test.ts, tests/tap-navigation.test.ts e tests/browser/classic-combat.spec.ts. Confirmar testes unitários, build Angular, Playwright Android e desktop e smoke Docker no workflow de validação antes de aceitar o recorte.

## Cura rápida no HUD

A poção pode ser usada diretamente abaixo da barra de vida, sem abrir a bolsa. O botão mostra a quantidade disponível e fica desabilitado com vida cheia, sem poções, durante uma solicitação online pendente ou quando o inventário da sala não está disponível. Reutiliza a mesma ação da bolsa e o recibo autoritativo do servidor; não altera cura, custo, protocolo ou inventário. O feedback breve também fica disponível ao leitor de tela. Teste de regressão: `tests/browser/session.spec.ts` (desktop e Android).

## Testes
`npm test`, `npm run typecheck`, `npm run build`, suíte Playwright desktop/Android, QA-BOT e workflows completos. Nenhuma aprovação automática por compilar.

## CLASSIC-003 — Battle List lateral

- A janela BATTLE lista os Slimes vivos cujos sprites estão dentro da viewport do Canvas (câmera real + zoom, com tolerância de 10 unidades na borda). Monstros que saem da tela, morrem ou deixam de existir saem da lista automaticamente.
- Exibe nome e vida máxima vindos do catálogo (Slime: 2 HP), vida atual com barra de proporção, distância em tiles de 32 px e destaque do alvo selecionado. Ordena por distância e ID, limitado a 24 criaturas por atualização.
- Clicar/tocar numa linha valida novamente que aquele monstro está visível e vivo antes de chamar a mesma seleção de alvo do cenário. A perseguição A* já existente continua responsável por aproximar o herói, respeitando alcance, paredes e tempo de ataque.
- Painel lateral expansível ou recolhível por botão BATTLE; aberto por padrão no desktop com mouse, fechado por padrão em telas pequenas/touch para não cobrir o mapa. Um painel recolhido continua atualizando a contagem.
- Em telas pequenas ou com toque, a lista tem até 144 px de largura e mostra cerca de duas linhas em retrato. Deslize dentro do painel para ver as outras criaturas. Cada linha continua com pelo menos 44 px para seleção por toque.
- Atualização aproximadamente a cada 0,2 s; Angular só recebe novos sinais quando a lista muda. Ao entrar em interior, trocar mundo ou sair, a lista limpa. Estado não é persistido no save.
- A lista mostra criaturas do motor solo ou dos snapshots online. Jogadores têm apresentação separada.
- Regressões: tests/classic-battle-list.test.ts e tests/browser/classic-battle-list.spec.ts, além da CI do frontend Angular/Phaser, Node, Playwright Android e desktop, e Docker.

### Catálogo de criaturas

`src/actors/CreatureCatalog.ts` define o nome, a vida máxima e o dano de contato do Slime (2 HP e 9 de dano). Cada instância mantém seus próprios ID, posição e HP atual. A Battle List e o rótulo do alvo leem a definição pelo tipo; a perseguição usa somente a visão da criatura. Esta etapa conserva a IA, colisão, loot e spawn existentes, sem acrescentar espécies nem campos ao protocolo ou ao save.

No solo e nas salas Node, o dano de contato do Slime exige menos de 24 px de distância e um caminho direto livre até o herói. Quinas e outros obstáculos bloqueiam esse dano. O Slime pode atacar assim que tiver passagem e sua recarga permitir.

## CLASSIC-004 — Caminhada por tiles no jogo

- A entrada normal de `/jogar/` usa passos por tiles no exterior solo e nas salas Node que anunciam a capacidade. `?modo=solo` força a aventura local. `?modo=classico` ativa o combate por alvo. Links com `passos=1` continuam abrindo o jogo.
- Personagem segue passos **visualmente interpolados** entre centros de tiles de 32×32, em oito direções. Cada passo iniciado termina em um centro de tile; diagonais demoram mais que passos cardinais em função da distância real.
- Valida a rota inteira contra `CollisionMap` a cada início de passo, e cada submovimento passa por `moveBody`; recusa passos atravessando paredes, quinas e terreno bloqueado. Saves antigos fora do centro não são teletransportados: o primeiro passo termina no centro da célula adjacente.
- Mesmo se soltar o controle no meio do passo, ele termina. No exterior solo, uma virada curta por tecla ou joystick aguarda o centro do tile e é aplicada uma vez. Os interiores usam a navegação local contínua.
- O temporizador de ataque/recarga, dano e invulnerabilidade continua avançando uma vez por tick através de `Player.update(..., timersOnly=true)`. Deslocamento e colisão permanecem isolados em `ClassicTileWalker`.
- Um golpe recebido interrompe a rota por toque e permite concluir o passo já iniciado. Um novo toque após o impacto pode solicitar outra rota durante o efeito visual de dano.
- Clique ou toque no terreno usa o A* na malha de 32 px. Cada trecho é um passo adjacente validado contra a colisão. O herói termina no centro do tile tocado. Ao trocar o destino durante um passo, o novo caminho começa no fim desse passo. Se o tile estiver bloqueado ou não houver rota, o herói mantém a caminhada ou perseguição atual.
- A perseguição usa a mesma malha de 32 px e procura um tile de ataque alcançável.
- Nas salas Node, o servidor calcula a rota, aplica colisões e envia snapshots a todos os jogadores. O navegador interpola a posição recebida. Consulte o [contrato multiplayer](adr/0003-caminhada-por-tiles.md).

### Correção de alcance na perseguição por passos

No modo clássico, os destinos ao redor do alvo são centros reais de tiles de 32 px, validados contra colisão, alcance da espada e linha de visão. A regressão cobre 162 posições de alvo fora da malha e o ciclo de dois ataques sem atingir outra criatura.

Sem uma rota válida até um ponto de ataque, o herói aguarda no último tile caminhável.

### Continuidade de movimento e ataque

O controlador conserva o tempo ao cruzar centros, mantendo a velocidade entre frequências de simulação e sem dar vantagem à diagonal. Rotas podem virar ou parar no centro dentro do mesmo tick. Ao terminar um ataque, a direção de caminhada volta imediatamente, mesmo no meio de um passo. A espada cruza a direção do alvo ao terminar o preparo da arma, e os pés acompanham o deslocamento enquanto o herói ataca.

O Node publica tempo de simulação e fim do passo para apresentar curvas e animações na mesma linha temporal. Teclas/toques curtos não desaparecem entre frames ou entre recebimento e tick do servidor. Detalhes, compatibilidade e limites no [ADR 0006](adr/0006-movimento-e-apresentacao-do-personagem.md).
