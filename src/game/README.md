# Phaser e coordenação do jogo

**Papel:** Game.ts coordena serviços; PhaserGame.ts mantém o loop e a cena.

**Ponto de entrada:** consulte [registro central](../../architecture/modules.json) e o índice gerado em [docs/INDEX.md](../../docs/INDEX.md). Os caminhos de código completos são listados automaticamente; não repetir listas manuais aqui.

**Ao alterar:** Registrar novos adaptadores em vez de colocar regras adicionais em Game.ts.

**Verificação:** tests/browser, navegação, combate e sessões online.

**Limites:** Não criar segundo loop nem duplicar lógica de simulação na UI.
