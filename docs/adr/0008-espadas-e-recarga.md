# ADR 0008 — Espadas e recarga

O herói começa com a Espada de viagem, que causa 1 de dano e permite iniciar um ataque a cada 1,6 s no combate por alvo. Toren vende uma Espada da Travessia por 5 géis ao herói vivo que estiver perto dele. A compra é única e entrega a espada na bolsa. Equipá-la troca o dano para 2 e o intervalo para 2 s. É possível voltar à arma inicial pela bolsa.

`Weapons.ts` define os atributos e o preço. A bolsa armazena posse e equipamento. Cada ataque fixa seu dano e sua recarga no início da preparação. Trocar de espada ou de alvo preserva a recarga vigente. O impacto continua validando alvo, alcance e colisão. O solo guarda posse e escolha no save. Saves antigos começam com a espada inicial. A derrota conserva a arma e a posse no solo e na conexão Node.

O navegador pede `equipment=forge` além de `inventory=loot`, movimento por tiles e combate por alvo. A sala Node confirma o suporte ao incluir `inventory.loadout` no estado privado. Compra e trocas de arma usam as ações `buy-sword`, `equip-starter` e `equip-forge` no comando `inventory` do protocolo v3, com o mesmo recibo monotônico de [ADR 0007](0007-inventario-da-sala.md). Preço, posse, saldo, posição, dano e recarga são determinados pela sala. Uma conexão nova volta à arma inicial. Sessões sem essa capacidade usam os atributos iniciais.
