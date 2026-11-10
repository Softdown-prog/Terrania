# Runner do GitHub Actions na VPS

O runner roda **em contêiner na VPS Ubuntu** (decisão e riscos: [ADR 0030](adr/0030-runner-na-vps.md)). Os arquivos estão em `scripts/runner-vps/`.

> **Eu (o agente) não consigo instalar isto sozinho.** O acesso do repositório à VPS é de propósito restrito ao deploy do Terrania (chave com comando forçado, sem shell livre). Quem instala é você, uma vez, **dentro da VPS**, com os comandos abaixo.

## Instalar (na VPS, 5 minutos)

1. **Pegue um token de registro** (vale 1 hora, uso único): no GitHub, `Settings > Actions > Runners > New self-hosted runner > Linux`. Copie só o valor que vem depois de `--token` na linha do `./config.sh`.
2. **Entre na VPS por SSH** e rode:

```bash
git clone https://github.com/Softdown-prog/Terrania.git
cd Terrania/scripts/runner-vps
sudo ./install.sh doctor      # confere a VPS (não muda nada)
sudo ./install.sh             # instala; pede o token (ele não aparece na tela)
```

O instalador constrói a imagem, sobe o runner e o Docker interno, espera o runner dizer `Listening for Jobs`, **apaga o token** e recria o contêiner sem ele. Em `Settings > Actions > Runners` deve aparecer **terrania-vps — Idle**.

Se algo der errado: `sudo ./install.sh doctor` mostra o que falta (Docker, memória, disco, acesso a github.com e ghcr.io) e `sudo ./install.sh logs` mostra o log. A causa mais comum é o **token vencido** (1 hora): gere outro e rode de novo.

Outros comandos: `status`, `logs`, `remove` (para e apaga tudo; depois remova o runner no GitHub).

## Como é isolado

- O runner **não recebe o Docker da VPS** (não monta `/var/run/docker.sock`). Ele usa um Docker próprio, o `dind`, então os jobs **não enxergam nem tocam** nos contêineres de produção (Terrania, Painel, Caddy, PostgreSQL).
- Limites de uso: o runner (onde rodam npm, testes e navegador) tem 2 CPUs e 4 GB, e o Docker interno 1 CPU e 2 GB (`RUNNER_CPUS`, `RUNNER_MEMORY`, `DIND_CPUS` e `DIND_MEMORY` em `.env`). A produção divide a VPS com a CI: não aumente sem olhar a carga.
- O `dind` precisa rodar `privileged` (é da natureza dele). **É o ponto de maior risco**: um job malicioso que escape do contêiner teria o poder do root da VPS.

## Antes de usar (importante: o repositório é PÚBLICO)

**Não troque os fluxos para o runner ainda.** Em repositório público, um PR de fora (fork) pode executar código arbitrário no runner, e este runner está na mesma máquina da produção. Faça nesta ordem:

1. `Settings > Actions > General > Fork pull request workflows from outside collaborators` = **Require approval for all outside collaborators**.
2. Confirme que o runner aparece **Idle** e rode um job de teste (por exemplo `workflow_dispatch` do `ci`).
3. Troque os fluxos mandando **só eventos de confiança** para a VPS e PRs de fork para o GitHub:

```yaml
runs-on: ${{ (github.event_name == 'pull_request' && github.event.pull_request.head.repo.full_name != github.repository) && 'ubuntu-24.04' || fromJSON('["self-hosted","terrania-vps"]') }}
```

4. Os fluxos de **deploy** ficam no GitHub: eles usam segredos e já têm a ponte própria com a VPS.

## O que NÃO foi testado

Nada disto foi executado numa VPS: foram validados só a sintaxe do Compose (`docker compose config`), a do shell (`bash -n`) e o `doctor` numa máquina Linux de teste. A imagem **não foi construída** nem o runner registrado. O primeiro `install.sh` é o teste de verdade; mande o log se falhar.
