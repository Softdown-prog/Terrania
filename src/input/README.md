# Entradas do jogador

**Papel:** Teclado, joystick Android e gestos alimentam o controlador com intenções de movimento/ação.

**Ponto de entrada:** consulte [registro central](../../architecture/modules.json) e o índice gerado em [docs/INDEX.md](../../docs/INDEX.md). Os caminhos de código completos são listados automaticamente; não repetir listas manuais aqui.

**Ao alterar:** Validar toque, arrasto, cancelamento, orientação e acessibilidade.

**Verificação:** tests/mobile-controls, Playwright Android paisagem/retrato.

**Limites:** Não decidir dano, velocidade efetiva ou estado autoritativo na entrada.

**Ataque:** no combate por alvo, `consumeAttack(false)` consome uma intenção por acionamento. O modo direcional permite repetir por tecla de jogo ou ponteiro mantido com `consumeAttack(true)`. Cliques de acessibilidade no botão continuam acionando o ataque.

**Comandos curtos:** `movement()` lê a direção sem consumi-la. No exterior solo, `acknowledgeMovement()` só consome a intenção quando o controlador pede a direção do próximo passo. No interior e no online, o consumo acontece ao aplicar o movimento contínuo ou enviar a direção. Um pequeno ajuste do joystick na mesma direção não enfileira outro passo. `pointercancel` e perda inesperada de captura descartam o gesto pendente. `pointerup` preserva um toque curto concluído. `clear()` descarta a intenção, solta capturas e limpa ações em blur, ocultação, resize, menus e troca de mundo.
