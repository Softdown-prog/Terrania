# Terrania: Origins — multiplayer na VPS (protótipo 0.2)

## Topologia
- Navegadores acessam o front-end estático no Cloudflare Pages por HTTPS.
- Para jogar online, clientes usam WSS na porta 443 com domínio dedicado.
- Caddy na VPS faz reverse_proxy até o container Node/ws do jogo.
- O servidor valida movimento, colisão, dano e entidades; o cliente só desenha e envia direção/ataque.
- Terreno é reproduzível pela mesma seed em cliente e servidor.

## Funcionalidades iniciais
- Uma seed por sala (`?room=origins` ou `?room=amigos`).
- Até 12 jogadores por sala, no máximo 8 salas e 48 conexões em total; valores são limites de segurança iniciais, não benchmark de carga.
- Simulação 20 Hz, snapshots próximos cerca de 10 Hz, payload recebido limitado a 512 bytes, rate limit 35 mensagens/s.
- Validação do header Origin, heartbeat e descarte de conexões com buffer grande.
- Modos offline e online: se backend não existir, cliente continua local.
- Não há login, persistência multiplayer, salvamento no servidor, inventário compartilhado ou anti-cheat completo.

## Instalação no futuro (somente após inspeção da VPS)
Pré-requisitos: Docker Compose, endereço HTTPS com WSS, porta local `8787` livre e backup da configuração atual do Caddy.

Na raiz de checkout do repositório:

`cp server/.env.example server/.env`

Editar o `ALLOWED_ORIGINS` com origem real do Cloudflare Pages; depois executar:

`docker compose --env-file server/.env -f server/compose.yml config`

`docker compose --env-file server/.env -f server/compose.yml up -d --build`

`curl -fsS http://127.0.0.1:8787/health`

O backend é isolado e expõe `127.0.0.1:8787` no host, sem publicar a porta na internet. Orçamento inicial: 256 MiB RAM e 0,5 vCPU, ainda não medidos.

## Caddy no host
Exemplo ilustrativo de bloco adicional, após criar DNS para um domínio realmente controlado:

`rpg.analysepro.com { reverse_proxy 127.0.0.1:8787 }`

Não substituir o Caddyfile global. Validar a configuração, então recarregar de maneira segura.

## Caddy em container — atenção
Em container Docker, `127.0.0.1` aponta para o próprio container Caddy e não para a VPS. É necessário inspecionar a rede atual, unir Caddy e serviço Terrania numa rede Docker controlada e usar reverse_proxy para o nome do serviço/alias apropriado, sem publicar a porta no host quando não necessário.

Não modificar o Caddy existente sem um plano de rollback específico para esse domínio.

## Cloudflare Pages
Adicionar no build:

`VITE_MULTIPLAYER_URL=wss://DOMINIO-REAL/ws`

O `ALLOWED_ORIGINS` do backend aceita o domínio HTTPS da página de jogo, não a URL WSS. Não usar segredos em variáveis `VITE_`.

## Teste local
Terminal 1: `cd server && npm install && npm run dev`

Terminal 2, na raiz: `npm install && VITE_MULTIPLAYER_URL=ws://localhost:8787/ws npm run dev`

Abrir duas abas em `http://localhost:5173/?room=origins`, conferir presença e ataques compartilhados.

## Reversão
`docker compose --env-file server/.env -f server/compose.yml down`

Desfazer apenas o subdomínio do jogo no Caddy e a variável do frontend, se aplicável. Não executar `docker system prune` nem apagar serviços de terceiros.

## Antes da abertura pública
- Autenticação e proteção contra abuso, controle de IP e limites por usuário.
- Banco de dados, backup e recuperação de estado.
- Testes de carga e latência, métricas e alarmes.
- Estratégia de atualização segura e de perda/reconexão de salas.

Nenhuma instalação remota foi realizada por esta documentação.

## Diagnóstico: reinício por módulos ESM/CommonJS

Se o contêiner reiniciar com `does not provide an export named 'CHUNK_PIXELS'`, o build gerou módulos compartilhados como CommonJS enquanto o runtime interpreta os arquivos como ES Modules. O Dockerfile deve copiar o `package.json` da raiz para `/work/package.json` **antes** de executar `tsc`, pois o modo `NodeNext` decide como emitir arquivos TypeScript conforme o `type` do pacote mais próximo.

O build do Docker agora executa uma importação real de `Room.js` e `terrain.js`. O CI inicia a imagem produzida e consulta `/health` para detectar erros que a checagem de tipos não revela.

Para atualizar **somente** o Terrania na VPS:

```bash
cd /root/Terrania
git pull --ff-only origin main
docker compose --env-file server/.env -f server/compose.yml up -d --build multiplayer
docker compose --env-file server/.env -f server/compose.yml ps
curl -fsS http://127.0.0.1:8787/health
```

Não execute `docker system prune` nem reinicie Caddy, Painel ou Softload.
