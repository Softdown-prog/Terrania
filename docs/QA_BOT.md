# QA-BOT-001 — exploração, combate, encontros naturais e expedição

O bot é um cliente de QA **offline em memória**, sem login, conta, acesso à
VPS, navegador, WebSocket ou IA externa. Somente o motor de gameplay opera.

## Executar no Node.js 24

    npm run qa:bot > qa-bot-report.json
    npm run qa:bot -- --strict

O relatório JSON v6 possui quatro cenários independentes (a patrulha da `Room` online foi retirada junto com o multiplayer; ver ADR 0012):
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
**Não testa** classes, personagens persistidos em banco, renderização Phaser, Angular nem mobile físico, e não autoriza declarações de teste em produção.
Nenhum código é executado automaticamente na VPS.
