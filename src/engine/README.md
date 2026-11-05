# Motor local e mecânicas

**Papel:** Simulação, inventário, navegação, combate e os recortes experimentais CLASSIC-001 a CLASSIC-004.

**Ponto de entrada:** consulte [registro central](../../architecture/modules.json) e o índice gerado em [docs/INDEX.md](../../docs/INDEX.md). Os caminhos de código completos são listados automaticamente; não repetir listas manuais aqui.

**Ao alterar:** Adicionar regra isolada com teste de casos-limite, atualizar GAMEPLAY_CLASSICO quando alterar combate.

**Ataque clássico:** o golpe é vinculado ao alvo no início da preparação. Trocar, cancelar ou perder esse alvo invalida o golpe pendente e preserva a recarga. Selecionar novamente a criatura antes do impacto não recupera o golpe invalidado. `reset()` é exclusivo da troca de simulação/jogador. A regressão está em `tests/classic-combat.test.ts`.

**Progressão:** XP é a fonte para nível e vida máxima. A simulação solo e a sala Node creditam a recompensa do catálogo no abate e compartilham a curva de `Experience.ts`.

**Verificação:** npm test; Playwright ao afetar movimento/seleção.

**Limites:** Não importar Angular, Phaser ou browser; motor online Go/Node é separado e requer paridade.

**Perseguição em passos:** solo e Node procuram, em uma busca A*, um centro de tile caminhável dentro do alcance e da linha de visão da espada. O orçamento de recálculo continua valendo ao trocar ou cancelar alvos.

**Toque em passos:** o `TapNavigator` usa a malha de 32 px para cliques e toques no terreno do solo e nas sessões Node com passos. A rota conserva os centros adjacentes que o `ClassicTileWalker` consegue executar. Alterar o destino durante um passo preserva o movimento até seu centro final e inicia a nova rota a partir dali.

**Bolsa solo:** Aela entrega duas poções uma vez ao concluir a missão. A troca com Lina consome três unidades de gel e entrega uma poção em uma única operação do inventário. O orquestrador verifica a proximidade e grava a bolsa após uma troca concluída.
