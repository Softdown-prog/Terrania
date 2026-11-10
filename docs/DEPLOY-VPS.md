# Servidor: GitHub → VPS com revisão comprovada

> **2026-11-08:** o modo multiplayer foi retirado ([ADR 0012](adr/0012-retirada-do-multiplayer.md)). O container continua se chamando `terrania-multiplayer` (nome histórico da configuração da VPS), mas só atende HTTP. A verificação pós-deploy deixou de testar "dois clientes WSS" e passou a validar saúde com a revisão esperada, presença e o sinal anônimo (`server/scripts/public-smoke.mjs`).


Antes do deploy por digest existia CI Docker, mas nenhum workflow que instalasse a API HTTP na VPS. O checkout do host estava em `d69dbd9...`; a imagem local não tinha SHA OCI. O frontend Worker Cloudflare é uma publicação separada.

`.github/workflows/deploy-vps.yml` testa frontend/servidor, compila a imagem em runner GitHub e a publica no GHCR. O executor central do Painel recebe por SSH privado uma solicitação com identidade OIDC, repositório/ator/workflow/main autorizados e digest imutável. A VPS só atualiza `terrania-origins-multiplayer-1`, com as redes, limites, origens e ambiente existentes. Não modifica Softload, Painel, Caddy, PostgreSQL ou DNS.

O deploy confirma label OCI SHA, saúde Docker e `/health` HTTPS com a mesma revisão. Depois verifica o frontend, a presença anônima via HTTP e a recusa de upgrade WebSocket (o jogo é solo). Em falha de ativação/saúde/SHA, o executor restaura a configuração anterior desse projeto. Imagem anterior e Compose são preservados; não há prune. `/health?revision=...` aceita parâmetro de cache, mas a revisão vem de `GIT_SHA` interno validado, não da URL do cliente.

O resultado JSON fica nos artifacts e resumo do Actions. Secrets exclusivos: `VPS_OPERATIONS_SSH_KEY` (forced-command, sem shell livre) e `VPS_OPERATIONS_KNOWN_HOSTS`. GHCR usa token efêmero do próprio job. O código do cliente central é fixado por SHA, e o broker é root-owned e instalado separadamente na VPS. PR não recebe esse acesso.

**PostgreSQL (ADR 0011):** publicação também depende do workflow reutilizável
`postgres-market.yml`, com PostgreSQL 18 descartável e testes de transação,
concorrência e permissões. O broker preserva o Compose efetivo instalado: rede
privada e montagem do arquivo de senha devem entrar nesse Compose, sem editar
somente o exemplo do repositório. A migração é uma operação separada com usuário
dedicado; o HTTP tem acesso somente ao catálogo e versão. Backups e instalação
real precisam de validação própria; conferir [operação](../server/db/README.md).

Não declarar instalado porque o CI passou: registrar run, commit, digest, saúde e resposta HTTPS depois da publicação real. O workflow Worker tem suas próprias credenciais Cloudflare; sucesso deste backend não comprova atualização do site estático.

## Diagnóstico de SSH do deploy (2026-11-10)

A execução [#42813411962](https://github.com/Softdown-prog/Terrania/actions/runs/42813411962) aprovou testes, PostgreSQL e publicação de imagem no GHCR, mas falhou na chamada do executor central (`SSH transport failed`, código 255). O log antigo **não diferencia** chave, autenticação e indisponibilidade do host; não concluir que a VPS caiu ou que o segredo mudou sem verificar.

O workflow passa a fixar o cliente de operações da revisão [Painel 8af962c](https://github.com/Softdown-prog/Painel/commit/8af962c48ea0347b9db3ea6c8598b39b60b68640), com `transportCategory`, `diagnosticHint` e número de tentativas no artefato `vps-result.json`. O cliente **não divulga stderr SSH, material de chave, destino, payload OIDC ou token de registry**. O código da revisão precisa ser validado/mesclado no Painel antes do merge deste workflow.

| Categoria pública | Ação corretiva na VPS / GitHub |
| --- | --- |
| `missing_ssh_configuration` | Conferir existência dos secrets `VPS_OPERATIONS_SSH_KEY` e `VPS_OPERATIONS_KNOWN_HOSTS` no repositório, sem imprimir valores |
| `host_key_verification_failed` | Conferir a chave pública genuína do host e a entrada de `known_hosts` por canal confiável; não desligar validação do host |
| `authentication_failed` / `invalid_private_key` | Conferir formato da chave privada e `authorized_keys` da conta `vpsops`, permissões e restrições `forced-command` |
| `connection_refused` / `connection_timed_out` / `network_unreachable` | Conferir serviço SSH, porta 22, firewall, conectividade externa e políticas de bloqueio |
| `connection_closed` | Conferir `sshd`, Fail2ban e limites de conexões |
| `invalid_executor_response` / `unknown_transport_error` | Investigar o serviço `operations-v1` e os logs de SSH diretamente na VPS, sem exportar stderr para Actions |

Para diagnosticar **na própria VPS**, sem executar um deploy:

```bash
sudo systemctl status ssh --no-pager
sudo ss -lntp | grep ':22'
sudo journalctl -u ssh --since '15 minutes ago' --no-pager
sudo ufw status
```

Se a VPS usar outra porta, adapte apenas a inspeção da porta. Não copie logs brutos, chaves ou tokens para artifacts públicos. Uma falha SSH **não certifica** que houve implantação nem autoriza reexecutar manualmente sem checar a revisão já instalada; a proteção por recibo idempotente continua valendo.
