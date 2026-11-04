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

## MONSTER-002 — Go autoritativo

O servidor Go reproduz o catálogo e o spawn determinístico em
`server-go/engine/monster_species.go` e `monster_spawns.go`.
O servidor decide sozinho que espécies nascem, a quem perseguem, quais
jogadores recebem dano e quais abates são confirmados. Os snapshots WebSocket
v3 incluem `kind` somente para Lobo/Aranha; ausência continua significando Slime.
A serialização interna de salas mantém checkpoints v1 de Slime válidos e
preserva a espécie durante exportação/restauração. O espelho de entidades Rust
usa tags 1 (Slime), 2 (Lobo), 3 (Aranha), mas seu **planejador de IA** permanece
somente para Slime: lotes mistos caem inteiramente no motor Go sem executar
a IA errada para novas espécies. Nenhum XP online é concedido aqui; progressão
online depende de armazenamento e contabilização autoritativos posteriores.

## RPG-002 — XP online por abate

O motor Go agora atribui a XP de cada espécie ao jogador que efetivamente
confirmou o abate no tick autoritativo. O servidor acompanha `Kills` total,
`SlimeKills` e `Experience` em separado, mantém nível/vida após reaparecimento
e inclui dados de progressão no snapshot WebSocket v3. Os checkpoints internos
da sala também mantêm estes atributos. A reconexão anônima tem **novo ID** e
não restaura XP sem identidade persistente. Leia `docs/RPG_PROGRESSAO.md`.

## RPG-005 — Reações de combate (apenas modo solo)

Lobo: investida com preparação de 0,45 s até a posição marcada do jogador, 16 de dano quando alcança o alvo, recarga 3,2 s. Aranha: teia telegrafada de 0,55 s contra a posição marcada, 8 de dano e lentidão temporária de 1,25 s caso o golpe efetivamente atinja. A esquiva pode evitar os ataques e um golpe interrompe a preparação. A IA anterior permanece quando a flag `soloSpecials` está desativada; essa flag é ativada apenas em `OfflineSimulation`. Nenhum ataque novo foi adicionado ao servidor Go, ao protocolo v3 ou à persistência. Veja `docs/QA_ANDROID.md`.
