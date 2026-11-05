# Servidor Node multiplayer

**Papel:** Servidor WebSocket e salas autoritativas do backend atual.

**Ponto de entrada:** consulte [registro central](../architecture/modules.json) e o índice gerado em [docs/INDEX.md](../docs/INDEX.md). Os caminhos de código completos são listados automaticamente; não repetir listas manuais aqui.

**Ao alterar:** Mudanças em sala, rate limit e contrato devem manter equivalência com o cliente.

**Verificação:** npm test --prefix server; build/typecheck; Docker /health.

**Limites:** Não misturar protótipo Go shadow com rota de produção sem migração aprovada.
