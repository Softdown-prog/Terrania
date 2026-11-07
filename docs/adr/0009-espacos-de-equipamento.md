# ADR 0009 — Espaços de equipamento

A bolsa da rota Jogar separa consumíveis do painel de equipamento. Os dez espaços são anel, elmo, colar, escudo, peitoral, espada, mochila, calça, flechas e botas. Selecionar um espaço mostra o item disponível e a ação de equipar ou tirar. A espada inicial fica equipada até ser trocada pela de Toren, cuja compra continua na vila. Os outros nove itens fazem parte do conjunto inicial, guardado na bolsa até o primeiro uso.

O elmo e o peitoral somam 1 de defesa cada. O escudo soma 2. A defesa reduz o dano de contato de Slime de 9 para até 5, mantendo a regra de colisão e o intervalo entre impactos. Os outros itens ocupam seus espaços e são guardados no save. Flechas e mochila ainda não participam de ataque à distância ou capacidade de carga.

O solo salva os itens equipados com a bolsa e conserva o equipamento ao retornar à vila. Saves antigos começam com os espaços do conjunto inicial vazios. Sessões Node pedem `gear=slots` além das capacidades de inventário e espada. O servidor responde com `inventory.gear` e aceita `set-gear` pelo mesmo fluxo de recibo do inventário. O comando envia o espaço e o item, ou `null` para tirar. O servidor valida a combinação, aplica a defesa e conserva o equipamento no respawn. A próxima conexão começa com os espaços vazios. Clientes que recebem somente `loadout` continuam com a seção de espadas.
