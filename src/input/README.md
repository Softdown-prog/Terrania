# Entradas do jogador

**Papel:** Teclado, joystick Android e gestos alimentam o controlador com intenções de movimento/ação.

**Ponto de entrada:** consulte [registro central](../../architecture/modules.json) e o índice gerado em [docs/INDEX.md](../../docs/INDEX.md). Os caminhos de código completos são listados automaticamente; não repetir listas manuais aqui.

**Ao alterar:** Validar toque, arrasto, cancelamento, orientação e acessibilidade.

**Verificação:** tests/mobile-controls, Playwright Android paisagem/retrato.

**Limites:** Não decidir dano, velocidade efetiva ou estado autoritativo na entrada.

**Comandos curtos:** uma intenção de teclado/joystick sobrevive à liberação até `acknowledgeMovement()` após um tick solo/interior ou envio online. `movement()` não consome a intenção: um frame sem tick não pode perder uma tecla curta. `pointercancel` e perda inesperada de captura descartam o gesto pendente; `pointerup` preserva um toque curto concluído. `clear()` descarta a intenção, solta capturas e limpa ações em blur, ocultação, resize, menus e troca de mundo.
