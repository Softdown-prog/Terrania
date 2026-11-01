# Terrânia QA Bot — etapa 1 (offline, sem conta)

O QA-BOT-001 é um jogador de testes interno, determinístico e isolado.
Usa o motor offline de movimento e colisão, busca de rotas A*, seleção
de NPCs, diálogos e movimento em interiores. Não é um NPC público,
não cria conta e não usa navegador, arquivos de save ou VPS.

## Executar com Node 24

    npm run qa:bot > qa-bot-report.json
    npm run qa:bot -- --seed=42 --ticks=18000
    npm run qa:bot -- --strict

Sem --strict o processo tem caráter diagnóstico: achados ficam no JSON
e não reprovam o CI. Com --strict, problemas ou metas incompletas
retornam código 1. Seed válida: uint32. Ticks: 120 a 36000.

O relatório inclui status, seed, ticks, coordenadas da ocorrência e
do destino, motivo, passos, células visitadas e interações. A Action
publica o JSON como artefato e o resumo no GitHub Actions sem deploy.

## Cobertura honesta

Esta primeira versão visita NPCs/placas, anda até portas e percorre
interiores. Ainda não executa combate, loot, poções, navegador, WebSocket,
ou XP. O campo capabilities marca tudo isso como false.
Não use este relatório como prova de multiplayer, UI ou performance.
O bot nunca altera a produção nem contamina personagens de usuários.

Próximas fases: combate/loot/consumíveis; navegador Phaser/Angular;
sessões multiplayer isoladas; XP, classes, atributos e habilidades.
