# Cluster, coordenação e recuperação (LAB)

**Papel:** Experimentos de eleição, snapshots, leases, handoff e autoscale.

**Ponto de entrada:** consulte [registro central](../../architecture/modules.json) e o índice gerado em [docs/INDEX.md](../../docs/INDEX.md). Os caminhos de código completos são listados automaticamente; não repetir listas manuais aqui.

**Ao alterar:** Registrar risco de split brain, epochs, limites e testes ao modificar protocolos internos.

**Verificação:** go test -race ./... com testes de stress apropriados na pipeline dedicada.

**Limites:** NÃO é failover validado em produção; não ativar sem plano de operação, dados persistentes e reversão.
