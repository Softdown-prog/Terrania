# QA-BOT-001 — exploração, combate, encontros naturais e expedição

O bot é um cliente de QA **offline em memória**, sem login, conta, acesso à
VPS, navegador, WebSocket ou IA externa. Somente o motor de gameplay opera.

## Executar no Node.js 24

    npm run qa:bot > qa-bot-report.json
    npm run qa:bot -- --strict

O relatório JSON v7 possui **seis** cenários independentes (a patrulha da `Room` online foi retirada junto com o multiplayer; ver ADR 0012):
- exploration: A*, diálogos, placas e interiores.
- combat: cinco monstros de treino controlados, gel, poções e persistência.
- natural: um slime criado pelo gerador natural, combate e coleta real.
- expedition: **dois ou mais slimes naturais em uma única simulação**, sem
  spawn artificial e sem teleporte. Coleta IDs, posições iniciais/finais,
  ticks por encontro, regiões (chunks de 512 px) visitadas, tiles visitados,
  distância realmente caminhada, passos bloqueados, falhas de rota, mortes,
  HP antes/depois, resultados e tentativas de coleta.

- **caves** (`src/qa/QaCaves.ts`, ADR 0086): as cavernas de **cada um dos seis temas** (Centro, Norte, Sul, Leste, Oeste e Pântano; quatro de cada, achadas varrendo as oito direções), em **todos os andares**: nascem povoadas; o herói **alcança a pé** cada criatura e as escadas (busca em largura sobre a colisão, independente da do jogo); e derrubar uma criatura deixa o saque no chão, o herói o recolhe e ganha a experiência. Já achou as cavernas do Centro vazias e um monstro numa ilha isolada de uma caverna do Pântano.
- **mage** (`src/qa/QaMage.ts`, ADR 0086): o Mago em todo o conteúdo dele: nasce com mana cheia e vestido; a magia derruba um slime com experiência e saque; **cada um dos onze cajados** gasta a mana pela regra do intervalo; **cada uma das 14 peças de roupa** só se veste no nível dela e só o Mago veste; os números de bônus são inteiros de 0 a 100 e a soma respeita o teto; comer devolve mana; o save guarda classe, mana e roupas.

A expedição usa orçamento global de ticks e limite de replanejamentos.
Um NPC hostil pode matar o bot; o relatório mostra o ocorrido e o
respawn normal do motor (sem garantir que o combate será recuperado).
O modo --strict reprova a Action com qualquer falha, mas preserva o
artefato JSON para análise. O cenário é reproduzível com a mesma seed.

Não confundir esse QA de gameplay com Playwright ou teste de servidor.
**Não testa** classes, personagens persistidos em banco, renderização Phaser, Angular nem mobile físico, e não autoriza declarações de teste em produção.
Nenhum código é executado automaticamente na VPS.
