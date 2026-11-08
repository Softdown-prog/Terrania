# Motor local e mecânicas

> **Atualização 2026-11-08:** o modo online/sala Node foi retirado ([ADR 0012](../../docs/adr/0012-retirada-do-multiplayer.md)). Trechos abaixo sobre sala, snapshot, `online` ou servidor autoritativo descrevem o que existiu e foi removido.

**Papel:** Simulação, inventário, navegação, combate e os recortes experimentais CLASSIC-001 a CLASSIC-004.

**Ponto de entrada:** consulte [registro central](../../architecture/modules.json) e o índice gerado em [docs/INDEX.md](../../docs/INDEX.md). Os caminhos de código completos são listados automaticamente; não repetir listas manuais aqui.

**Ao alterar:** Adicionar regra isolada com teste de casos-limite, atualizar GAMEPLAY_CLASSICO quando alterar combate.

**Ataque clássico:** o golpe é vinculado ao alvo no início da preparação. Trocar, cancelar ou perder esse alvo invalida o golpe pendente e preserva a recarga. Selecionar novamente a criatura antes do impacto não recupera o golpe invalidado. `reset()` é exclusivo da troca de simulação/jogador. A regressão está em `tests/classic-combat.test.ts`.

**Progressão:** XP é a fonte para nível e vida máxima. A simulação solo e a sala Node creditam a recompensa do catálogo no abate e compartilham a curva de `Experience.ts`.

**Derrota no solo:** dano letal encerra o tick antes de ataque ou coleta. Com vida zerada, a simulação aguarda o comando de retorno. O herói reaparece na Vila da Travessia com a vida máxima do seu nível. XP, missão, bolsa e itens no chão permanecem no mesmo mundo.

**Verificação:** npm test; Playwright ao afetar movimento/seleção.

**Limites:** Não importar Angular, Phaser ou browser; motor online Go/Node é separado e requer paridade.

**Perseguição em passos:** solo e Node procuram, em uma busca A*, um centro de tile caminhável dentro do alcance e da linha de visão da espada. O orçamento de recálculo continua valendo ao trocar ou cancelar alvos.

**Toque em passos:** o `TapNavigator` usa a malha de 32 px para cliques e toques no terreno do solo e nas sessões Node com passos. A rota conserva os centros adjacentes que o `ClassicTileWalker` consegue executar. Alterar o destino durante um passo preserva o movimento até seu centro final e inicia a nova rota a partir dali. Se a busca falhar, o navegador mantém a rota anterior. Chamadores que recalculam a aproximação de uma criatura podem cancelá-la explicitamente.

**Continuidade de passos:** `ClassicTileWalker` consome o restante do tick após cada centro, sem guardar tempo ocioso. Pode receber uma função de direção, consultada no centro para virar/parar corretamente. `ClassicPursuit.direction(0, ...)` só reavalia o caminho; a chamada positiva avança seu orçamento uma vez por tick. Velocidade diagonal e efeitos de ataque seguem tempo/distância, com regressão a 20, 30, 60 e 144 Hz. Ver [ADR 0006](../../docs/adr/0006-movimento-e-apresentacao-do-personagem.md).

**Bolsa solo:** Aela entrega duas poções uma vez ao concluir a missão. A troca com Lina consome três unidades de gel e entrega uma poção em uma única operação do inventário. O orquestrador verifica a proximidade e grava a bolsa após uma troca concluída.

**Espadas:** Toren vende a primeira arma de equipamento. A bolsa valida e grava a compra e o equipamento. A simulação fixa dano e recarga no início do ataque. Veja [ADR 0008](../../docs/adr/0008-espadas-e-recarga.md).

**Equipamento:** `Equipment.ts` descreve espaços e itens do conjunto inicial. A bolsa valida e guarda a combinação de espaço e item. Os Slimes recebem a defesa calculada pela bolsa no solo e na sala Node. Veja [ADR 0009](../../docs/adr/0009-espacos-de-equipamento.md).

**Alimentação do Cavaleiro 1.0:** `Food.ts` concentra a tabela de maçã (+8 HP futuros; 1 gel), pão (+18; 2 gel) e carne (+30; 3 gel). Consumir um item acumula até 60 HP futuros de regeneração e impõe espera de 5 s até a próxima refeição. O `Player` restaura 1 HP a cada 2 s enquanto está ferido; não revive nem excede a vida máxima. Lina vende suprimentos por gel em solo e Node. A reserva, o progresso fracionário e a espera são persistidos no save solo e enviados privadamente no snapshot online.
