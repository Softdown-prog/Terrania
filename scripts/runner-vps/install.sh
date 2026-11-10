#!/usr/bin/env bash
# Instala e cuida do runner do GitHub Actions do Terrania, em contêiner, nesta VPS (ADR 0030).
#
#   sudo ./install.sh            instala (pede o token do GitHub, que não aparece na tela)
#   sudo ./install.sh doctor     confere a VPS e mostra o que está errado, sem mudar nada
#   sudo ./install.sh status     mostra se o runner está rodando e ouvindo jobs
#   sudo ./install.sh logs       acompanha o log do runner
#   sudo ./install.sh remove     para o runner e apaga os volumes (depois remova-o no GitHub)
#
# O token vale 1 hora e é de uso único: GitHub > Settings > Actions > Runners > New self-hosted runner
# > Linux, e copie o valor depois de `--token` na linha do `./config.sh`.
set -euo pipefail
cd "$(dirname "$0")"

say()  { printf '\n==> %s\n' "$*"; }
warn() { printf 'AVISO: %s\n' "$*" >&2; }
die()  { printf 'ERRO: %s\n' "$*" >&2; exit 1; }
compose() { docker compose "$@"; }

doctor() {
  local problems=0
  say "Conferindo a VPS"
  [ "$(uname -s)" = "Linux" ] || { warn "isto precisa rodar no Linux da VPS"; problems=1; }
  case "$(uname -m)" in x86_64|aarch64) ;; *) warn "arquitetura $(uname -m) não é x86_64 nem aarch64"; problems=1;; esac
  if ! command -v docker >/dev/null 2>&1; then warn "docker não está instalado (https://docs.docker.com/engine/install/ubuntu/)"; problems=1
  elif ! docker info >/dev/null 2>&1; then warn "o docker está instalado, mas este usuário não consegue usá-lo: rode com sudo"; problems=1
  elif ! docker compose version >/dev/null 2>&1; then warn "falta o plugin 'docker compose' (apt install docker-compose-plugin)"; problems=1
  else echo "docker $(docker version --format '{{.Server.Version}}'), compose $(docker compose version --short)"; fi
  local mem_kb disk_kb
  mem_kb=$(awk '/MemTotal/ {print $2}' /proc/meminfo 2>/dev/null || echo 0)
  disk_kb=$(df -Pk . | awk 'NR==2 {print $4}')
  echo "memória: $((mem_kb / 1024)) MB · disco livre: $((disk_kb / 1024 / 1024)) GB · CPUs: $(nproc)"
  [ "$mem_kb" -ge 3500000 ] || warn "menos de 4 GB de memória: os testes de navegador e os laboratórios podem falhar (e a produção sofre junto)"
  [ "$disk_kb" -ge 15000000 ] || warn "menos de 15 GB livres: as imagens e o cache dos fluxos precisam de espaço"
  for url in https://api.github.com https://ghcr.io https://registry.npmjs.org; do
    if curl -fsS -o /dev/null --max-time 10 "$url" 2>/dev/null; then echo "alcança $url"; else warn "sem acesso a $url (firewall ou DNS?)"; problems=1; fi
  done
  return "$problems"
}

wait_listening() {
  say "Esperando o runner conectar ao GitHub (até 3 minutos)"
  for _ in $(seq 1 90); do
    if compose logs --no-color runner 2>&1 | grep -q "Listening for Jobs"; then return 0; fi
    if compose logs --no-color runner 2>&1 | grep -q "^ERRO:"; then compose logs --no-color --tail 15 runner; return 1; fi
    sleep 2
  done
  compose logs --no-color --tail 30 runner; return 1
}

install() {
  doctor || die "corrija os itens acima e rode de novo (veja também: ./install.sh doctor)"
  if docker volume ls -q | grep -q 'runner-state$' && [ -z "${RUNNER_TOKEN:-}" ]; then
    say "Runner já registrado antes: só (re)subindo os contêineres, sem token"
  else
    if [ -z "${RUNNER_TOKEN:-}" ]; then
      printf 'Cole o token de registro do GitHub (não aparece na tela): '
      read -rs RUNNER_TOKEN; echo
    fi
    [ -n "$RUNNER_TOKEN" ] || die "token vazio"
    umask 077
    printf 'RUNNER_TOKEN=%s\n' "$RUNNER_TOKEN" > .env   # só nesta pasta, modo 600, fora do Git
  fi
  say "Construindo e subindo o runner (a primeira vez baixa as imagens e leva alguns minutos)"
  compose up -d --build
  if wait_listening; then
    [ -f .env ] && { : > .env; chmod 600 .env; }
    compose up -d --force-recreate runner >/dev/null   # recria sem o token no ambiente do contêiner
    echo "Token apagado: o registro já está guardado no volume."
    say "Pronto: o runner 'terrania-vps' está online. Confira em GitHub > Settings > Actions > Runners."
    echo "Ainda NÃO troque os fluxos para ele: leia docs/RUNNER_VPS.md (seção 'Antes de usar')."
  else
    die "o runner não ficou online. Veja o log acima; token vencido é a causa mais comum. Rode './install.sh doctor' e tente de novo com um token novo."
  fi
}

case "${1:-install}" in
  install) install ;;
  doctor)  doctor && say "Tudo certo com a VPS." ;;
  status)  compose ps; compose logs --no-color --tail 5 runner ;;
  logs)    compose logs -f --tail 100 runner ;;
  remove)
    printf 'Isto para o runner e apaga o registro e o cache. Continuar? [digite sim] '; read -r answer
    [ "$answer" = "sim" ] || die "cancelado"
    compose down -v
    echo "Agora remova o runner 'terrania-vps' em GitHub > Settings > Actions > Runners."
    ;;
  *) die "comando desconhecido: $1 (use install, doctor, status, logs ou remove)" ;;
esac
