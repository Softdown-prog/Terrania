# ADR 0006 — Continuidade dos passos e apresentação do personagem

## Problema

O controlador descartava o tempo restante ao chegar ao centro de cada tile. Mantendo uma direção, um servidor a 20 Hz levava seis ticks para percorrer 32 px: aproximadamente 106,7 px/s, embora a velocidade nominal fosse 126 px/s. A direção só mudava ao iniciar o próximo passo. A espada ainda estava fora da direção do alvo quando os 70 ms de preparação autorizavam o dano. Na rede, a aproximação exponencial ao último snapshot arredondava curvas e não chegava exatamente ao destino.

## Decisão

`ClassicTileWalker` continua sendo a autoridade compartilhada de deslocamento externo no solo e no Node. Consome o tempo restante no mesmo tick, amostra uma nova direção em cada centro e nunca acumula tempo parado. Rotas e perseguição fornecem uma função de direção para poder virar ou parar dentro do tick. O orçamento de A* só avança uma vez; amostras com `dt=0` não adiantam a recarga. Soltar ou inverter o controle preserva o passo comprometido.

A velocidade base continua em 126 px/s, com distância euclidiana para diagonais, modificador do terreno e 72% durante a animação de ataque. O fim da animação divide o tempo de movimento, inclusive quando ocorre dentro do tick. Tempos inválidos não interrompem um passo válido. Morte impede movimento e impacto.

O herói volta a olhar para a direção do passo assim que o ataque termina. Durante um golpe por alvo, solo e Node usam `faceTarget` para orientar a espada para a criatura comprometida. A pose da espada cruza essa direção em `ATTACK_WINDUP`; apresentação não calcula dano. Os pés seguem o deslocamento, inclusive quando o tronco olha para o alvo, e a arma é desenhada atrás do corpo ao olhar para o norte.

Teclas e joystick conservam uma intenção curta até o próximo consumo da simulação ou envio de rede. O servidor conserva uma direção recebida enquanto parado até um tick, mesmo que a liberação chegue no mesmo intervalo. Não há fila ilimitada de comandos; a direção sustentada mais recente prevalece. Limpeza de input e troca de mundo descartam intenções locais pendentes.

## Contrato v3 compatível

Snapshots destinados às sessões `movement=tiles` acrescentam `time`, em segundos de simulação da sala, e `HeroState.stepTarget`, o centro final do passo de cada herói que usa tiles (ou `null` quando parado). Nenhum campo de posição autoritativa é recebido do navegador. Clientes anteriores ignoram os campos extras; sessões contínuas conservam o formato anterior. Não é necessário mudar `PROTOCOL_VERSION`.

O cliente usa `SnapshotTimeline` para apresentar os estados com reserva de 120 ms. A posição segue as duas pernas do caminho quando um snapshot cruza um centro. Posição, passos, direção, preparação da espada e término de efeitos compartilham esse relógio. Snapshots duplicados ou antigos são ignorados. Teleporte/respawn é uma descontinuidade. Sem novo estado, posição para e os temporizadores visuais terminam; não há extrapolação de posição. O buffer é limitado a 32 estados e recupera defasagens de relógio maiores que 400 ms, descartando o histórico antigo. Um intervalo que possa esconder mais de uma curva segura a posição até o próximo estado; um único fim de passo não permite reconstruir essas curvas sem inventar atalhos.

Servidores anteriores sem `time`, inclusive o Go experimental, continuam usando a interpolação anterior. Vida e progressão do próprio jogador continuam vindo imediatamente do estado autoritativo. O atraso de apresentação não altera alcance, dano ou recarga. Reconexão descarta o buffer anterior.

## Verificação e limites

Regressões cobrem 20/30/60/144 Hz, diagonais, terreno, fim do ataque, direção oposta, curvas, liberação, colisão alterada, dano único e entradas inválidas. Testes da apresentação cobrem jitter, pacotes antigos, direção nas curvas, golpe, chegada exata, remoção e respawn. Playwright usa a entrada normal de Jogar, teclado curto, toques simultâneos, rotas contornando a vila e salas WebSocket reais em desktop e Android emulado.

Não há predição local de posição nas salas por tiles: a resposta ainda depende da rede e da reserva visual. Android emulado não substitui avaliação em aparelho físico ou em rede móvel real. A evolução do Go/Rust e publicação em produção seguem fluxos próprios.
