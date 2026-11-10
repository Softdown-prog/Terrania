# Vila da Travessia — expansão do núcleo habitado (10/11/2026)

## Implementado na branch de expansão
- Zona protegida ampliada para tiles X 0–38 e Y -12–18; NPCs e caminhos livres de obstáculos procedurais. Os monstros na superfície não atacam o jogador dentro dela, e seus passos não atravessam a fronteira protegida.
- Sete construções, com fachadas, portas, colisões e interiores: conselho, oficina, hospedaria, mercado, arquivo, posto dos curandeiros e armazém. As quatro novas construções são visitáveis, mas **não oferecem comércio, cura ou armazenamento ainda**.
- Quatro placas e uma entrada monumental para a trilha a leste. A Gruta dos Slimes fica no tile (44,11), fora do perímetro seguro, acessível pela trilha.
- Slimes dentro da primeira gruta tornam a caverna o tutorial de combate de Aela. Somente os cinco primeiros abates feitos nessa gruta contam para a missão; os abates gerais continuam contando separadamente para o histórico e outras missões.
- Mira, Toren e Lina circulam em trajetos curtos dentro da vila, com a interação ligada à posição renderizada. Aela e Eron ficam fixos para garantir as interações das missões.
- Cinco espécies regionais agora possuem limiar de fuga em vida amarela ou vermelha: outras continuam combatendo. O comportamento fica parametrizado em `src/monsters/behavior.ts`.

## Plano de expansão regional

| Área | Cidade e urbanismo previstos | Distribuição de criaturas | Missões propostas |
|---|---|---|---|
| Centro — Travessia | Feira, áreas residenciais, praça com bancos, hortas, muralhas leves, portões e pontos de patrulha | Slimes externos longe do perímetro; no tutorial, só slimes em câmaras acessíveis | Aprender combate com Aela; recuperar o Garrano com Eron |
| Norte Glacial | Aldeia dos caçadores, torre de vigia, pontes nevadas | Lobos em florestas, ursos nas colinas, yetis e espíritos em ruínas | Escoltar caravanas e investigar a torre congelada |
| Sul Árido | Oásis, casas de adobe, armazéns de caravana e muralhas | Ratos em estradas, escaravelhos em ruínas, orcs no deserto, vermes nas dunas | Recuperar suprimentos e liberar passagem das ruínas |
| Leste Costeiro | Porto, docas, farol, vila pesqueira, travessias de barco | Caranguejos nas praias, tritões na costa e serpentes junto ao mar | Consertar o farol e restaurar uma rota entre ilhas |
| Oeste Montanhoso | Fortaleza, casas de mineradores, pontes de pedra e forjas | Golens nas rochas, draconídeos nos penhascos, monstros avançados em cavernas | Reabrir minas e investigar masmorras antigas |

Futuras cidades precisarão de zonas de proteção próprias, grupos de spawn por bioma, distância mínima das entradas e nível/dificuldade, arquitetura de NPCs e verificação de caminhos navegáveis. **A tabela é planejamento, não funcionalidade já implementada.**

## QA e integração
Rodar `npm run architecture:check`, `npm run typecheck`, `npm test`, `npm run build`, `npm run qa:bot` e Playwright desktop/Android. Somente a simulação em código é coberta automaticamente; validar navegação, diálogo, performance e visual de cada área no navegador e em aparelho Android antes de merge/deploy.

A retirada anterior do multiplayer continua válida; o backend de presença/catálogo não deve receber uma segunda implementação de regras de combate.
