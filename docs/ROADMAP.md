# Terrania — Roadmap enxuto de RPG clássico

> **Direção atual:** RPG 2D de fantasia medieval inspirado nas *mecânicas* dos MMORPGs clássicos (sensação de Tibia antigo), mas com mundo, nomes, arte, interface e código próprios. Não reproduzir ativos ou conteúdo de terceiros.
>
> **Status:** planejamento alinhado em 04/11/2026. Esta versão está **somente na branch experimental** `feat/terrania-classic-combat-20261104`. Não representa aprovação de PR, merge ou deploy. O plano anterior foi preservado em [ROADMAP_ANTERIOR_20261104.md](ROADMAP_ANTERIOR_20261104.md).

## Princípios que guiam as próximas tarefas

1. **Jogo primeiro, infraestrutura depois.** Primeiro criar um ciclo de jogo compreensível e divertido em modo solo; integrar multiplayer, persistência e otimizações grandes quando os sistemas de jogo estiverem claros.
2. **Uma mecânica pequena por vez.** Implementar, testar em navegador e no Android, avaliar jogabilidade e só então escolher a próxima. Não desenvolver dezenas de recursos de um brainstorming por inércia.
3. **Alvo e ação clássicos.** Selecionar monstro no mapa ou Battle List, perseguir por caminho navegável e atacar automaticamente dentro do alcance, respeitando bloqueios, cooldown e morte.
4. **Angular apresenta o HUD; Phaser mostra o mundo; a simulação aplica regras.** Não duplicar estado nem lógica de ataque na interface. O backend multiplayer, quando envolvido, deve ser a autoridade de jogo.
5. **Sem mudanças indevidas.** Preservar modos solo e online existentes, não alterar contrato do servidor, saves, VPS ou deploy sem uma etapa específica e validação. Nada de merge automático na `main`.

## O que já existe nesta branch experimental

- [x] **CLASSIC-001 — Selecionar e atacar:** alvo único por clique/toque ou botão ATACAR, ataque automático com cooldown e linha de visão. Somente `?modo=classico`.
- [x] **CLASSIC-002 — Perseguição:** aproximação automática por A*, contorno de obstáculos, retomada e cancelamento; movimento manual tem prioridade.
- [x] **CLASSIC-003 — Battle List:** lista lateral recolhível de slimes vivos visíveis na câmera, indicador de vida e seleção da criatura pela linha.

**Limitação atual:** a simulação ainda movimenta o jogador continuamente; usar tiles no planejador não equivale a caminhar em passos discretos. A Battle List conhece apenas slimes. Estes três recortes estão na branch de experimento, **não declarados entregues em produção**. Consulte [GAMEPLAY_CLASSICO.md](GAMEPLAY_CLASSICO.md) para as regras implementadas e testes.

## Próximo recorte possível — escolher e validar um de cada vez

- [ ] **Movimento clássico em tiles:** experimento CLASSIC-004 implementado na branch com opção `?modo=classico&passos=1`, ainda sujeito à avaliação de jogabilidade em Android e desktop. O movimento normal permanece o padrão; colisão, joystick, toque e perseguição devem ser reavaliados antes de aprovar a mudança.
- [ ] **Catálogo mínimo de criaturas:** definir tipos de monstro separados das instâncias (ID, posição, HP atual), inicialmente Slime e depois outra espécie somente se necessário ao teste. Tornar Battle List e combate independentes da classe `Slime`.

**Importante:** estes itens são *candidatos*, não autorização para implementá-los simultaneamente. A cada etapa deve existir uma definição curta do comportamento esperado, critérios de teste e uma decisão de continuar ou ajustar.

## Ciclo jogável essencial — etapas futuras, ainda não aprovadas

- [ ] Morte/respawn, cura e retorno ao jogo com regras consistentes.
- [ ] XP, níveis e atributos básicos ao derrotar monstros; começar com uma fórmula simples testável.
- [ ] Loot, inventário e uso de consumíveis sem duplicação de itens.
- [ ] Equipamentos básicos e atributos que influenciem combate; balancear antes de expandir.
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
