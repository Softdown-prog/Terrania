# Deploy e custos de armazenamento — Terrania: Origins

## Cloudflare Pages
Frontend HTML5/TypeScript/Canvas 2D: repositório `Softdown-prog/Terrania`, branch `main`, root `/`, build `npm run build`, saída `dist`. **Não precisa de Dockerfile.** O build roda na plataforma da Cloudflare e só arquivos estáticos vão para o site.

## VPS
Backend multiplayer: usar `server/Dockerfile` e `server/compose.yml`. O Dockerfile já usa `node:22-alpine` em duas etapas, instala ferramentas de compilação só no builder e remove `devDependencies` do runtime. O Compose limita inicialmente memória em 256 MiB, CPU em 0,5 vCPU e liga a porta 8787 apenas no localhost do host.

## Bibliotecas e espaço
- Frontend: `typescript` e `vite` **apenas durante a compilação**; zero bibliotecas runtime como React, Phaser, Three.js ou Chromium.
- Backend: `ws` para WebSocket em produção e os módulos nativos HTTP e crypto do Node.js.
- Build do backend: `typescript`, `@types/node`, `@types/ws`, retirados do estágio de execução.
- **Estimativa de imagem final Docker na VPS:** ~150–250 MB descompactados. A base Node 22 Alpine é ~59 MB compactados para download; o código do Terrania é menor que 1 MB.
- **Cache/estágios de build:** reservar ~300–700 MB adicionais, que podem permanecer como cache recuperável. Logs, volumes e futuros bancos de dados são variáveis.
- Estes números **não foram medidos na VPS**. Camadas compartilhadas não devem ser contabilizadas duas vezes. Os limites de memória/CPU também não são resultados de benchmark.

## Conferência após implantar
```bash
docker image ls --format 'table {{.Repository}}:{{.Tag}}\t{{.Size}}'
docker system df -v
docker stats --no-stream
```

Não executar `docker system prune` sem avaliar imagens de rollback dos outros serviços da VPS.

## Rede e deploy seguro
O servidor permanece atrás do Caddy: publicar TLS/WSS com domínio próprio, restringir `ALLOWED_ORIGINS` à origem exata do site Pages, e configurar `VITE_MULTIPLAYER_URL=wss://HOST-REAL/ws` no ambiente de build do Pages. `VITE_` fica público no bundle. Verificar rede Docker Caddy, porta livre, backups e rollback antes de implantar. O backend ainda não foi implantado na VPS.
