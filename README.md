# Terrania: Origins

RPG **2D top-down e procedural** para navegador, desenhado em **HTML5 + TypeScript + Canvas 2D** sem PNG, spritesheets ou React. Inspirado em ideias de mundo/RPG do antigo Terranium (`Softdown-prog/2d2`), sem transportar o motor C++/SDL3.

## Versão 0.3 — site, mundo e movimento

A raiz agora é o site de apresentação. **Jogar** abre `/jogar/`, com tela dedicada, ajuda, câmera ajustável e controles móveis. Mundo, guia, novidades e comunidade têm páginas próprias. Veja [site e alfa 0.3](docs/SITE_E_ALFA_03.md).

O cenário ganhou vegetação com profundidade, texturas, margens de água e marcos na clareira. O herói ganhou animação direcional, aceleração/frenagem e combate com preparo, recuo e efeitos. A câmera tem antecipação, zoom e opção de movimento reduzido.

### Primeira personagem não jogável

**Aela, guardiã da clareira**, está perto do ponto inicial e oferece pistas sobre a missão dos cinco slimes. Aproxime-se e pressione **E** ou toque em **Conversar**. As falas mudam conforme os slimes derrotados, sem mudar o protocolo ou o estado autoritativo da VPS. É o primeiro passo dos NPCs do mundo — ainda não concede recompensas.

### Multiplayer experimental

**Front-end no Cloudflare Pages; servidor WebSocket Node.js na VPS.** A mesma seed produz o mapa no cliente e orienta colisões no servidor. O servidor controla posições, vida, monstros, ataques e progresso da missão de cinco slimes. O navegador só envia movimento/ataque e desenha os personagens.

- Jogadores anônimos em salas (`?room=origins` ou `?room=amigos`), com outros heróis visíveis pelo nome.
- Slimes compartilhados e combate calculado no servidor; 20 ticks/s e cerca de 10 snapshots/s para entidades próximas.
- Chunks 16×16 tiles, cache visual até 24 chunks por cliente, câmera que desenha só a área visível.
- Se o backend não estiver configurado, o jogo funciona **offline**, com save local; ao cair a conexão, retorna ao modo local.
- Teclado WASD/setas ou joystick mobile; Espaço/J ou botão da espada para atacar.

**O multiplayer é um primeiro protótipo:** salas e personagens são descartados quando todos saem. Ainda não há contas, inventário sincronizado, banco de dados, chat, missões persistentes, sistema antifraude completo ou suporte comprovado a muitos jogadores simultâneos.

## Executar localmente

Node.js 22+ recomendado.

**Somente navegador (offline):**

```bash
npm ci
npm run dev
```

**Multiplayer, em dois terminais:**

```bash
# terminal 1, servidor
cd server && npm ci && npm run dev

# terminal 2, na raiz do projeto
VITE_MULTIPLAYER_URL=ws://localhost:8787/ws npm run dev
```

Abrir duas abas em `http://localhost:5173/jogar/?room=origins`. O servidor aceita a origem `http://localhost:5173` para desenvolvimento.

## Verificações

```bash
npm run typecheck
npm test
npm run build
cd server
npm run typecheck
npm test
npm run build
```

Os `npm ci` devem ser feitos antes. O build da interface produz `dist/`. `server/Dockerfile` prepara apenas a API multiplayer, sem navegador e sem Chrome/Chromium.

## Produção

- **Cloudflare Pages:** Vite, `npm run build`, pasta `dist`, variável `VITE_MULTIPLAYER_URL=wss://DOMINIO-REAL/ws`.
- **VPS:** Docker Compose isolado (`server/compose.yml`) com orçamento inicial de 256 MiB e 0,5 CPU, com `ALLOWED_ORIGINS` restrito à origem HTTPS real.
- **Caddy:** TLS/WSS na frente do backend. Se o Caddy é um contêiner, configure a rede compartilhada: `localhost` dentro dele não aponta para a VPS.

**Leia antes de instalar:** [`docs/MULTIPLAYER_VPS.md`](docs/MULTIPLAYER_VPS.md). Não há deploy remoto automático nem modificação de serviços existentes nesta entrega.

## Escopo e repositório

Repositório oficial: [`Softdown-prog/Terrania`](https://github.com/Softdown-prog/Terrania). O repositório do Terranium original (`Softdown-prog/2d2`) permanece separado. A disponibilidade do backend depende da configuração externa; esta alteração não instala nem atualiza serviços na VPS. Veja os documentos em `docs/` e o roteiro em `docs/ROADMAP.md`.
## Motor e interface separados

`src/main.ts` só inicializa a aplicação. O motor local em `src/engine/OfflineSimulation.ts` não depende de DOM, Canvas, armazenamento nem WebSocket; o controlador `src/game/Game.ts` integra motor, renderizador, HUD e rede. A simulação autoritativa online fica em `server/src/Room.ts` e compartilha atores, colisão e protocolo.

**Cloudflare Pages não precisa de Dockerfile:** build `npm run build`, saída `dist`. A VPS usa o Dockerfile existente em `server/Dockerfile`. Consulte [arquitetura](docs/ARQUITETURA.md) e [custos/deploy](docs/ESTRUTURA_E_CUSTOS.md).

**Compatibilidade da alfa 0.3:** publique também o backend desta revisão; o protocolo 2 impede misturar o cliente novo com as regras físicas antigas. Sem backend compatível, o solo permanece utilizável. O save local existente é mantido.
