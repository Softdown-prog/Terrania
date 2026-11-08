# Montarias — Cavalaria solo, estábulo e domesticação

Montarias são companheiras do **jogo solo**. O motor online não sincroniza
posições nem criaturas entre jogadores. O catálogo canônico está em
[MountCatalog.ts](../src/actors/MountCatalog.ts); toda regra fica em
[MountStable.ts](../src/engine/MountStable.ts), sem Angular/DOM.

## Conteúdo do primeiro lote

A folha 5×2 fornecida pelo criador representa, em ordem: Cavalo de Batalha,
Bode Montanhês Gigante, Alce Imperial, Leão do Fogo, Lagarto das Areias,
Urso-das-Cavernas, Unicórnio de Prata, Grifo-Sombrio, Escaravelho de Carga e
Hipocampo das Marés. **Não** é o lote 11–20 de monstros. Os dez possuem
fichas completas e silhuetas Canvas específicas, registradas como criatura no
contrato de arte; não se lê a sprite sheet como textura.

| Montaria | Tier | Nível | HP | Energia | Velocidade | Ataque | Habilidade planejada |
| --- | ---: | ---: | ---: | ---: | --- | ---: | --- |
| Cavalo de Batalha | I | 15 | 200 | 180 | +40% | 12 | Investida Firme |
| Bode Montanhês Gigante | I | 25 | 230 | 220 | +30% | 15 | Andarilho do Cume |
| Alce Imperial | II | 35 | 310 | 260 | +45% | 18 | Agilidade das Sombras |
| Leão do Fogo | III | 55 | 450 | 320 | +55% | 35 | Crina Ardente |
| Lagarto das Areias | II | 40 | 280 | 200 | +35% | 22 | Fervor Desértico |
| Urso-das-Cavernas | II | 45 | 550 | 180 | +25% | 40 | Quebra-Barreiras |
| Unicórnio de Prata | III | 60 | 400 | 450 | +60% | 25 | Purificação |
| Grifo-Sombrio | III | 65 | 380 | 340 | +50% | 30 | Voo Curto |
| Escaravelho de Carga | I | 30 | 480 | 300 | +20% | 10 | Estoque Extra |
| Hipocampo das Marés | II | 40 | 300 | 280 | Terra +25% / água +75% | 15 | Navegador Anfíbio |

As dez quests de domesticação, descrições, regiões, selas, iscas e drops
exatos estão no catálogo. Quests regionais não são tratadas como concluídas:
precisam de artefatos/interações, novos pontos de interesse e lógica de habilidades.

## Fluxo jogável — O Garrano Fugitivo da Vila

1. Alcance nível 15; converse com **Eron**, Mestre de Estábulos da Vila.
2. Construa o cercado por 12 unidades de gel e treine **Cavalaria I**.
3. Inicie a quest **O Garrano Fugitivo da Vila**. Afaste cinco slimes.
4. Colha a **Maçã Silvestre** a sudoeste da vila e prepare um **cabresto**
   no estábulo por 3 gel (recursos só são consumidos em operações válidas).
5. Encontre o cavalo fugitivo e use E ou o botão de ação para acalmá-lo.
6. Ganhe o Cavalo de Batalha com sua **Sela de Couro Simples**, volte ao
   estábulo e selecione montar. Pode desmontar pelo HUD.

A jornada tem validações reais de nível, proximidade, consumo, quest, inventário
e estado. O cavalo rende Crina Forte (80%) e Couro Comum (100%) ao ser
domado, com sorteio reproduzível pela seed. A mesma captura não dá recompensa
duas vezes. A montaria só muda a velocidade dos passos clássicos, sem atravessar
paredes; a energia é consumida durante corrida e recuperada quando para.
Na cavalgada contínua em linha reta, o cavalo prepara a Investida Firme.
O save tem campos opcionais e mantém compatibilidade com saves anteriores;
respawn e entrada em cavernas desmontam o cavalo.

## Evolução e pendências deliberadas

Cavalaria I, II, III exige níveis 15, 35, 55; o teto de nível sobe para 70
para permitir unicórnio (60) e grifo (65). Cada melhoria do cercado exige
12, 25 ou 40 gel e treinamento correspondente. O estábulo será a casa para
trocar montarias depois que as outras quests forem jogáveis.

**Ainda não implementado como ação real nesta etapa:** quests regionais 2–10,
fabricação de suas selas e iscas, dano de montarias, combate montado próprio,
cura do unicórnio, planado, novos tipos de colisão (areia movediça/gelo
destrutível) e navegação oceânica, estoque extra do besouro. Esses recursos
exigem testes separados; o código não os concede só por haver uma ficha no
catálogo. Não declarar montaria capturável sem uma quest física validada.

## Portões de qualidade

- \`npm run architecture:check\`: registro dos módulos/entradas e índices.
- \`npm run typecheck\`, \`npm test\`, \`npm run build\`.
- \`npm run art:preview\`: revisar a aparência procedural das dez espécies.
- \`npm run test:browser\`: desktop e Android; acompanhar toque nos botões.
- Não adicionar exceção \`NOT_AN_ASSET\`, nem diminuir \`FLOORS.creature\`.
