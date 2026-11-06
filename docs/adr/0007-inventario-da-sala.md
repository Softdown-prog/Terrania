# ADR 0007 — Inventário da sala

O autor do golpe final recebe um gel de Slime no ponto do abate. A sala guarda o item para esse convidado e o envia apenas a ele quando estiver na área de interesse do snapshot. A coleta é automática para o dono vivo a até 24 unidades com caminho livre até o item. Com 99 unidades na bolsa, o gel já solto continua no chão. O servidor limita o chão a 80 itens por convidado e deixa de gerar novos itens ao atingir esse limite.

Na Vila da Travessia, Lina troca três unidades de gel por uma poção. A sala verifica a proximidade pelo mesmo catálogo de NPCs do cliente e aplica a troca em uma única operação. Usar uma poção restaura até 35 pontos de vida. A bolsa só é debitada quando há cura. Os dois itens têm pilha máxima de 99. A recompensa de Aela segue no solo.

No protocolo v3, o navegador pede `inventory=loot` e o Node confirma `inventory: "loot"` no `welcome`. O `state` do próprio convidado inclui saldos, itens privados próximos e o recibo do último comando. O comando `inventory` carrega apenas a ação (`trade-potion` ou `use-potion`) e um `requestId` inteiro positivo e crescente na conexão. A sala ignora IDs iguais ou anteriores ao do último recibo e repete esse recibo nos snapshots até processar um novo pedido. Assim, um frame de estado descartado não exige repetir a mutação. A interface só envia um pedido por vez e aguarda o recibo correspondente antes de aceitar outro.

A bolsa e o loot sobrevivem ao respawn e pertencem à conexão ativa. Uma nova conexão inicia outra bolsa. O save local continua separado. Clientes e servidores sem essa capacidade mantêm o formato anterior e a bolsa fica disponível no solo. A implementação atende o backend Node.
