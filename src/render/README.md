# Renderizador e UI adaptável

**Papel:** CanvasScene e módulos de render desenham mundo, entidades e efeitos; GameUi é a fronteira com o HUD.

`Game` traduz o estado do herói e as interações com o mundo para dados de leitura em `GameUi`. A interface recebe vida, posição em tiles, quantidades da bolsa e as ações conversar, ler ou entrar. O orquestrador executa os comandos e atualiza o HUD.

**Ponto de entrada:** consulte [registro central](../../architecture/modules.json) e o índice gerado em [docs/INDEX.md](../../docs/INDEX.md). Os caminhos de código completos são listados automaticamente; não repetir listas manuais aqui.

**Ao alterar:** Preservar contratos de render e tratar zoom, câmera e resize.

**Verificação:** Playwright desktop/Android, smoke render e build.

**Limites:** Não tratar renderização como fonte autoritativa de estado de jogo.
