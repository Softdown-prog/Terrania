# Phaser e coordenação do jogo

**Papel:** Game.ts coordena serviços; PhaserGame.ts mantém o loop e a cena.

**Ponto de entrada:** consulte [registro central](../../architecture/modules.json) e o índice gerado em [docs/INDEX.md](../../docs/INDEX.md). Os caminhos de código completos são listados automaticamente; não repetir listas manuais aqui.

**Ao alterar:** Registrar novos adaptadores em vez de colocar regras adicionais em Game.ts.

**Verificação:** tests/browser, navegação, combate e sessões online.

**Limites:** Não criar segundo loop nem duplicar lógica de simulação na UI.

**Ciclo de vida do combate clássico:** troca de mundo e derrota solo chamam `ClassicCombat.reset()` para limpar o estado anterior. O orquestrador cancela passos e rotas ao detectar a derrota, e o HUD envia o comando de retorno à vila. Escape, botão Cancelar e entrada em interior limpam o alvo e o golpe pendente, preservando o relógio de ataque e a pausa da simulação.

**Navegação subterrânea (solo):** `Game` detecta entradas próximas com E,
suspende a simulação da superfície e usa `CaveRoom` para movimento/colisão
do andar −1. A posição superficial é preservada enquanto se explora, sem
criar um segundo motor de gameplay; a transição limpa rotas, combate, input
e efeitos. Caminhar até a escada ou E perto dela retorna à mesma entrada.
Ao recarregar a página, a aventura solo retoma na superfície (fase inicial).
No online, o servidor permanece autoritativo e não recebe estados de cave.
