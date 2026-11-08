# QA-BOT-001 — exploração, combate, encontros naturais e expedição

O bot é um cliente de QA **offline em memória**, sem login, conta, acesso à
VPS, navegador, WebSocket ou IA externa. Somente o motor de gameplay opera.

## Executar no Node.js 24

    npm run qa:bot > qa-bot-report.json
    npm run qa:bot -- --strict

O relatório JSON v5 possui cinco cenários independentes:
- exploration: A*, diálogos, placas e interiores.
- combat: cinco monstros de treino controlados, gel, poções e persistência.
- natural: um slime criado pelo gerador natural, combate e coleta real.
- onlinePatrol: o mesmo QA-BOT-001 usa agora as chamadas e a colisão autoritativas da `Room` Node; visita regiões em etapas de movimento por tile, confere snapshots privados, contabiliza passos bloqueados e divergências. O cenário é **local em memória**: cobre a lógica multiplayer, mas NÃO o transporte WebSocket nem uma VPS em produção. O transporte tem teste separado em `server/tests/integration.test.ts`.
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
**Não testa** classes, personagens persistidos em banco, renderização Phaser, Angular, mobile físico ou conexão WebSocket na patrulha local. A patrulha cobre regras de sala Node e snapshot/colisão, mas não autoriza declarações de teste em produção.
Nenhum código é executado automaticamente na VPS.
