# RPG-001/002 — experiência e níveis

## Solo
Cada monstro derrotado pela simulação local concede a XP do seu catálogo (Slime: 10; Lobo: 20; Aranha: 15), mesmo sem recolher o drop. Não há XP duplicado pelo mesmo ID.

O nível 1 começa com 100 HP máximo. Cada nível acrescenta 10 HP máximo e 10 HP atual, respeitando o limite. XP cumulativo para atingir nível L: `30 * L * (L - 1) / 2`; nível 2 = 30 XP, nível 3 = 90 XP, teto de nível 50 (36.750 XP, 590 HP).

Saves locais antigos iniciam com XP 0, mesmo se possuírem kills anteriores. Morte mantém XP e nível; gerar outro mundo zera a progressão solo.

## Online (Go autoritativo)
O servidor Go calcula o crédito de cada abate e chama a progressão **uma única vez** após confirmar a morte da criatura. Também separa a missão da Aela (somente Slimes) da contagem total de monstros. A vida cresce +10 ao ganhar nível e a morte restaura HP máximo correspondente ao XP mantido.

As mensagens de estado do WebSocket v3 do servidor Go incluem `experience`, `level`, `maxHp` e `slimeKills`. O cliente nunca envia esses campos: sua entrada continua limitada a movimento e ataque, e o HUD Angular só apresenta XP online quando os números são coerentes. Um servidor Node legado omite os campos e mantém o rótulo `AVENTUREIRO` sem simular progresso.

**Persistência limitada:** XP e SlimeKills integram o checkpoint validado de uma sala e sobrevivem à restauração desse checkpoint **com o mesmo ID de sessão**. A conexão WebSocket gera um ID aleatório novo. Sair/desconectar e entrar novamente **não recupera personagem, XP ou inventário**: não existe conta/login nem identidade durável nessa fase. Nunca recuperar progressão por nome, sala, IP ou dados enviados pelo navegador.

A aventura solo continua em `localStorage` independente da sala online; o XP online não modifica esse save. Não há XP ou itens online persistidos em banco de dados. Mana, classes, habilidades, autenticação de personagem e recuperação entre sessões ainda são etapas futuras.

### Verificação
- `npm run typecheck`, `npm test`, `npm run build`;
- `npm run test:browser` (desktop/Android; WebSocket v3 Go e Node legado);
- `cd server-go && go test -race ./...`, `go vet ./...`;
- suite 6/6 pré-main, Rust, cluster regional e QA-BOT.
