# ADR 0041 — Acabamento visual, fatia 7: exterior das torres do Sul

**Estado:** entregue em 2026-11-12, direto na `main` por pedido do dono ("vamos para as torres"). Sétima fatia da campanha ([docs/QUALIDADE_VISUAL.md](../QUALIDADE_VISUAL.md)).

## Contexto

As três torres (Vigia Caída, Miragem, Sol Negro) tinham bom volume, mas a superfície era plana: a mesma textura de tijolo em toda a face, o lado direito de uma cor só, entulho feito de elipses, areia chapada e nenhum sinal de desgaste. Ao lado dos monstros e das espadas, pareciam peças de protótipo.

## Decisões

1. **O pincel é compartilhado, o desgaste é por material.** `TowerBrush` (`common.ts`) continua sendo o pincel de todas, e delega o que tem assunto próprio a arquivos novos, todos em `src/render/south/towers/`: `palette.ts` (cores, tipos e sorteio; `common.ts` os reexporta), `wear.ts` (desgaste), `blocks.ts` (entulho) e `sand.ts` (areia).
2. **Desgaste da alvenaria** (`TowerWear`): riscos de chuva que descem do topo (um a cada ~13 px de largura), covas de blocos soltos com a quina de baixo iluminada, líquen e a umidade que sobe do chão com crosta de sal. Cada torre usa o **tom do seu material**: arenito com líquen ocre e olivo (Vigia), azinhavre verde-azulado (Miragem, pedra clara) e musgo violeta e verde-petróleo (Sol Negro, basalto). A umidade só sobe no andar do chão, não nos degraus de cima do Sol Negro.
3. **Lado direito com volume:** degradê, fiadas em perspectiva (paralelas à aresta do topo) e riscos de chuva.
4. **Entulho de blocos** (`TowerBlocks`): blocos lapidados com três faces, contorno e sombra, e seixos miúdos entre eles (um de cada três), no lugar das elipses.
5. **Areia com volume** (`TowerSand`): montes com degradê e crista, e uma **rampa de areia encostada na parede** que sobe uns 7 px e some, deixando livre a faixa da porta (a entrada nunca fica soterrada).
6. **Detalhes de cada torre.** Vigia Caída: a espessura da parede à mostra nos dentes do topo quebrado (`crown`) e duas vigas caídas da plataforma ao pé da parede. Miragem: azinhavre escorrendo das três faixas de pedra e a luz violeta das janelas vazando para a pedra em volta. Sol Negro: faixas de brilho de obsidiana em cada degrau, fuligem do fogo violeta sobre os dois braseiros e fagulhas soltas.
7. **Geometria, posição, colisão e interior intactos.** Só o desenho do exterior mudou; as torres seguem pintadas uma vez em cache (`scenery.ts`) e continuam registradas no contrato de arte como `structure` (passam sem baixar piso).

## Verificação

- `tests/south-towers-art.test.ts` (7 testes): um assunto por arquivo; cada torre com desenho próprio, estável e equilibrado; desgaste (riscos por largura, covas, líquen, umidade; sempre na cor do tom de cada material); entulho (três faces, contorno, volume); areia (volume, crista, rampa que deixa a porta livre); o pincel aplicando o desgaste na face, no lado e só no chão; e o detalhe próprio de cada torre.
- `tests/south-towers.test.ts` passou a reconhecer os arquivos de apoio (`palette`, `wear`, `blocks`, `sand`) além de `index` e `common`, sem afrouxar a regra de um arquivo de pintor por torre.
- Mutações conferidas (todas reprovadas): face sem riscos, sem covas; umidade em todo andar; lado sem riscos e sem fiadas; entulho sem blocos; bloco sem contorno; rampa cobrindo a porta; areia sem crista; riscos de outra cor; cova sem quina de luz; topo sem espessura (no pincel e no uso); uma viga a menos; Miragem com desgaste de arenito; janelas sem luz na pedra; obsidiana sem brilho; braseiro sem fuligem.
- Contrato de arte: as três torres continuam passando; o determinismo segue exato.
- Captura antes e depois das três torres isoladas e da Torre do Vigia no jogo real.

## Limites

- O interior das torres (ADR 0021) não mudou.
- O desgaste é estático (cacheado): sem vento, poeira ou luz do dia em movimento.
- Android físico não foi testado; a fumaça de navegador cobre o perfil Android emulado.
