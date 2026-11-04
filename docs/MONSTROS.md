# MONSTER-001 — Biblioteca inicial de monstros

Catálogo central: `src/actors/MonsterSpecies.ts`. Entidade genérica, sem DOM:
`src/actors/Monster.ts`. Geração procedural determinística:
`src/actors/MonsterSpawns.ts`. `Slime` preserva a API antiga como subclasse
para manter regressões e compatibilidade dos servidores existentes.

| Criatura | HP | Dano por contato | XP | Velocidade base | IA | Material |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Slime | 2 | 9 | 10 | 38 | salto/perseguição | gel |
| Lobo | 3 | 12 | 20 | 66 | investida | presa |
| Aranha | 2 | 6 | 15 | 50 | aproximação cautelosa | seda |

## Regras

- Slimes mantêm os IDs, coordenadas e probabilidades originais do gerador.
- Lobos/aranhas só surgem além de aproximadamente 4 chunks de distância da
  origem e em terreno caminhável, sem usar `Math.random`.
- Todos respeitam área segura da vila e o sistema de colisão e ataque existentes.
- Drops têm 1 unidade por abate, respeitam inventário com pilha máxima 99 e
  são persistidos, mesmo se o jogador estiver com bolsa cheia.
- Cada espécie oferece XP próprio, sem recontar um monstro derrotado.
- A missão de Aela conta **somente Slimes**, separando `slimeKills` de
  `kills` (total). Saves antigos assumem todos os abates como Slimes.
- No mapa, Lobo e Aranha têm silhuetas procedurais distintas; materiais recebem
  cores diferentes. Os painéis da bolsa continuam Angular.

## Compatibilidade e limites

O modo solo está implementado; o multiplayer Go/Node permanece com Slimes.
O protocolo v3 recebe um campo opcional `kind` para futuros servidores,
mas **não habilita** monstros novos no online nem altera a versão do protocolo.
Os próximos passos são paridade no Go, snapshots tipados e teste com 2 jogadores,
antes de qualquer deploy. Futuros monstros devem acrescentar entradas no
catálogo, spawns e uma representação visual, sem duplicar toda a simulação.

Validar `npm run typecheck`, `npm test`, `npm run build`,
`npm run test:browser`, `npm run qa:bot -- --strict` e suíte pré-main.
