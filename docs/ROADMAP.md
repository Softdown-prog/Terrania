# Terrania — Roadmap enxuto de RPG clássico

> **Direção atual:** RPG 2D de fantasia medieval inspirado nas *mecânicas* dos MMORPGs clássicos (sensação de Tibia antigo), mas com mundo, nomes, arte, interface e código próprios. Não reproduzir ativos ou conteúdo de terceiros.
>
> **Status:** caminhada por tiles e combate por alvo integrados à entrada normal do solo e às salas Node com suporte. O plano anterior foi preservado em [ROADMAP_ANTERIOR_20261104.md](ROADMAP_ANTERIOR_20261104.md).

## Organização que acompanha cada etapa

Cada microtarefa deve identificar seu módulo no [índice de arquitetura](INDEX.md), atualizar sua documentação se alterar comportamento ou contrato e passar por `npm run architecture:check`. O catálogo e os ADRs descrevem o histórico; não substituem revisão de gameplay, testes de carga ou restauração de dados.

## Princípios que guiam as próximas tarefas

1. **Jogo primeiro, infraestrutura depois.** Primeiro criar um ciclo de jogo compreensível e divertido em modo solo; integrar multiplayer, persistência e otimizações grandes quando os sistemas de jogo estiverem claros.
2. **Uma mecânica pequena por vez.** Implementar, testar em navegador e no Android, avaliar jogabilidade e só então escolher a próxima. Não desenvolver dezenas de recursos de um brainstorming por inércia.
3. **Alvo e ação clássicos.** Selecionar monstro no mapa ou Battle List, perseguir por caminho navegável e atacar automaticamente dentro do alcance, respeitando bloqueios, cooldown e morte.
4. **Angular apresenta o HUD; Phaser mostra o mundo; a simulação aplica regras.** Não duplicar estado nem lógica de ataque na interface. O backend multiplayer, quando envolvido, deve ser a autoridade de jogo.
5. **Sem mudanças indevidas.** Preservar modos solo e online existentes, não alterar contrato do servidor, saves, VPS ou deploy sem uma etapa específica e validação. Nada de merge automático na `main`.

## O que já existe

- [x] **CLASSIC-001 — Selecionar e atacar:** alvo único por clique/toque ou botão ATACAR, ataque automático com recarga e linha de visão no solo e nas salas Node compatíveis.
- [x] **CLASSIC-002 — Perseguição:** aproximação automática por A*, contorno de obstáculos, retomada e cancelamento; movimento manual tem prioridade.
- [x] **CLASSIC-003 — Battle List:** lista lateral recolhível de slimes vivos visíveis na câmera, indicador de vida e seleção da criatura pela linha.
- [x] **Catálogo mínimo de criaturas:** `CreatureCatalog.ts` separa os dados fixos do Slime do ID, posição e HP atual de cada instância. Battle List, combate e perseguição leem `CreatureView`. Novas espécies seguem como recortes separados.

- [x] **CLASSIC-004 — Movimento em tiles:** passos de 32 px por teclado, joystick e toque no exterior solo e nas salas Node compatíveis. Consulte [GAMEPLAY_CLASSICO.md](GAMEPLAY_CLASSICO.md) para as regras e testes.
- [x] **Progressão:** abates geram XP, níveis e aumento de vida máxima no solo e na sessão Node. Veja o [contrato de progressão](adr/0005-progressao-por-abates.md).
- [x] **Derrota e retorno no solo:** a derrota é salva e o jogador escolhe retornar à Vila da Travessia, com a vida cheia e o progresso preservado.

## Ciclo jogável essencial — etapas futuras, ainda não aprovadas

- [x] Loot privado, inventário de sessão e consumíveis autoritativos na sala Node. Veja [ADR 0007](adr/0007-inventario-da-sala.md).
- [x] Primeiro equipamento que altera dano e recarga. Veja [ADR 0008](adr/0008-espadas-e-recarga.md).
- [x] Painel com dez espaços, conjunto inicial e defesa de contato no solo e nas salas Node. Veja [ADR 0009](adr/0009-espacos-de-equipamento.md).
- [x] Diferenciar o tempo até o impacto das duas espadas e medir o efeito contra Slimes feridos e com vida cheia.
- [ ] Avaliar o ritmo de combate jogando antes de expandir equipamentos e atributos.
- [ ] Mana, vocações e magias quando os sistemas anteriores estiverem estáveis.
- [ ] Exploração com NPCs, cidade inicial e pequenas missões; expandir mapas só depois do ciclo funcionar.
- [ ] Adaptar as mecânicas consolidadas ao multiplayer, com regras autoritativas e testes de sincronização; planejar infraestrutura e escalabilidade depois de medir necessidades reais.

## Fora de escopo por enquanto

Os brainstormings antigos sobre **golpe forte, esquiva, salto, teia, chefes, eventos coletivos, múltiplos sistemas de combate, grandes clusters e metas extremas de escala** não são prioridades desta direção. Não incorporá-los sem um pedido explícito. O PR #42 é trabalho separado e **não é aprovação dessas mecânicas**.

## Critério de conclusão de cada microtarefa

- Regra de jogo isolada da interface e com testes unitários de estados-limite.
- TypeScript estrito, compilação Angular e testes automatizados aprovados.
- Playwright com jogabilidade e controles reais em desktop e Android (retrato e paisagem, quando pertinente).
- Nenhuma regressão dos modos existentes, saves e multiplayer; testes do servidor e Docker se a mudança os afetar.
- A pessoa responsável pelo jogo avalia se a sensação de jogar corresponde à direção desejada **antes de iniciar a próxima mecânica ou fazer merge**.

> O roadmap é uma lista de hipóteses e decisões em evolução, não uma obrigação de implementar tudo. O objetivo imediato é um núcleo de RPG clássico pequeno, coerente e testado.

## Marco da versão 1.0 — concluir o Cavaleiro antes das outras vocações

As quatro classes planejadas são **Cavaleiro**, **Paladino/Arqueiro**, **Druida** e **Feiticeiro/Mago (Sorcerer)**. A 1.0 começa por **um Cavaleiro jogável e polido**, sem criar os outros personagens antes de concluir o primeiro. Montarias são futuras.

Checklist de aceite do Cavaleiro 1.0:
- [x] Caminhada e perseguição em tiles, orientação e combate por alvo com preparo, recarga, distância e colisão
- [x] Herói procedural com caminhada, braços, pernas, espada, capa, rosto e efeitos de combate
- [x] Armas existentes com dano/preparo diferentes, equipamento com defesa e progressão de HP por nível
- [x] Primeira economia de alimentos, saciedade e cura ao longo do tempo; integração com Lina, solo e sala Node
- [ ] Jogar e corrigir poses em todas as direções, colisões visuais, ataques, hit feedback e troca de equipamento, no desktop e Android
- [ ] Balancear tempo de matar Slimes, dano recebido, consumo de comida/poções, custo e tempo de recuperação
- [ ] Exercitar morte, retorno, salvamento e sincronização online em sessão real; tratar desconexão e falhas no consumo
- [ ] Validar usabilidade e desempenho no celular e corrigir defeitos bloqueantes antes de marcar a 1.0 como concluída

A implementação dos itens marcados não certifica o lançamento, apenas indica mecanismos presentes. Não adicionar vocações, montarias ou mecânicas especulativas até a avaliação do cavaleiro.


### Inventário mobile do Cavaleiro 1.0

- [x] Mochila em grade com filtros de itens, detalhes por toque e comparação de equipamento baseada no estado verdadeiro
- [x] Dez slots ao redor da prévia do próprio renderHero, com giro do cavaleiro em quatro direções
- [x] Desktop exibe armaria e mochila lado a lado; celular alterna seções de toque acessíveis
- [ ] Elmos, escudos, armaduras e acessórios mudarem visualmente o herói no mundo e na prévia
- [ ] Definir capacidade real por células somente quando houver economia/loot que a exija; não confundir grade visual com capacidade de armazenamento
- [ ] Avaliar fluidez, ergonomia e toques em aparelhos Android reais antes de declarar a UI concluída

- [x] Peças do conjunto inicial (elmo, escudo, peitoral, botas, calça, mochila e pingente) desenhadas sobre o herói procedural, no mundo e na prévia, usando o estado real de equipamento
- [x] Aparência de outros cavaleiros equipados transmitida nos snapshots da sala Node, sem publicar os itens da bolsa
- [ ] Conferir cada conjunto em todas as direções, animação de caminhada, golpe, dano e colisão visual no Android
