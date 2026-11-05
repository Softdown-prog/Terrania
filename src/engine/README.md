# Motor local e mecânicas

**Papel:** Simulação, inventário, navegação, combate e os recortes experimentais CLASSIC-001 a CLASSIC-004.

**Ponto de entrada:** consulte [registro central](../../architecture/modules.json) e o índice gerado em [docs/INDEX.md](../../docs/INDEX.md). Os caminhos de código completos são listados automaticamente; não repetir listas manuais aqui.

**Ao alterar:** Adicionar regra isolada com teste de casos-limite, atualizar GAMEPLAY_CLASSICO quando alterar combate.

**Ataque clássico:** o golpe é vinculado ao alvo no início da preparação. Trocar, cancelar ou perder esse alvo invalida o golpe pendente e preserva a recarga. Selecionar novamente a criatura antes do impacto não recupera o golpe invalidado. `reset()` é exclusivo da troca de simulação/jogador. A regressão está em `tests/classic-combat.test.ts`.

**Verificação:** npm test; Playwright ao afetar movimento/seleção.

**Limites:** Não importar Angular, Phaser ou browser; motor online Go/Node é separado e requer paridade.

**Perseguição em passos:** o modo opt-in escolhe centros de tiles caminháveis já dentro do alcance e da linha de visão da espada. O anel contínuo de aproximação continua exclusivo do movimento contínuo. A regressão de alvos fora da malha fica nos testes de perseguição e caminhada clássica.
