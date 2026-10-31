# Homologação do Terrânia Go via GitHub Actions

O workflow manual `.github/workflows/deploy-go-shadow.yml` publica e verifica **apenas** o servidor Go de testes.

- Node multiplayer: permanece na porta `8787`, atrás da rota pública atual; **não substituí-lo**.
- Go shadow: container `terrania-go-shadow`, porta do host `127.0.0.1:18788` (não pública).
- Rede: `bridge` isolada da rede compartilhada do proxy do painel.
- Imagem GHCR por digest, com SHA GitHub confirmado no `/health`.
- Segurança: 128 MiB RAM, 0,5 vCPU, rootfs read-only, sem privilégios.
- Resultado: artifact `vps-result.json`, logs da Action e checagem da revisão do Node antes/depois.

## Pré-requisito operacional único

O GitHub Actions **não possui shell geral na VPS**. Sua chave SSH alcança um **broker com comando forçado e política instalada em disco**. O broker atual só aceita deploy do servidor Node, e tentar usá-lo para instalar o Go falhará.

A alteração correspondente no repositório `Softdown-prog/Painel` precisa ser revisada e **instalada uma vez pelo Shell administrativo da VPS** antes da primeira Action Go. O script está em `operations/install-shadow-adapter.sh` e preserva a configuração de outros projetos. Exemplo após disponibilizar a revisão aprovada do Painel no host:

```bash
sudo bash operations/install-shadow-adapter.sh "$(pwd)/operations"
```

Esse script não cria nem reinicia containers: apenas instala as funções root-owned do broker e acrescenta o escopo restrito na política existente. Não executar uma revisão não aprovada. Evitar alterar o usuário de SSH ou instalar um shell irrestrito.

## Uso após bootstrap

No GitHub, em **Actions → Terrania Go staging na VPS → Run workflow**, selecione:

- `verify`: somente leitura; verifica engine Go já instalada, revisão e saúde do Node.
- `deploy`: build, CI, publica imagem por digest e instala somente o container Go, com rollback do próprio shadow em caso de falha.

Primeiro execute `verify` (espera-se falha "container missing" se Go ainda não foi instalado). Depois `deploy`, e finalmente `verify`. A operação não altera o DNS, Cloudflare, Caddy ou `VITE_MULTIPLAYER_URL`.

## Critério de conclusão

Só afirmar "implantado" quando a Action tiver `exitCode: 0`, `loopbackVerified: true`, `nodePreserved: true`, `unrelatedContainersPreserved: true` e o health local indicar o SHA completo. GitHub Actions verde sem resposta real da VPS **não comprova deploy**.

Este caminho prepara homologação real, não promove o Go automaticamente a servidor público. Testes Android, WebSocket via Caddy protegido, latência e rollback do Node continuam necessários para a migração definitiva.
