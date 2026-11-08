# Rede cliente e contrato

**Papel:** MultiplayerClient integra WebSocket; src/shared/protocol.ts define o contrato serializado.

**Ponto de entrada:** consulte [registro central](../../architecture/modules.json) e o índice gerado em [docs/INDEX.md](../../docs/INDEX.md). Os caminhos de código completos são listados automaticamente; não repetir listas manuais aqui.

**Ao alterar:** Ao alterar protocolo, documentar compatibilidade e testar ambas as pontas antes de publicar.

**Verificação:** testes de sessões online, server e Go parity.

**Limites:** Não confiar em HP ou posição enviados pelo navegador; manter versão do protocolo explícita.

**Apresentação por tempo:** estados Node por tiles incluem `time` e o `stepTarget` dos heróis. `SnapshotTimeline` mantém uma reserva-alvo de 180 ms e ajusta suavemente o ritmo de reprodução conforme chegam os estados. Assim, diferenças entre o relógio do navegador e o da sala não esgotam a reserva durante caminhadas longas. A posição para no último estado se faltarem pacotes. Sem timestamp, o cliente usa o interpolador anterior. O buffer é limpo na desconexão e só alimenta a apresentação. Ver [ADR 0006](../../docs/adr/0006-movimento-e-apresentacao-do-personagem.md).

**Inventário online:** após negociar `inventory=loot`, o cliente consome o estado privado da bolsa e só libera outro pedido quando chega o recibo do pedido pendente. Ver [ADR 0007](../../docs/adr/0007-inventario-da-sala.md).

**Alimentação online:** os comandos `buy-apple|bread|meat` e `eat-apple|bread|meat` passam por `isValidInventoryMessage` e recibos privados. A sala Node valida compra com Lina, saldo de gel, quantidade, cooldown, saciedade e HP; o navegador só mostra o resultado. `food` e `nutrition` são campos opcionais de `RoomInventoryState` para leitura compatível, mas clientes e servidores precisam ser atualizados de maneira coordenada para habilitar novos comandos.
