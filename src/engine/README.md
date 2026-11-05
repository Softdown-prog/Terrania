# Motor local e mecânicas

**Papel:** Simulação, inventário, navegação, combate e os recortes experimentais CLASSIC-001 a CLASSIC-004.

**Ponto de entrada:** consulte [registro central](../../architecture/modules.json) e o índice gerado em [docs/INDEX.md](../../docs/INDEX.md). Os caminhos de código completos são listados automaticamente; não repetir listas manuais aqui.

**Ao alterar:** Adicionar regra isolada com teste de casos-limite, atualizar GAMEPLAY_CLASSICO quando alterar combate.

**Verificação:** npm test; Playwright ao afetar movimento/seleção.

**Limites:** Não importar Angular, Phaser ou browser; motor online Go/Node é separado e requer paridade.
