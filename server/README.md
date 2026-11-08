# Servidor Node e base de dados do Terrânia

**Papel:** serviço HTTP do site: saúde, contador de quem está jogando e catálogo de itens. **Não há salas, simulação nem WebSocket** (o jogo é solo e offline; [ADR 0012](../docs/adr/0012-retirada-do-multiplayer.md)). Rotas e limites em [docs/MULTIPLAYER_VPS.md](../docs/MULTIPLAYER_VPS.md).

**Ponto de entrada:** consulte [registro central](../architecture/modules.json) e o índice gerado em [docs/INDEX.md](../docs/INDEX.md). Os caminhos de código completos são listados automaticamente; não repetir listas manuais aqui.

**Ao alterar:** o cliente (`src/net/presence.ts`, `src/app/play-presence.ts`) e `server/src/presence.ts` precisam concordar no formato do sinal; teste as duas pontas.

**Verificação:** `npm test --prefix server`; typecheck/build; Docker `/health`; `server/scripts/public-smoke.mjs` no deploy.

**Limites:** o contador é informativo e não prova capacidade. Não misturar o protótipo Go (laboratório) com a rota de produção sem migração aprovada.

**Base solo/mercado (ADR 0010/0011):** [PostgreSQL](db/README.md) contém migração,
catálogo derivado dos 16 itens existentes e prontidão real. A API de catálogo é
somente leitura; contas, cofre e trocas aguardam identidade/autorização antes de
expor escrita. O banco não recebe o save solo e não muda as regras do jogo.

> Os parágrafos abaixo documentam a sala Node **retirada** (ADR 0012); permanecem como histórico, não como comportamento atual.

**Movimento e snapshots por tiles:** a sala compartilha o controlador de passos sem perda de tempo nos centros; uma direção curta recebida enquanto parado sobrevive até o tick seguinte. `time` e `stepTarget` são dados opcionais de apresentação para sessões com tiles. O servidor segue responsável por posição, colisões, alvo e impacto. O contrato v3 e o fallback dos clientes anteriores estão descritos no [ADR 0006](../docs/adr/0006-movimento-e-apresentacao-do-personagem.md).

**Economia da sessão:** a sala cria gel privado no abate, coleta pela posição autoritativa e executa a troca e a cura na bolsa do convidado. A negociação, o recibo contra repetição e a duração da bolsa estão no [ADR 0007](../docs/adr/0007-inventario-da-sala.md).

**Espadas:** a sala calcula a compra com Toren, o equipamento e o dano e a recarga do golpe. A negociação e os atributos das armas estão no [ADR 0008](../docs/adr/0008-espadas-e-recarga.md).

**Espaços de equipamento:** sessões que pedem `gear=slots` podem equipar o conjunto inicial. A sala valida a posição do item no equipamento e aplica a defesa no contato. Veja [ADR 0009](../docs/adr/0009-espacos-de-equipamento.md).

**Reconexão de teste:** a suíte WebSocket deve confirmar que a última desconexão descarta a sala e um novo jogador recebe ID, posição, bolsa e percurso próprios, enquanto o endpoint de presença volta à contagem correta. Não representa persistência de conta ou restauração de progresso.

**Docker e regras compartilhadas:** o estágio de build copia `src/engine/` como diretório, em vez de manter uma lista manual de arquivos que omitia `Food.ts`. Os workflows devem acionar verificação de imagem para toda alteração em `src/engine/**`; a etapa de CI/Docker `/health` cobre a resolução de imports usados pelo servidor Node. As regras autoritativas permanecem no motor, não na UI.
