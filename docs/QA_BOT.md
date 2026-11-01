# Terrânia QA Bot — diagnóstico offline sem conta

O QA-BOT-001 é um jogador interno determinístico, **sem cadastro**, login, IA
externa, DOM, rede, persistência ou acesso à VPS. Executa cenários de QA em
memória, com comportamento reproduzível pela seed.

## Executar com Node.js 24

    npm run qa:bot > qa-bot-report.json
    npm run qa:bot -- --seed=42 --ticks=18000
    npm run qa:bot -- --strict

A saída JSON tem `schemaVersion: 2`, status geral e dois cenários distintos:
- `exploration`: movimentação real por A*, colisão, NPCs, placas, diálogos,
  portas e três interiores. `--ticks` limita somente esta exploração.
- `combat`: cinco slimes **de treinamento**, instanciados no motor offline
  em terreno caminhável depois de o personagem ir andando à vila. O herói
  se aproxima, executa ataques reais respeitando alcance e cooldown, vai
  até cada drop de gel, recebe duas poções pela missão de cinco slimes,
  sofre dano usando a API de jogador, usa uma poção e verifica save/restauração.
  Não altera dados de usuários reais e nunca teletransporta o herói.

Os relatórios registram status, ticks, coordenadas, causas de falhas,
recompensas e capacidades explicitamente não validadas. A Action executa o bot com `--strict` para sinalizar regressões em vermelho,
mas sempre tenta preservar o relatório JSON e o resumo para investigação.
A execução local sem `--strict` não bloqueia por falhas diagnósticas;
`--strict` devolve código 1 se algum cenário falhar ou ficar incompleto. Seed deve ser uint32, `--ticks` entre 120 e 36000.

**Limites importantes:** esses encontros são **controlados**, não provam a
distribuição de spawns naturais, pathfinding para monstros no mundo aberto
nem o comportamento de NPCs inimigos fora da vila. Ainda não validam
Phaser/Angular no navegador, multiplayer, rede, XP ou classes.
Os testes correspondentes precisam de ambientes e agentes separados.
O bot jamais é executado automaticamente na VPS de produção.

Próximas fases: exploração de encontros naturais no mapa, sessão de
navegador Phaser/Angular, multiplayer isolado, XP, níveis e habilidades.
