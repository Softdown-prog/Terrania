# ADR 0030 — Runner do GitHub Actions em contêiner na VPS

**Estado:** arquivos entregues em 2026-11-10; **nunca executado numa VPS**. A troca dos fluxos para o runner **não** foi feita.

## Contexto

O PC do dono (Windows, WSL sem distribuição) não serviu de runner: os fluxos assumem Ubuntu com bash e Docker (a tentativa foi revertida). O dono tem uma VPS Ubuntu, onde instalações anteriores de runner falharam, e pediu um runner em contêiner nela, montado a partir do repositório.

## Decisões

1. **O agente não instala na VPS.** O acesso do repositório à VPS é um broker com comando forçado, restrito ao deploy do Terrania, por desenho. Os arquivos ficam em `scripts/runner-vps/` e o dono roda `sudo ./install.sh` **uma vez, dentro da VPS**.
2. **Contêiner em duas partes** (`docker-compose.yml`): o `runner` (imagem oficial `ghcr.io/actions/actions-runner` mais as ferramentas dos fluxos) e um **Docker interno descartável (`dind`)**. O runner **não monta o Docker da VPS**: os jobs não alcançam os contêineres de produção. O runner usa a rede do `dind` (`network_mode: service:dind`) para que os serviços de contêiner dos fluxos (PostgreSQL em `localhost:5432`) funcionem como no GitHub.
3. **Registro por token de uso único** (1 hora), digitado no instalador (não aparece na tela), gravado num `.env` modo 600 fora do Git e **apagado** depois do registro; o contêiner é recriado sem ele. O registro fica num volume, então reiniciar não pede token. Sem PAT guardado.
4. **O instalador existe por causa das falhas anteriores:** `doctor` confere Docker, Compose, arquitetura, memória, disco e acesso a `api.github.com`, `ghcr.io` e `registry.npmjs.org` antes de instalar; o log diz em português o que houve (token vencido, Docker interno fora). Limites por padrão: runner com 2 CPUs e 4 GB (onde rodam os passos dos fluxos) e Docker interno com 1 CPU e 2 GB.
5. **Não trocar os fluxos agora.** O repositório é **público**: um PR de fork pode executar código no runner, na mesma máquina da produção. Primeiro exigir aprovação para PRs de fora; depois mandar para a VPS só eventos do próprio repositório e deixar PRs de fork no GitHub (`runs-on` condicional, em `docs/RUNNER_VPS.md`). Fluxos de deploy ficam no GitHub.

## Verificação

- `tests/runner-vps.test.ts`: o Compose não monta o `docker.sock` da VPS, só o `dind` é `privileged`, nenhuma porta é publicada, há limites de CPU e memória, o runner usa a rede do `dind` e a etiqueta `terrania-vps`, o token nunca vem escrito nos arquivos nem é impresso, o `.env` está no `.gitignore`, a imagem parte da oficial, e os scripts têm `set -euo pipefail`.
- `docker compose config` válido e `bash -n` nos dois scripts; `install.sh doctor` executado numa máquina Linux de teste.

## Limites

- **Nada foi executado numa VPS:** a imagem não foi construída aqui e o runner não foi registrado. O primeiro `install.sh` é o teste de verdade. A tag `latest` da imagem oficial não está fixada.
- O runner e a produção dividem a máquina: um laboratório pesado (1000 conexões, navegador) pode atrapalhar o jogo. O limite de recursos reduz, não elimina.
- O `dind` privilegiado é o maior risco: escape de contêiner dá acesso de root à VPS.
- O runner roda um job por vez; o `pre-main-suite` (7 jobs) fica em fila. Mais runners seriam mais contêineres e mais carga.
