#!/usr/bin/env bash
# Registra o runner (só na primeira vez) e o deixa rodando. Não imprime o token.
set -euo pipefail
cd /home/runner
STATE=/home/runner/state
FILES=(.runner .credentials .credentials_rsaparams)

: "${RUNNER_REPO_URL:?RUNNER_REPO_URL não definido (ex.: https://github.com/Softdown-prog/Terrania)}"
RUNNER_NAME="${RUNNER_NAME:-terrania-vps}"
RUNNER_LABELS="${RUNNER_LABELS:-terrania-vps}"

# Já registrado antes? Restaura o registro guardado no volume.
for f in "${FILES[@]}"; do [ -f "$STATE/$f" ] && cp -f "$STATE/$f" "./$f"; done

if [ ! -f .runner ]; then
  if [ -z "${RUNNER_TOKEN:-}" ]; then
    echo "ERRO: o runner ainda não está registrado e não há RUNNER_TOKEN." >&2
    echo "Gere um token novo (vale 1 hora) em: GitHub > Settings > Actions > Runners > New self-hosted runner." >&2
    sleep 300; exit 1
  fi
  echo "Registrando o runner '${RUNNER_NAME}' em ${RUNNER_REPO_URL} (etiquetas: ${RUNNER_LABELS})..."
  if ! ./config.sh --unattended --replace \
        --url "$RUNNER_REPO_URL" --token "$RUNNER_TOKEN" \
        --name "$RUNNER_NAME" --labels "$RUNNER_LABELS" --work _work; then
    echo "ERRO: o GitHub recusou o registro. O token costuma estar vencido (vale 1 hora) ou é de outro repositório." >&2
    echo "Gere um token novo e rode o install.sh de novo." >&2
    sleep 300; exit 1
  fi
  for f in "${FILES[@]}"; do [ -f "$f" ] && cp -f "$f" "$STATE/$f"; done
  echo "Registro guardado. O token não é mais necessário."
fi

# Espera o Docker interno (DinD) responder: os fluxos usam docker build/run e serviços em contêiner.
for _ in $(seq 1 60); do docker info >/dev/null 2>&1 && break; sleep 2; done
docker info >/dev/null 2>&1 || { echo "ERRO: o Docker interno (dind) não respondeu em 2 minutos." >&2; sleep 60; exit 1; }

exec ./run.sh
