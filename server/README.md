# Servidor Node multiplayer

**Papel:** Servidor WebSocket e salas autoritativas do backend atual.

**Ponto de entrada:** consulte [registro central](../architecture/modules.json) e o índice gerado em [docs/INDEX.md](../docs/INDEX.md). Os caminhos de código completos são listados automaticamente; não repetir listas manuais aqui.

**Ao alterar:** Mudanças em sala, rate limit e contrato devem manter equivalência com o cliente.

**Verificação:** npm test --prefix server; build/typecheck; Docker /health.

**Limites:** Não misturar protótipo Go shadow com rota de produção sem migração aprovada.

**Movimento e snapshots por tiles:** a sala compartilha o controlador de passos sem perda de tempo nos centros; uma direção curta recebida enquanto parado sobrevive até o tick seguinte. `time` e `stepTarget` são dados opcionais de apresentação para sessões com tiles. O servidor segue responsável por posição, colisões, alvo e impacto. O contrato v3 e o fallback dos clientes anteriores estão descritos no [ADR 0006](../docs/adr/0006-movimento-e-apresentacao-do-personagem.md).

**Economia da sessão:** a sala cria gel privado no abate, coleta pela posição autoritativa e executa a troca e a cura na bolsa do convidado. A negociação, o recibo contra repetição e a duração da bolsa estão no [ADR 0007](../docs/adr/0007-inventario-da-sala.md).

**Espadas:** a sala calcula a compra com Toren, o equipamento e o dano e a recarga do golpe. A negociação e os atributos das armas estão no [ADR 0008](../docs/adr/0008-espadas-e-recarga.md).

**Espaços de equipamento:** sessões que pedem `gear=slots` podem equipar o conjunto inicial. A sala valida a posição do item no equipamento e aplica a defesa no contato. Veja [ADR 0009](../docs/adr/0009-espacos-de-equipamento.md).

**Docker e regras compartilhadas:** o estágio de build copia `src/engine/` como diretório, em vez de manter uma lista manual de arquivos que omitia `Food.ts`. Os workflows devem acionar verificação de imagem para toda alteração em `src/engine/**`; a etapa de CI/Docker `/health` cobre a resolução de imports usados pelo servidor Node. As regras autoritativas permanecem no motor, não na UI.
