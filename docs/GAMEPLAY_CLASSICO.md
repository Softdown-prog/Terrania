# Terrania — combate clássico e caminhada por tiles

## Referência histórica
O período desejado é o MMORPG clássico entre 2008 e 2010. A versão 8.60 de Tibia saiu em 30/06/2010; a sensação de 2008/2009 aproxima-se de 8.4/8.5. São referências de *regras de interação*, não de código, sprites, mapa, efeitos, nomes exclusivos ou interface copiada.

## Isolamento
Os recortes de combate começaram na revisão `6ce58c1`. A evolução da caminhada faz parte da entrada normal do jogo e tem contrato próprio para as salas Node. O PR #42 continua uma proposta separada.

## Recorte CLASSIC-001
- `?modo=classico`: aventura solo com seleção de alvo e ataque automático.
- Clique ou toque sobre criatura para selecionar alvo; Space/J ou botão ATACAR escolhe a criatura mais próxima. Escape cancela o alvo. Clicar no chão continua a caminhar.
- Personagem executa ataques automáticos periódicos contra **o único alvo selecionado**, apenas quando alcance, linha de visão, estado do herói e intervalo permitem. O motor continua decidindo impacto, kill, loot e inventário. Selecionar outro alvo, cancelar por Escape ou pelo botão e perder um alvo morto/removido não zeram a recarga de 1,6 s. O relógio continua avançando nos ticks de simulação mesmo sem alvo; menus e interiores mantêm a pausa existente. Somente a substituição do mundo ou o respawn com um novo jogador reiniciam o estado de combate.
- Se o jogador trocar ou cancelar o alvo durante os 70 ms de preparação da espada, a animação termina sem causar dano. O alvo recém-selecionado fica disponível para o próximo ataque após a recarga.
- Ataque automático não muda o contrato Go, não cria PvP, magia, vocação ou créditos arbitrários de XP.
- A apresentação Angular mostra o alvo sem painel de jogadores sobre o mapa; input funciona com teclado e touch.

## Recorte CLASSIC-002 — Perseguição automática por A* (somente solo clássico)
- Selecionar um monstro habilita a aproximação até um dos pontos caminháveis próximos da criatura, em passos de 32 px.
- O planejador usa tiles de 32 px para gerar posições válidas de ataque ao redor do alvo e o TapNavigator com A* para contornar árvores, paredes e pedras. Não teleporta nem atravessa obstáculos.
- Só persegue alvos vivos dentro de 16 tiles (512 px), com novo plano limitado a intervalos de aproximadamente 0,4 s ou se o alvo deslocar 16 px. Não recalcula caminhos a cada tick e não muda o cooldown de 1,6 s.
- Para quando entra no alcance real da espada e há linha de visão. Tenta outros pontos próximos se a posição ideal estiver bloqueada. Alvos removidos ou morte do herói cancelam o seguimento.
- WASD/joystick têm prioridade enquanto acionados. Toque no terreno permite caminhar manualmente sem perseguição até escolher o alvo novamente ou apertar ATACAR; o alvo permanece selecionado para ataque se estiver ao alcance.
- Regressões: tests/classic-pursuit.test.ts, tests/classic-combat.test.ts, tests/tap-navigation.test.ts e tests/browser/classic-combat.spec.ts. Confirmar testes unitários, build Angular, Playwright Android e desktop e smoke Docker no workflow de validação antes de aceitar o recorte.

## Testes
`npm test`, `npm run typecheck`, `npm run build`, suíte Playwright desktop/Android, QA-BOT e workflows completos. Nenhuma aprovação automática por compilar.

## CLASSIC-003 — Battle List lateral (protótipo offline)

- A janela BATTLE lista os Slimes vivos cujos sprites estão dentro da viewport do Canvas (câmera real + zoom, com tolerância de 10 unidades na borda). Monstros que saem da tela, morrem ou deixam de existir saem da lista automaticamente.
- Exibe nome e vida máxima vindos do catálogo (Slime: 2 HP), vida atual com barra de proporção, distância em tiles de 32 px e destaque do alvo selecionado. Ordena por distância e ID, limitado a 24 criaturas por atualização.
- Clicar/tocar numa linha valida novamente que aquele monstro está visível e vivo antes de chamar a mesma seleção de alvo do cenário. A perseguição A* já existente continua responsável por aproximar o herói, respeitando alcance, paredes e tempo de ataque.
- Painel lateral expansível ou recolhível por botão BATTLE; aberto por padrão no desktop com mouse, fechado por padrão em telas pequenas/touch para não cobrir o mapa. Um painel recolhido continua atualizando a contagem.
- Atualização aproximadamente a cada 0,2 s; Angular só recebe novos sinais quando a lista muda. Ao entrar em interior, trocar mundo ou sair, a lista limpa. Estado não é persistido no save.
- Não inclui criaturas online, jogadores, PvP, novos monstros, drag and drop, magias ou inventário. O modo solo normal e o multiplayer permanecem inalterados. Não usar assets de Tibia.
- Regressões: tests/classic-battle-list.test.ts e tests/browser/classic-battle-list.spec.ts, além da CI do frontend Angular/Phaser, Node, Playwright Android e desktop, e Docker.

### Catálogo de criaturas

`src/actors/CreatureCatalog.ts` define o nome, a vida máxima e o dano de contato do Slime (2 HP e 9 de dano). Cada instância mantém seus próprios ID, posição e HP atual. A Battle List e o rótulo do alvo leem a definição pelo tipo; a perseguição usa somente a visão da criatura. Esta etapa conserva a IA, colisão, loot e spawn existentes, sem acrescentar espécies nem campos ao protocolo ou ao save.

## CLASSIC-004 — Caminhada por tiles no jogo

- A entrada normal de `/jogar/` usa passos por tiles no exterior solo e nas salas Node que anunciam a capacidade. `?modo=solo` força a aventura local. `?modo=classico` ativa o combate por alvo. Links com `passos=1` continuam abrindo o jogo.
- Personagem segue passos **visualmente interpolados** entre centros de tiles de 32×32, em oito direções. Cada passo iniciado termina em um centro de tile; diagonais demoram mais que passos cardinais em função da distância real.
- Valida a rota inteira contra `CollisionMap` a cada início de passo, e cada submovimento passa por `moveBody`; recusa passos atravessando paredes, quinas e terreno bloqueado. Saves antigos fora do centro não são teletransportados: o primeiro passo termina no centro da célula adjacente.
- Mesmo se soltar o controle no meio do passo, ele termina. A próxima direção é interpretada no centro do tile. Os interiores usam a navegação local contínua.
- O temporizador de ataque/recarga, dano e invulnerabilidade continua avançando uma vez por tick através de `Player.update(..., timersOnly=true)`. Deslocamento e colisão permanecem isolados em `ClassicTileWalker`.
- Clique ou toque no terreno usa o A* na malha de 32 px. Cada trecho é um passo adjacente validado contra a colisão. O herói termina no centro do tile tocado. Ao trocar o destino durante um passo, o novo caminho começa no fim desse passo. Um tile bloqueado ou sem rota não inicia caminhada.
- A perseguição ainda usa o navegador contínuo e um raio de chegada ampliado. Passagens incompatíveis com os passos de 32 px podem interromper o seguimento.
- Nas salas Node, o servidor calcula a rota, aplica colisões e envia snapshots a todos os jogadores. O navegador interpola a posição recebida. Consulte o [contrato multiplayer](adr/0003-caminhada-por-tiles.md).

### Correção de alcance na perseguição por passos

No modo clássico, os destinos ao redor do alvo são centros reais de tiles de 32 px, validados contra colisão, alcance da espada e linha de visão. A regressão cobre 162 posições de alvo fora da malha e o ciclo de dois ataques sem atingir outra criatura.

O navegador de perseguição pode encerrar o seguimento em passagens incompatíveis com passos de 32 px.
