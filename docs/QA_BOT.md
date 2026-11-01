# Terrânia QA-BOT-001 — exploração, combate e encontro natural

Execução offline em memória; nenhum cadastro, conta, VPS ou deploy.

```bash
npm run qa:bot > qa-bot-report.json
npm run qa:bot -- --strict
```

O JSON v3 separa três cenários:
- `exploration`: caminhada A*, NPCs, placas, três interiores.
- `combat`: cinco slimes de treino controlados, gel, poções, missão e save.
- `natural`: usa os slimes realmente gerados por `OfflineSimulation` no mundo.
  Seleciona somente monstros acessíveis, caminha sem teleporte, enfrenta a IA
  com ataque real e tenta coletar o gel no local da derrota.

O cenário natural é limitado a um encontro por seed e ao orçamento de ticks.
Uma falha detalha ID do monstro, coordenadas e etapa. Não faz spawn artificial.
`--strict` reprova o CI quando algum cenário falha; o artifact JSON continua
disponível mesmo quando a Action falha.

Limites: não testa Phaser/Angular no navegador, multiplayer, experiência XP,
classes, servidores reais, persistência de usuários nem toda a distribuição
do mundo. A execução automática é nos runners do GitHub Actions.
