# Integração inicial de Phaser 4 no Terrânia

## Estado desta entrega
- **Phaser 4.2.1** instalado em `dependencies`, com `package-lock.json` e checksums `sha512` para `phaser` e `eventemitter3`.
- **Jogo principal:** `/jogar/` continua executando `src/main.ts`, `Game.ts` e `CanvasScene.ts`, sem importar Phaser. Não trocar física, colisão, controles Android, WebSocket ou saves nesta etapa.
- **Laboratório isolado:** `/laboratorio-phaser/` compila como entrada Vite independente e só baixa Phaser quando essa rota é aberta.
- **Arte procedural preservada:** árvores, chão e gemas são desenhados em Canvas 2D por código; o herói utiliza **o mesmo `renderHero` do jogo**. Os canvases são convertidos em texturas na memória pelo `textures.addCanvas`; não se baixa sprite externo.
- **Experimento Android:** tocar/clicar desloca o herói na cena, com câmera seguindo e marcador de FPS. Ainda não reutiliza a simulação real, A*, colisões nem o mundo por chunks. Trata-se de um **teste de renderização**, não de uma migração concluída.

## Como verificar

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run dev
```

Abra `http://localhost:5173/laboratorio-phaser/` para testar Phaser e `http://localhost:5173/jogar/?modo=solo` para confirmar que o RPG continua normal.

No Android Chrome, verificar: toque, rolagem da página desativada apenas na área da cena, mudança retrato/paisagem, desempenho, WebGL/Canvas fallback, memória e retorno ao jogo original. Comparar FPS e consumo com `/jogar/`; renderizadores distintos sem comparação com mesmo conteúdo não demonstram ganho de desempenho.

O build gera `dist/laboratorio-phaser/index.html`; Cloudflare Workers com Assets publica estes arquivos estáticos da mesma forma que as demais páginas. **Nenhuma alteração de backend, Workers routes, segredo Cloudflare ou VPS é necessária para o laboratório.** A publicação via GitHub Actions continua dependendo do secret `CLOUDFLARE_API_TOKEN`; CI de build não significa deploy confirmado.

## Próximos passos (em PRs pequenos)
1. Comparação objetiva de FPS, memória e bateria no Android contra o Canvas 2D atual com cenas equivalentes.
2. Adaptador de renderização (motor `OfflineSimulation` sem dependência Phaser), preservando separação motor/GUI.
3. Testar cache de texturas procedurais, camera e input, depois inimigos, interiores e efeitos.
4. Só ativar Phaser em `/jogar/` após QA local/online e rollback funcional.

## Reversão
Remover a entrada `laboratorio-phaser` de `vite.config.mjs`, remover sua pasta e o módulo `src/phaser-lab`, depois remover `phaser` via npm. O RPG original não precisa de mudanças para reverter.
