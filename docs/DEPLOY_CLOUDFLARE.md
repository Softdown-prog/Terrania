# Publicação no Cloudflare Pages

Repositório oficial: https://github.com/Softdown-prog/Terrania

## Configuração
Em Cloudflare → Workers & Pages → Create → Pages → Connect to Git, conectar o repositório Terrania.

| Campo | Valor |
| --- | --- |
| Branch | `main` |
| Framework | Vite |
| Root directory | `/` |
| Build command | `npm run build` |
| Build output | `dist` |
| Node.js | 22 (ver `.node-version`) |

O frontend é estático e funciona offline sem backend. Não precisa de Pages Functions.

## Após disponibilizar WebSocket na VPS
Definir uma variável de build **pública** no Cloudflare Pages:

`VITE_MULTIPLAYER_URL=wss://SEU-SUBDOMINIO-REAL/ws`

Substituir o exemplo pelo domínio real. A variável é incorporada no bundle JavaScript: **jamais colocar senha ou token privado nela**.

No servidor, `ALLOWED_ORIGINS` deve listar a origem HTTPS exata do site (por exemplo, seu domínio Pages e eventual domínio próprio), não o endereço WSS do backend.

## Testes
- Abrir site com `?room=origins` em dois dispositivos.
- Verificar carregamento, movimento, combate e jogadores remotos.
- Verificar controles touch, save e opção Novo mundo offline.
- Desligar o backend de teste para conferir fallback local.

Documentação oficial: https://developers.cloudflare.com/pages/configuration/build-configuration/
