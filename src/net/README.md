# Rede cliente e contrato

**Papel:** MultiplayerClient integra WebSocket; src/shared/protocol.ts define o contrato serializado.

**Ponto de entrada:** consulte [registro central](../../architecture/modules.json) e o índice gerado em [docs/INDEX.md](../../docs/INDEX.md). Os caminhos de código completos são listados automaticamente; não repetir listas manuais aqui.

**Ao alterar:** Ao alterar protocolo, documentar compatibilidade e testar ambas as pontas antes de publicar.

**Verificação:** testes de sessões online, server e Go parity.

**Limites:** Não confiar em HP ou posição enviados pelo navegador; manter versão do protocolo explícita.

**Apresentação por tempo:** estados Node por tiles incluem `time` e o `stepTarget` dos heróis. `SnapshotTimeline` usa 120 ms de reserva para reproduzir o caminho, inclusive as curvas nos centros, e os temporizadores da espada. Sem timestamp, o cliente conserva o interpolador anterior. O buffer é limpo na desconexão; não participa da autoridade de movimento/dano. Ver [ADR 0006](../../docs/adr/0006-movimento-e-apresentacao-do-personagem.md).
