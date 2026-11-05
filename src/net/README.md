# Rede cliente e contrato

**Papel:** MultiplayerClient integra WebSocket; src/shared/protocol.ts define o contrato serializado.

**Ponto de entrada:** consulte [registro central](../../architecture/modules.json) e o índice gerado em [docs/INDEX.md](../../docs/INDEX.md). Os caminhos de código completos são listados automaticamente; não repetir listas manuais aqui.

**Ao alterar:** Ao alterar protocolo, documentar compatibilidade e testar ambas as pontas antes de publicar.

**Verificação:** testes de sessões online, server e Go parity.

**Limites:** Não confiar em HP ou posição enviados pelo navegador; manter versão do protocolo explícita.
