# Phaser e coordenação do jogo

**Papel:** Game.ts coordena serviços; PhaserGame.ts mantém o loop e a cena. A decomposição em andamento está no [ADR 0013](../../docs/adr/0013-decomposicao-do-game.md): leia-o antes de mexer em `Game.ts`.

**Ponto de entrada:** consulte [registro central](../../architecture/modules.json) e o índice gerado em [docs/INDEX.md](../../docs/INDEX.md). Os caminhos de código completos são listados automaticamente; não repetir listas manuais aqui.

**Ao alterar:** Registrar novos adaptadores em vez de colocar regras adicionais em Game.ts.

**Verificação:** tests/browser, navegação, combate e sessões online.

**Limites:** Não criar segundo loop nem duplicar lógica de simulação na UI.

**Ciclo de vida do combate clássico:** troca de mundo e derrota solo chamam `ClassicCombat.reset()` para limpar o estado anterior. O orquestrador cancela passos e rotas ao detectar a derrota, e o HUD envia o comando de retorno à vila. Escape, botão Cancelar e entrada em interior limpam o alvo e o golpe pendente, preservando o relógio de ataque e a pausa da simulação.

**Navegação subterrânea (solo):** `Game` detecta entradas próximas com E,
suspende a simulação da superfície e usa `CaveRoom` para movimento/colisão
do andar −1. A posição superficial é preservada enquanto se explora, sem
criar um segundo motor de gameplay; a transição limpa rotas, combate, input
e efeitos. Caminhar até a escada ou E perto dela retorna à mesma entrada.
Ao recarregar a página, a aventura solo retoma na superfície (fase inicial).
No online, o servidor permanece autoritativo e não recebe estados de cave.

**Estrutura (ADR 0013):** `messages/` guarda os textos (dados), `actions/shopActions.ts` as ações de loja e bolsa (devolvem `{ message, changed }`; quem chama salva e atualiza o HUD) e `interactions.ts` as decisões puras sobre o que a tecla de interação faz e o que o HUD oferece. As regras de montaria e as recompensas de caverna ficam no motor (`src/engine/MountActions.ts`, `src/engine/CaveRewards.ts`). **Não acrescente regra de jogo em `Game.ts`:** `tests/file-size-budget.test.ts` impede o arquivo de crescer.

**Modos de jogo (ADR 0013, sessão 3):** `Game.ts` só cuida do início de cada quadro (entrada, pausa, direção), das transições e do ciclo de vida. O resto do quadro roda em `modes/`: `surfaceMode.ts` (superfície), `caveMode.ts` e `interiorMode.ts`, cada um uma função `tickX(host, ..., frame)`. Um modo só alcança o jogo pela interface `ModeHost` (`modes/types.ts`): precisa de algo novo, acrescente ali. `TravelState` reúne rota, passo, perseguição e alvo; use `stopSteps`, `stopMotion` ou `stopAll` conforme a intenção (`combat.reset()` zera a recarga do golpe, `combat.cancel()` a preserva; entrar numa casa usa `cancel()` de propósito). `scene.render` recebe um `SurfaceFrame` com campos nomeados.
