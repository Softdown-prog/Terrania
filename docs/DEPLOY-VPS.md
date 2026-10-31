# Multiplayer: GitHub → VPS com revisão comprovada

Antes desta mudança existia CI Docker, mas nenhum workflow que instalasse o multiplayer na VPS. O checkout do host estava em `d69dbd9...`; a imagem local não tinha SHA OCI. O frontend Worker Cloudflare é uma publicação separada.

`.github/workflows/deploy-vps.yml` testa frontend/servidor, compila a imagem em runner GitHub e a publica no GHCR. O executor central do Painel recebe por SSH privado uma solicitação com identidade OIDC, repositório/ator/workflow/main autorizados e digest imutável. A VPS só atualiza `terrania-origins-multiplayer-1`, com as redes, limites, origens e ambiente existentes. Não modifica Softload, Painel, Caddy, PostgreSQL ou DNS.

O deploy confirma label OCI SHA, saúde Docker e `/health` HTTPS com a mesma revisão. Depois testa dois clientes WSS. Em falha de ativação/saúde/SHA, o executor restaura a configuração anterior desse projeto. Imagem anterior e Compose são preservados; não há prune. `/health?revision=...` aceita parâmetro de cache, mas a revisão vem de `GIT_SHA` interno validado, não da URL do cliente.

O resultado JSON fica nos artifacts e resumo do Actions. Secrets exclusivos: `VPS_OPERATIONS_SSH_KEY` (forced-command, sem shell livre) e `VPS_OPERATIONS_KNOWN_HOSTS`. GHCR usa token efêmero do próprio job. O código do cliente central é fixado por SHA, e o broker é root-owned e instalado separadamente na VPS. PR não recebe esse acesso.

Não declarar instalado porque o CI passou: registrar run, commit, digest, saúde e resposta HTTPS depois da publicação real. O workflow Worker tem suas próprias credenciais Cloudflare; sucesso deste backend não comprova atualização do site estático.
