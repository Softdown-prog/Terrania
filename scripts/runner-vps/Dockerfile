# Runner do GitHub Actions para a VPS (ADR 0030): a imagem OFICIAL da GitHub mais as ferramentas que os
# fluxos do Terrania usam. O Node, o Go e o Rust vêm dos próprios fluxos (setup-node, setup-go...), que
# baixam a versão pedida para o cache de ferramentas do runner; aqui ficam só o que eles supõem do Ubuntu.
ARG RUNNER_IMAGE=ghcr.io/actions/actions-runner:latest
FROM ${RUNNER_IMAGE}

USER root
RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      ca-certificates curl git jq unzip zip xz-utils build-essential pkg-config libssl-dev \
      python3 python3-pip gnupg lsb-release sudo netcat-openbsd \
 && install -m 0755 -d /etc/apt/keyrings \
 && curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc \
 && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
      > /etc/apt/sources.list.d/docker.list \
 && apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends docker-ce-cli docker-buildx-plugin docker-compose-plugin \
 && rm -rf /var/lib/apt/lists/* \
 && echo 'runner ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/runner && chmod 0440 /etc/sudoers.d/runner

# Pastas que viram volumes: o registro do runner (para sobreviver a reinício) e a área de trabalho.
# Criadas aqui, com o dono certo, para o volume herdar a permissão do usuário `runner`.
RUN mkdir -p /home/runner/state /home/runner/_work/_tool \
 && chown -R runner:runner /home/runner/state /home/runner/_work

COPY --chown=runner:runner entrypoint.sh /home/runner/entrypoint.sh
RUN chmod 0755 /home/runner/entrypoint.sh

USER runner
WORKDIR /home/runner
ENV AGENT_TOOLSDIRECTORY=/home/runner/_work/_tool \
    RUNNER_TOOL_CACHE=/home/runner/_work/_tool \
    RUNNER_ALLOW_RUNASROOT=0
ENTRYPOINT ["/home/runner/entrypoint.sh"]
