# Motor local e mecânicas

> **Atualização 2026-11-08:** o modo online/sala Node foi retirado ([ADR 0012](../../docs/adr/0012-retirada-do-multiplayer.md)). Trechos abaixo sobre sala, snapshot, `online` ou servidor autoritativo descrevem o que existiu e foi removido.

**Papel:** Simulação, inventário, navegação, combate e os recortes experimentais CLASSIC-001 a CLASSIC-004.

**Ponto de entrada:** consulte [registro central](../../architecture/modules.json) e o índice gerado em [docs/INDEX.md](../../docs/INDEX.md). Os caminhos de código completos são listados automaticamente; não repetir listas manuais aqui.

**Ao alterar:** Adicionar regra isolada com teste de casos-limite, atualizar GAMEPLAY_CLASSICO quando alterar combate.

**Ataque clássico:** o golpe é vinculado ao alvo no início da preparação. Trocar, cancelar ou perder esse alvo invalida o golpe pendente e preserva a recarga. Selecionar novamente a criatura antes do impacto não recupera o golpe invalidado. `reset()` é exclusivo da troca de simulação/jogador. A regressão está em `tests/classic-combat.test.ts`.

**Progressão:** XP é a fonte para nível e vida máxima. A simulação solo e a sala Node creditam a recompensa do catálogo no abate e compartilham a curva de `Experience.ts`.

**Derrota no solo:** dano letal encerra o tick antes de ataque ou coleta. Com vida zerada, a simulação aguarda o comando de retorno. O herói reaparece na Vila da Travessia com a vida máxima do seu nível. XP, missão, bolsa e itens no chão permanecem no mesmo mundo. Subir de nível no mesmo passo da queda aumenta só a vida máxima: o herói continua derrotado. Toda queda (contato, veneno, queimadura, espinhos ou explosão) faz `update` devolver `true`, para o jogo salvar na hora. As regressões estão em `tests/engine-invariants.test.ts`.

**Verificação:** npm test; Playwright ao afetar movimento/seleção.

**Limites:** Não importar Angular, Phaser ou browser; motor online Go/Node é separado e requer paridade.

**Perseguição em passos:** solo e Node procuram, em uma busca A*, um centro de tile caminhável dentro do alcance e da linha de visão da espada. O orçamento de recálculo continua valendo ao trocar ou cancelar alvos.

**Toque em passos:** o `TapNavigator` usa a malha de 32 px para cliques e toques no terreno do solo e nas sessões Node com passos. A rota conserva os centros adjacentes que o `ClassicTileWalker` consegue executar. Alterar o destino durante um passo preserva o movimento até seu centro final e inicia a nova rota a partir dali. Se a busca falhar, o navegador mantém a rota anterior. Chamadores que recalculam a aproximação de uma criatura podem cancelá-la explicitamente.

**Continuidade de passos:** `ClassicTileWalker` consome o restante do tick após cada centro, sem guardar tempo ocioso. Pode receber uma função de direção, consultada no centro para virar/parar corretamente. `ClassicPursuit.direction(0, ...)` só reavalia o caminho; a chamada positiva avança seu orçamento uma vez por tick. Velocidade diagonal e efeitos de ataque seguem tempo/distância, com regressão a 20, 30, 60 e 144 Hz. Ver [ADR 0006](../../docs/adr/0006-movimento-e-apresentacao-do-personagem.md).

**Moedas (ADR 0023):** `character/coins/` tem uma moeda por arquivo (Terrania Gold, Cripta Coin, Eclipse Crown) e `wallet.ts` com a regra de junção a cada 100. A bolsa guarda o dinheiro como um só inteiro em Terrania Gold (`Inventory.coins`); as moedas maiores são calculadas por `coinBreakdown`, então se unem sozinhas e o troco volta sozinho. O gel é material de troca, não dinheiro. Ainda sem drops e sem preços em moeda.

**Bolsa solo:** Aela entrega duas poções uma vez ao concluir a missão. A troca com Lina consome três unidades de gel e entrega uma poção em uma única operação do inventário. O orquestrador verifica a proximidade e grava a bolsa após uma troca concluída.

**Espadas:** Toren vende a primeira arma de equipamento. A bolsa valida e grava a compra e o equipamento. A simulação fixa dano e recarga no início do ataque. Veja [ADR 0008](../../docs/adr/0008-espadas-e-recarga.md).

**Equipamento:** `Equipment.ts` descreve espaços e itens do conjunto inicial. A bolsa valida e guarda a combinação de espaço e item. Os Slimes recebem a defesa calculada pela bolsa no solo e na sala Node. Veja [ADR 0009](../../docs/adr/0009-espacos-de-equipamento.md).

**Alimentação do Cavaleiro 1.0:** `Food.ts` concentra a tabela de maçã (+8 HP futuros; 1 gel), pão (+18; 2 gel) e carne (+30; 3 gel). Consumir um item acumula até 60 HP futuros de regeneração e impõe espera de 5 s até a próxima refeição. O `Player` restaura 1 HP a cada 2 s enquanto está ferido; não revive nem excede a vida máxima. Lina vende suprimentos por gel em solo e Node. A reserva, o progresso fracionário e a espera são persistidos no save solo e enviados privadamente no snapshot online.

### Domesticação e Cavalaria
`MountStable.ts` mantém cercado, treinamento I–III, quest do Garrano, cabresto, selas, energia, summon, montaria e persistência serializável. O `ClassicTileWalker` aplica o multiplicador de velocidade somente sobre a malha de colisão existente. Não criar segundo loop de simulação.

**Missões de domesticação:** `MountQuestState.ts` é o reducer genérico de
eventos tipados com controle de objetivos, contagem, estado determinístico
e normalização de save. `MountStable.ts` consome esse reducer e valida
nível, Cavalaria, proximidade e recursos, entregando montarias apenas após
os objetivos reais da quest. Nenhum estado do Angular é autoridade de gameplay.

**Golpe de espada:** `resolveSwordStrike` (`SwordCombat.ts`) é a única resolução de golpe, usada pela superfície e pela caverna: dano com defesa, efeito da lâmina e abates, nessa ordem. Cada cenário só decide o que fazer com cada abate. Auditoria e próximas etapas em [ADR 0014](../../docs/adr/0014-auditoria-da-logica-do-motor.md).

**Estrutura (ADR 0016):** a raiz tem só `OfflineSimulation.ts` (a simulação) e `Limits.ts`. `combat/` guarda golpe, alvo, perseguição e lista de batalha; `movement/` guarda o andar por passos e a navegação por toque; `character/` guarda experiência, bolsa, equipamento, comida, armas e itens no chão; `mounts/` guarda estábulo, missões e ações de montaria; `rooms/` guarda a caverna, o interior e as recompensas da caverna. Arquivo novo vai para a pasta do seu assunto, não para a raiz.

**Andares de caverna (ADR 0018):** `CaveRoom` conhece o andar (`floorIndex`, `floorCount`, `floorName`) e povoa pela tabela do andar em `src/dungeons`. `rooms/caveStairs.ts` decide descer, subir ou sair e cria o andar de destino; a planta e as escadas vêm de `world/caveFloor.ts`.

**Espadas em arquivos separados:** as onze fichas autoritativas de nível, dano, recarga, efeitos e rastro ficam individualmente em `character/weapons/swords/` (primeira `starter.ts`). `character/Weapons.ts` agrega sem duplicar definições nem alterar o contrato antigo. Render e ícones permanecem em seus módulos de apresentação; ver `character/weapons/swords/README.md`.
