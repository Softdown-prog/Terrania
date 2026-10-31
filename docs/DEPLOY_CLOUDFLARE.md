# Publicação no Cloudflare Workers

Repositório oficial: https://github.com/Softdown-prog/Terrania

## Configuração
O domínio `rpg.analysepro.com` está associado ao Worker estático `terrania`,
e não a um projeto Pages. `wrangler.jsonc` publica os assets de `dist` nesse Worker.

| Campo | Valor |
| --- | --- |
| Branch | `main` |
| Framework | Vite |
| Root directory | `/` |
| Build command | `npm run build` |
| Build output | `dist` |
| Node.js | 22 (ver `.node-version`) |

O frontend é estático e funciona offline sem backend. Não precisa de Functions.
As rotas existentes são preservadas: `workers_dev: false`, sem `route`/`routes`.
Variáveis existentes são preservadas com `keep_vars: true`.

## Após disponibilizar WebSocket na VPS
Definir uma variável de build **pública** no GitHub Actions:

`VITE_MULTIPLAYER_URL=wss://SEU-SUBDOMINIO-REAL/ws`

Substituir o exemplo pelo domínio real. A variável é incorporada no bundle JavaScript: **jamais colocar senha ou token privado nela**.

No servidor, `ALLOWED_ORIGINS` deve listar a origem HTTPS exata do site (por exemplo, seu domínio Pages e eventual domínio próprio), não o endereço WSS do backend.

## Testes
- Abrir `/jogar/?room=origins` em dois dispositivos.
- Verificar páginas do site na raiz e o botão Jogar apontando para `/jogar/`.
- Verificar carregamento, movimento, combate e jogadores remotos.
- Verificar controles touch, save e opção Novo mundo offline.
- Desligar o backend de teste para conferir fallback local.

Documentação oficial: https://developers.cloudflare.com/pages/configuration/build-configuration/

## Alfa 0.3

O build gera nove HTMLs, incluindo `/jogar/index.html` e `/404.html`. O comando continua `npm run build`, com saída `dist`. `scripts/verify-build.mjs` falha se uma página, asset, âncora ou link interno estiver faltando.

Atualize também o servidor da VPS para o protocolo 2 antes de validar o online da nova física. Um backend antigo mantém o novo cliente em modo solo com aviso explícito. Consulte [site e alfa 0.3](SITE_E_ALFA_03.md).

## Publicação automática (a partir da correção de deploy)
A CI de `.github/workflows/ci.yml` executa apenas verificações. O workflow
`.github/workflows/deploy-pages.yml` (nome de arquivo histórico) publica alterações
na `main` no Worker. Também pode ser executado manualmente via Actions.
Tipos, testes, build e empacotamento são validados antes do upload.

**Configurar em Settings → Secrets and variables → Actions do repositório Terrania:**
- Secret `CLOUDFLARE_ACCOUNT_ID`: ID de 32 caracteres da conta Cloudflare.
- Secret `CLOUDFLARE_API_TOKEN`: token persistente com Workers Scripts Read/Edit na conta correta. Um token apenas de DNS ou Pages não é suficiente. Não copiar tokens OAuth temporários do CLI para o GitHub.

O deploy **falha antes de publicar** se não conseguir confirmar pela API que
`rpg.analysepro.com` pertence ao Worker configurado em produção. Não cria Pages,
não altera DNS e não publica em um projeto de outro site.

A variável pública `TERRANIA_MULTIPLAYER_URL` é opcional. O padrão é `wss://api-rpg.analysepro.com/ws`, endereço de multiplayer verificado no script de smoke. Se o endpoint mudar, atualize essa variável antes de publicar.

Após o upload, o workflow verifica `release.json` com o SHA esperado, a página
inicial, o guia e os arquivos CSS no domínio público, incluindo a paleta
`#0b0812`/`#b986ff`. Uma versão antiga com as mesmas cores não é aceita.
O deploy não acessa ou reinicia a VPS.
