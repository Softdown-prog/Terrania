# Contrato de arte procedural

Vale para **qualquer autor, humano ou IA** (Claude, ChatGPT, Codex, outro). Existe para que duas IAs entreguem a mesma qualidade sem que uma refaça o trabalho da outra. As regras que uma máquina consegue conferir estão em `tests/art-contract.test.ts` e rodam em `npm test`; o resto depende de revisão visual e está marcado como tal.

## O princípio: qualidade são camadas, não linhas

Em arte procedural, desenhos ricos costumam ter muitas linhas, mas **linhas não são o objetivo**: 500 linhas de repetição são pior que 80 bem escolhidas. O que separa um desenho acabado de um esboço é um conjunto de camadas, sempre na mesma ordem. Um item de 30 linhas quase sempre falha por *pular camadas* (sem contorno, sem sombra, uma cor só), não por ser curto. Por isso o contrato exige as camadas e fixa pisos mínimos; ele não pede volume por si.

**Peça de referência:** [`src/render/reference/barrelReference.ts`](../src/render/reference/barrelReference.ts) (~110 linhas, comentadas por camada). Copie a **estrutura**, não os números. É auditada como qualquer peça do jogo.

## As nove camadas (nesta ordem)

1. **Sombra de contato** — `softShadow` antes de qualquer forma, para ancorar a peça no chão.
2. **Silhueta orgânica** — caminho com curvas (`quadraticCurveTo`, `arc`, `ellipse`). Retângulo e círculo puros só para o que é de fato reto.
3. **Volume** — gradiente atravessando a forma, indo de luz para base e sombra.
4. **Detalhe de material, recortado na silhueta** — `clip()` e então tábuas, escamas, costuras, veios. Cada elemento com tom próprio derivado de `shade()`.
5. **Peças secundárias com acabamento de 3 passadas** — contorno, cor base e fio de luz (como os aros do barril).
6. **Oclusão ambiente** — escurecer onde a forma encontra o chão ou outra peça.
7. **Contorno escuro único** — separa a peça de qualquer fundo.
8. **Detalhes de profundidade** — o que dá leitura 3D (tampa vista de cima, aro interno, olhos, fivelas).
9. **Brilho especular por último**, sempre do lado da luz.

## Paleta e luz

- Cada material é uma **rampa de 3 tons**: `light`, `base`, `dark`. Variações vêm de `shade(base, ±0.1)` e `mix()` (`src/render/draw.ts`), não de hex novo solto.
- A luz vem da **esquerda e de cima**, em todas as peças.
- Contorno: `#142a2a`. Brilho: `#fff6dc`. Reutilize; não invente um preto puro.
- Reutilize as primitivas de `draw.ts` (`ellipse`, `limb`, `pill`, `softShadow`, `rgba`, `shade`, `mix`) antes de escrever as suas.

## Forma da função

- Assinatura: `(ctx, …dados, sx, sy, time?)`. **A origem é o ponto de contato com o chão.**
- `ctx.save()`/`ctx.restore()` **balanceados**. Um `restore` a mais desempilha o estado de quem chamou (esse bug já existiu em `renderSlime`).
- **Determinística:** sem `Math.random`, `Date.now`, `performance.now`. Variação por `hashString(id)` / `hash2`. O mesmo id sai sempre igual. O tempo entra por parâmetro.
- **100 % procedural:** sem imagens, `fetch`, caminhos de arquivo `.png/.svg`. (`document.createElement("canvas")` é permitido apenas para cache de sprite.)
- Sem estado global mutável; sem ler DOM, Angular, rede ou armazenamento. O render só desenha o que o motor mandou: **nunca decide dano, loot ou regra.**
- Animação é matemática pura e testável (`animation.ts`, `heroPose.ts`), com teste em `tests/`. Respeite a opção de efeitos do jogador.
- Peça alta e estática: pinte uma vez num canvas de cache e carimbe (como `scenery.ts`). Medir no Chromium desktop **e** Android; não presumir desempenho pelo build.

## Portão automático (o que `npm test` confere)

Cada peça registrada em [`tests/helpers/artAssets.ts`](../tests/helpers/artAssets.ts) é desenhada num gravador de chamadas de Canvas e medida. Os pisos são ~80 % do pior caso das peças boas atuais; **a fonte única dos números é o arquivo**, não esta tabela:

| Categoria | Operações de pintura | Cores | Gradientes | Traços | Curvas |
| --- | ---: | ---: | ---: | ---: | ---: |
| `character` (herói, NPC) | 25 | 20 | 2 | 4 | 20 |
| `creature` (slime…) | 14 | 8 | 1 | 2 | 30 |
| `prop` (pedra, barril, item) | 11 | 10 | 1 | 2 | 3 |
| `structure` (casa, árvore…) | 28 | 15 | 1 | 0 | 6 |

Além dos pisos, para **toda** peça: um tom bem escuro (contorno/sombra, luminância ≤ 0,20) e um claro (brilho, ≥ 0,85); `save`/`restore` iguais; desenha algo visível; **mesmas chamadas em duas execuções**. Regras estáticas em todo `src/render` e `CanvasScene.ts`: sem aleatório/relógio/imagem/rede. Todo `render*`/`draw*` exportado precisa estar registrado em `ASSETS` (com categoria) ou justificado em `NOT_AN_ASSET`. Um teste garante que um círculo chapado de uma cor **reprova** em todas as categorias.

**Peça nova = registrar em `ASSETS` na mesma entrega.** Subir um piso exige que todas as peças existentes continuem passando. Baixar um piso para uma peça nova passar não é permitido: melhore a peça.

## O que o portão NÃO mede

Mede estrutura e esforço, **não beleza**. Também **não cobre os ícones SVG** do inventário (`src/app/item-icon.component.ts`): o gravador mede chamadas de Canvas, e o SVG não passa por ele; esses ícones dependem de revisão visual até existir um portão próprio. Dá para enganá-lo repetindo chamadas inúteis, e ele não vê cores que combinam mal, proporção errada ou uma silhueta feia. Por isso a entrega também exige revisão visual (abaixo). Não use o verde do teste como prova de que "ficou bom".

## Sinais de preguiça (rejeitar na revisão)

- Uma forma chapada de cor única; sem contorno; sem sombra de contato.
- Várias cores sem relação de rampa (hex soltos, sem `shade`/`mix`).
- Brilho desenhado antes do contorno, ou luz vindo de lados diferentes na mesma peça.
- Sem `save/restore` ao mexer em `translate`, `scale`, `clip` ou `globalAlpha`.
- Valores copiados da peça de referência sem adaptar à forma.
- Função nova sem registro em `ASSETS`, ou categoria escolhida só para passar nos pisos.
- Resolver uma peça com pouco código e dizer que "o ícone é simples": a pergunta é se as camadas aplicáveis existem.

## Entrega de uma peça (uma peça por PR)

1. Registrada em `tests/helpers/artAssets.ts` com a categoria certa.
2. `npm run architecture:check`, `npm run typecheck`, `npm test`, `npm run build` verdes.
3. **Captura das peças sobre o fundo do jogo**, gerada por `npm run art:preview` (grava `test-results/art-preview/pecas.png` com todas as peças registradas, ampliadas) e anexada ao PR; para uma peça com variante `faded` ou de estado, acrescente uma captura própria. Sem captura, a revisão visual não acontece. Se o navegador do Playwright não estiver instalado, use `CHROMIUM_PATH=/caminho/do/chromium`.
4. Se tem animação ou muda desempenho: medição no Chromium desktop e Android.
5. Uma frase por camada dizendo o que a peça faz em cada uma (ou por que não se aplica).

## Divisão de trabalho entre IAs

O portão é **o mesmo para todos**. A divisão sugerida é por **módulo dono** (`architecture/modules.json`), não por "quem cria e quem refatora": cada IA entrega peças prontas dentro do contrato no módulo em que trabalha, e a revisão é do portão e da captura, não de reescrever o estilo da outra. Quem decide a divisão é o responsável pelo projeto.

## Bloco para colar no início de qualquer pedido de arte

```text
Siga rigorosamente docs/CONTRATO_ARTE_PROCEDURAL.md. Antes de escrever, leia
src/render/reference/barrelReference.ts e src/render/draw.ts.
- Aplique as 9 camadas na ordem (sombra de contato, silhueta com curvas, volume com
  gradiente, detalhe de material com clip, peças secundárias em 3 passadas, oclusão,
  contorno único #142a2a, detalhes de profundidade, brilho #fff6dc por último).
- Rampa de 3 tons por material; variações com shade()/mix(); luz da esquerda e de cima.
- Sem Math.random/Date.now/imagens; variação por hashString(id); origem no chão;
  save/restore balanceados.
- Registre a peça em tests/helpers/artAssets.ts e rode npm test até passar. Não baixe
  pisos nem edite as regras do contrato para passar.
- Entregue com a captura de `npm run art:preview` (e uma extra para estados/variantes) e uma frase por camada.
Não diga que está pronto sem mostrar a saída do teste e a captura.
```
