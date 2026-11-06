# ADR 0003 — Caminhada por tiles na entrada normal

O exterior solo usa `ClassicTileWalker` e `TapNavigator` para caminhar entre centros de tiles. A partida online com suporte usa as mesmas regras no servidor Node. O navegador desenha a posição interpolada dos snapshots, inclusive a do próprio jogador.

O frontend e o servidor são publicados separadamente. No protocolo v3, o navegador pede `movement=tiles` na abertura da conexão e usa o modo quando recebe `movement: "tiles"` no `welcome`. Sessões sem essa confirmação usam o fluxo contínuo por vetores, incluindo clientes antigos e a implementação Go atual.

Na sessão com tiles, `input` continua transportando direção e ataque. `walk` transporta um destino em coordenadas do mundo ou `null` para cancelar. O servidor encaixa o destino no centro do tile, valida colisões e publica `walkTarget` apenas para o dono da rota.

O planejador online aceita destinos a até 480 unidades do ponto de partida, processa no máximo uma solicitação por tick de sala e uma por convidado a cada 350 ms. A fila conserva somente o destino mais recente de cada convidado. Cancelamento, direção manual, ataque, dano e saída da sala descartam a rota pendente. Soltar a direção ou cancelar a rota permite concluir o passo já iniciado.

No solo e no Node, um novo toque só substitui a rota ou suspende a perseguição quando o planejador encontra um caminho válido. Enquanto o Node aguarda o orçamento para calcular a nova rota, o herói pode continuar pela anterior. Um destino bloqueado, desconectado ou fora do alcance preserva o comando atual. Tocar o centro do tile de chegada do passo atual é aceito como rota vazia e encerra a caminhada nesse centro.

O cancelamento por dano ocorre no impacto, quando o contador de golpes aplicados do herói muda. Uma ordem recebida depois desse impacto pode ser planejada durante o efeito visual de dano, respeitando o orçamento de planejamento da sala.
