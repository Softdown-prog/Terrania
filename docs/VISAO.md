# Terrania: Origins — Visão do jogo

## Premissa
RPG de exploração 2D top-down para navegador, com mundo procedural consistente, criaturas, NPCs, tarefas e evolução. O jogador começa em uma clareira e, nas próximas etapas, alcançará vilarejos, florestas, cavernas e ruínas.

## Pilares
- Jogo **HTML5 + TypeScript + Canvas 2D**, sem PNGs, sem spritesheets e sem React.
- Projeção top-down (90 graus), personagens desenhados com formas no Canvas.
- Mundo em chunks; gerar terreno por seed e coordenada global, evitando cortes entre chunks.
- Renderizar apenas área observada e entidades próximas; cache limitado por memória.
- Offline jogável; online opcional usando WebSocket e VPS própria.
- Controles de teclado e tela sensível ao toque.
- Desenvolvimento incremental com testes automatizados para regras compartilhadas.

## Vertical slice 0.2
Herói procedural, caminhada, ataque, slimes, missão de cinco criaturas, terreno de grama/floresta/água e duas pessoas numa sala experimental.

## Não fazer neste primeiro protótipo
- Gráficos 3D, motor de imagens externo ou importação do SDL/C++ do projeto antigo.
- Mundo permanente, chat, contas, pagamentos, mercado entre usuários ou economia real.
- Prometer MMO ou servidores públicos massivos sem testes de desempenho e segurança.

## Critérios para a próxima fase
- Teste de duas abas na mesma sala e reconexão em rede instável.
- Renderização com limite de chunks e sem vazamento de memória após exploração longa.
- Verificação de uso de CPU, RAM, largura de banda e latência antes da produção.
