# ADR 0030 — Fluxos de validação no runner próprio (`self-hosted`)

**Estado:** proposto em 2026-11-10, em PR (não direto na `main`), a pedido do dono, que usa o PC dele como runner principal do GitHub Actions.

## Decisão

Os 11 fluxos de **validação e laboratório** passam de `runs-on: ubuntu-24.04` (ou `ubuntu-latest`) para `runs-on: self-hosted`: `ci`, `pre-main-suite` (7 jobs), `cave-art-contract`, `go-engine`, `postgres-market`, `region-cluster` (2), `rust-spatial`, `qa-bot`, `public-smoke` (2), `capacity-lab` e `autoscale-lab`. Só a linha do runner mudou.

**Ficaram de fora, de propósito:** `deploy-pages`, `deploy-vps` e `deploy-go-shadow`. Eles publicam e usam segredos (SSH da VPS); rodá-los no PC pessoal é uma decisão separada, que pede aprovação explícita (AGENTS.md). Seguem em `ubuntu-24.04`.

## Por que em PR

Esta mudança **não se verifica localmente**: o único teste é o próprio runner executar os fluxos. Como o PR roda os fluxos da versão do PR, os checks dele mostram se o PC dá conta antes de a `main` passar a depender disso.

## O que o PC precisa ter (os fluxos assumem o Ubuntu 24.04 do GitHub)

- **Linux** (ou WSL2) com `bash`: os passos `run:` são shell POSIX, e o `postgres-market` usa `services: postgres:18`, que **só funciona em runner Linux com Docker**. Em Windows nativo ou macOS vários jobs vão falhar.
- Node 22, Go, Rust, Docker e o Chromium do Playwright (o instalador do Playwright exige um Ubuntu suportado, por isso o runner do GitHub tinha sido fixado em 24.04).
- Espaço em disco e um runner por vez: **o runner padrão executa um job de cada vez**, então os 7 jobs do `pre-main-suite` (que no GitHub rodam em paralelo) ficam em fila, e uma validação completa leva a soma deles. Rodar mais de um runner no mesmo PC ou ajustar a concorrência acelera.

## Riscos

- **PC desligado = nada roda:** os jobs ficam na fila sem fim (o GitHub não troca de runner sozinho). Isso vale também para a CI dos PRs do Codex.
- **Segurança:** um runner próprio executa o código de cada PR **na máquina do dono**. Em repositório público, PR de fork pode rodar código arbitrário no PC. Só use com repositório privado ou com a opção "exigir aprovação para PR de fora" ligada.
- Os fluxos de laboratório de carga (`capacity-lab`, `autoscale-lab`) são pesados e disputam a máquina com o uso normal do PC.

## Como voltar atrás

Reverter este PR (ou trocar as linhas de volta para `ubuntu-24.04`). Como alternativa mais flexível, dá para ler o runner de uma variável do repositório (`runs-on: ${{ vars.RUNNER || 'ubuntu-24.04' }}`) e trocar sem novo commit.
