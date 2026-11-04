# QA-BOT-001 — exploração, combate, encontros naturais e expedição

O bot é um cliente de QA **offline em memória**, sem login, conta, acesso à
VPS, navegador, WebSocket ou IA externa. Somente o motor de gameplay opera.

## Executar no Node.js 24

    npm run qa:bot > qa-bot-report.json
    npm run qa:bot -- --strict

O relatório JSON v4 possui quatro cenários independentes:
- exploration: A*, diálogos, placas e interiores.
- combat: cinco monstros de treino controlados, gel, poções e persistência.
- natural: um slime criado pelo gerador natural, combate e coleta real.
- expedition: **dois ou mais slimes naturais em uma única simulação**, sem
  spawn artificial e sem teleporte. Coleta IDs, posições iniciais/finais,
  ticks por encontro, regiões (chunks de 512 px) visitadas, tiles visitados,
  distância realmente caminhada, passos bloqueados, falhas de rota, mortes,
  HP antes/depois, resultados e tentativas de coleta.

A expedição usa orçamento global de ticks e limite de replanejamentos.
Um NPC hostil pode matar o bot; o relatório mostra o ocorrido e o
respawn normal do motor (sem garantir que o combate será recuperado).
O modo --strict reprova a Action com qualquer falha, mas preserva o
artefato JSON para análise. O cenário é reproduzível com a mesma seed.

Não confundir esse QA de gameplay com Playwright ou teste de servidor.
**Não testa** experiência, classes, personagens persistidos em banco,
renderização Phaser, Angular, mobile físico ou multiplayer WebSocket.
Nenhum código é executado automaticamente na VPS.


## MONSTER-001 — catálogo e progressão solo

A suíte `tests/monsters.test.ts` verifica criação determinística das três espécies,
atributos imutáveis, IA corpo a corpo e resistência, XP por abate, distinção da missão
de cinco slimes, materiais de cada espécie, persistência e limite de pilhas.
A expedição natural agora contabiliza XP real do motor. A exploração padrão perto
da vila permanece com spawns de slime idênticos aos anteriores.

Lobos e aranhas ficam apenas no modo solo neste recorte. O backend Go autoritativo
ainda deve receber os novos tipos antes de habilitá-los online.
