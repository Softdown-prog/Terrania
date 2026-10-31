# Continuidade — Angular + Phaser 3

## Onde continuar

- Repositório: `Softdown-prog/Terrania`.
- Branch de trabalho: **`feat/angular-ui-phaser3`**.
- Base inicial da main: `da610eb57af81867abbcccef2087992fea1e78a8`.
- Pedido do Rodrigo: continuar nesta branch, sem commits na main, PR, merge ou deploy. Quando a migração e as validações estiverem completas, a decisão sobre PR/mesclagem será dele. Um pedido genérico de continuar não autoriza essas ações.

## Implementado

- Site e interface do jogo em Angular 22.2.4, componentes standalone, sinais, rotas e AOT.
- Migração de início, mundo, guia, novidades, comunidade, privacidade, termos e 404; navegação mobile, convites de sala, títulos/descrições e links legados com seed/room.
- HUD, ajustes, zoom, efeitos, ajuda, fullscreen, bolsa/poções, conversas e confirmação de mundo via bindings Angular. O contador no jogo tem apresentação compacta para preservar a área de gameplay, e a vida não quebra entre linhas no celular.
- Phaser **3.90.0** no jogo real. A Scene controla atualização, renderização, resize e ciclo de vida. `/laboratorio-phaser/` redireciona para `/jogar/`; o laboratório Phaser 4 foi removido.
- Arte procedural preservada: os desenhistas Canvas alimentam uma CanvasTexture exibida pelo Phaser. Não foram reescritos como sprites, nem foi trocada a física por Arcade. As regras continuam independentes de Angular/Phaser e compatíveis com os backends.
- Desmontagem da rota libera Phaser, controles, listeners, observadores, WebSocket e timer de reconexão, preservando o save solo.
- `GET /presence` no Node e no worker Go; no gateway Go, soma dos registros reais dos workers, sem usar reservas do lobby. Falha em um worker torna o total indisponível.
- Painel online no início, comunidade e jogo: atualização a cada 5 segundos; consulta suspensa em aba oculta; timestamp, salas e tratamento de resposta inválida/desatualizada/falha. Zero aparece apenas quando o backend informa zero.
- Sem contas atualmente, cada conexão é uma sessão: duas abas de jogo contam duas conexões; visitantes e modo solo não contam.

## Configuração estrita

| Opção | Local | Valor |
| --- | --- | --- |
| `strict` | compilerOptions, frontend e Node | true |
| `noImplicitOverride` | compilerOptions, frontend e Node | true |
| `noUncheckedIndexedAccess` | compilerOptions, frontend e Node | true |
| `exactOptionalPropertyTypes` | compilerOptions, frontend e Node | true |
| `strictTemplates` | angularCompilerOptions, frontend | true |
| `strictInjectionParameters` | angularCompilerOptions, frontend | true |

Frontend usa TypeScript **6.0.3**, exigido pela faixa de compatibilidade do Angular 22 (`>=6.0 <6.1`). O servidor Node mantém TypeScript **7.0.2**. Não usar `disableTypeScriptVersionCheck` nem `--legacy-peer-deps`. Node 24 LTS é recomendado.

## Executar e verificar

```bash
git switch feat/angular-ui-phaser3
npm ci
npm ci --prefix server
npm run typecheck
npm test
npm run build
npm run typecheck --prefix server
npm test --prefix server
npm run build --prefix server
npx playwright install chromium
npm run test:browser
```

Para Go, dentro de `server-go`: `go test -race -count=1 ./...`, `go vet ./...`, `go build ./cmd/terrania` e `go build ./cmd/gateway`.

`npm run dev` abre em `http://127.0.0.1:5173`. Pode configurar `.env.local`, `.env` ou variáveis do processo:

```bash
VITE_MULTIPLAYER_URL=ws://127.0.0.1:8787/ws npm run dev
```

O Node local aceita essa origem por padrão. Em produção, preservar `VITE_MULTIPLAYER_URL=wss://api-rpg.analysepro.com/ws`. `VITE_PRESENCE_URL` é opcional; por padrão o cliente deriva HTTPS `/presence` da URL WebSocket. O Caddy precisa encaminhar esse GET ao mesmo backend/gateway. Não usar segredos nessas variáveis públicas.

O build emite `dist/` com dez entradas HTML, incluindo 404 e o antigo laboratório. Conteúdo das páginas é renderizado no cliente por Angular; não foi adicionado SSR/prerender.

## Evidência desta sessão

- 55 testes Node de regras, saves, navegação e protocolo de presença: passaram.
- 4 testes do backend Node, incluindo dois WebSockets reais e presença 0/2/1/0, CORS e cache: passaram.
- 6 cenários Playwright em Chromium, desktop e emulação Pixel 5: passaram (rotas, interface, ciclo Phaser e contagem real 2→1→0, falha e recuperação).
- Compilação estrita Angular, build de produção e verificador local de rotas/assets: passaram.
- Testes Go com detector de corrida e `go vet`: passaram; worker/gateway compilam.
- Build inicial do site: cerca de 265 kB brutos; Phaser/jogo em chunk separado, carregado apenas ao jogar. Não foi medido ganho de FPS.

## Verificações externas restantes

- A revisão automática bloqueou `wrangler deploy --dry-run` por possível envio de configuração ao Cloudflare. Não repetir sem autorização apropriada; a compilação/verificação local do pacote passou. Nenhuma publicação foi solicitada. O passo Wrangler do CI fica restrito à main; os checks desta branch não executam esse contato externo.
- Docker não está disponível neste ambiente local. O CI Go da revisão `1d68dcb` passou no GitHub, incluindo detector de corrida, 1.000 conexões reais, paridade TypeScript/Go, imagens e saúde dos containers, sem acessar a VPS.
- O primeiro CI frontend passou tipos/testes/build e parou ao instalar o Playwright no novo Ubuntu 26.04 de `ubuntu-latest`. O runner foi fixado em Ubuntu 24.04, suportado pelo instalador, e precisa concluir no novo head da branch.
- QA em Android físico e homologação do endpoint público `/presence` dependem de revisão/ambiente posterior. Emulação não deve ser apresentada como teste no celular do Rodrigo.

Antes de criar PR ou fazer merge, conferir o head desta branch, os checks reais e a decisão explícita do usuário. Não afirmar ausência absoluta de bugs com base somente em testes automatizados.
