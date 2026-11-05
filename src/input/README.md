# Entradas do jogador

**Papel:** Teclado, joystick Android e gestos alimentam o controlador com intenções de movimento/ação.

**Ponto de entrada:** consulte [registro central](../../architecture/modules.json) e o índice gerado em [docs/INDEX.md](../../docs/INDEX.md). Os caminhos de código completos são listados automaticamente; não repetir listas manuais aqui.

**Ao alterar:** Validar toque, arrasto, cancelamento, orientação e acessibilidade.

**Verificação:** tests/mobile-controls, Playwright Android paisagem/retrato.

**Limites:** Não decidir dano, velocidade efetiva ou estado autoritativo na entrada.
