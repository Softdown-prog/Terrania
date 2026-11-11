# ADR 0034 — Acabamento visual, fatia 2: estradas, trilhas e marcas de roda

**Estado:** entregue em 2026-11-11, direto na `main` por pedido do dono. Segunda fatia da campanha ([docs/QUALIDADE_VISUAL.md](../QUALIDADE_VISUAL.md)).

## Contexto

O desenho de um tile de estrada era sempre o mesmo: duas linhas horizontais fixas (as "marcas de roda"), cinco pontinhos iguais e capim nas bordas. Por isso as marcas ficavam horizontais mesmo em estrada vertical, não se emendavam com o tile vizinho e a estrada não tinha nenhuma relação com a largura real. As estradas do jogo têm de 3 a 6 tiles (duas rotas se sobrepõem), então o meio tem todos os vizinhos também de estrada e a direção não se descobre olhando só os quatro vizinhos.

## Decisões

1. **Um assunto por arquivo** (`src/render/roads/`, o `index.ts` só reexporta): `types.ts` (contratos), `mask.ts` (máscara de "é estrada" do chunk com margem de 8 tiles), `profile.ts` (direção, largura e posição lateral do tile), `lanes.ts` (posição das rodas por faixa), `wobble.ts` (desvio e intensidade contínuos), `plan.ts` (que peças vão em cada tile), `surface.ts` (paleta de terra e de areia), `sprites.ts` (cache) e as três peças de arte `wheelRut.ts`, `roadStones.ts` e `roadVerge.ts`.
2. **A direção vem da própria estrada:** `roadProfile` mede as sequências de tiles de estrada em cada eixo. Estrada comprida e estreita corre na direção da comprida, e o tile sabe a largura e quanto está afastado do eixo. Cruzamento (as duas sequências compridas) e ponta ou curva (as duas curtas) não têm direção e não recebem marca de roda. Larguras de até 8 tiles são medidas; acima disso não se arrisca uma direção.
3. **Faixas de carroça:** uma faixa a cada 3 tiles de largura, com duas rodas (±0,4 tile) por faixa. Estrada de 3 tiles tem uma faixa, a de 6 tem duas.
4. **Sem costura:** a posição da marca (do eixo da estrada), o desvio lateral e a intensidade são funções contínuas da posição no mundo. O fim de um tile e o começo do seguinte dão exatamente os mesmos valores, a marca só afina onde há uma falha rara e macia, e nunca em agulha a cada poucos tiles.
5. **Três peças de arte registradas** (`prop`, no contrato de arte, sem baixar piso): marca de roda (sulco com sombra macia, leito batido, lábio claro do lado da luz de noroeste e lábio escuro do outro, pedrinhas, reflexo; nos dois eixos e nos dois materiais), pedras e cascalho cravados (sombra, volume, rachadura, contorno, reflexo) e a transição para a margem (capim com folhas inclinadas e lábio de terra, ou areia que escorre sobre o leito com marcas de vento e palha seca), girada para cada lado.
6. **Material pelo entorno:** terra batida onde a vizinhança é capim e mata, areia compactada onde é deserto.
7. **Custo:** as pedras e as bordas variam em poucos níveis (24) e saem de **sprites em cache** (teto de 512). As marcas, que variam de forma contínua, vão direto. Medido no navegador: um chunk com estrada passou de ~11 para ~14 ms (a máscara custa ~1,6 ms; sem a cache eram ~18 ms); chunk sem estrada não muda.
8. **Defeito corrigido durante a revisão visual:** a peça de pedras ignorava a posição dela no tile e as pedras caíam alinhadas no canto de cada tile; agora usam a posição planejada.
9. A classe `Grid` do pintor de terreno ganhou a máscara de estrada sob demanda. Sem mudança de mundo, colisão, save, Go ou servidor.

## Verificação

- `tests/roads.test.ts` (16 testes): arquivos por assunto; máscara (cobertura, orientação, fora de alcance); perfil para larguras de 1 a 8 em estradas verticais e horizontais, com o sinal certo do deslocamento, e cruzamento, ponta e curva sem direção; faixas (simétricas, dentro da estrada, determinísticas); ondulação e intensidade contínuas, firmes e com falhas raras; marcas no eixo certo e nenhuma em cruzamento; **emenda entre tiles vizinhos** (mesma posição, mesmo desvio e mesma intensidade na junção, nos dois eixos e em estradas largas, sem marca em dobro); marca dentro do tile e material pelo entorno; transição só nos lados certos e pedras dentro do tile; chunk de verdade (estrada vertical gira o eixo, horizontal não, sem estrada nada); desenho antigo removido; peças aguentam valores inválidos e giram o eixo só na vertical; pedras na posição planejada; cache (mesma chave, teto, descarte do mais antigo, sem Canvas) e, no chunk, bordas leste e oeste da estrada vertical, nenhuma ao norte ou ao sul, e cada sprite criado é de fato desenhado.
- Mutações conferidas (todas reprovadas, 26 no total): sinal do deslocamento, direção, largura, faixas, rodas, eixo, emenda (desvio e intensidade), posição lateral, marcas em cruzamento, material, mapa de borda, intensidade, desvio, marca não desenhada, perfil fixo, posição das pedras, cache (ignorar, teto, não guardar, níveis), sprite não desenhado e chave sem lado ou sem material. Nesse processo sobreviveram quatro mutantes de integração (sprites e chave); o teste de chunk passou a ver as chaves e os desenhos dos sprites.
- `tests/browser/roads.spec.ts` (desktop e Android): estrada vertical do deserto, horizontal do leste e vertical do norte abrem e desenham sem erro. É teste de fumaça; a prova das marcas está nos testes unitários.
- Capturas antes e depois (deserto, leste e norte), no jogo real.

## Limites

- Onde a estrada faz curva ou cruza, não há marca de roda (só leito, pedras e margens); uma curva desenhada à parte seria um próximo passo.
- Quando duas rotas se encostam com eixos que mudam de coluna, as marcas dão um degrau de um tile (raro).
- A estrada dentro das muralhas do Poço Negro tem pavimento próprio e não mudou.
- Não verificado: Android físico.
