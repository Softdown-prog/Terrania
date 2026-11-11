# ADR 0035 — Acabamento visual, fatia 3: pedras com estilo por bioma

**Estado:** entregue em 2026-11-11, direto na `main` por pedido do dono. Terceira fatia da campanha ([docs/QUALIDADE_VISUAL.md](../QUALIDADE_VISUAL.md)).

## Contexto

Toda pedra do jogo saía do mesmo pintor (`paintRock`, dentro de `scenery.ts`): cinza-esverdeada, com musgo verde no pé. O pintor não sabia em que bioma estava, então a pedra de musgo aparecia no meio do deserto. A revisão visual das capturas revelou ainda um defeito antigo: **todas as pedras tinham o mesmo formato**. A variação usada era o `decoration` do tile, e uma pedra só existe quando esse valor é menor que 0,022 no Sul (0,09 no Oeste); o sorteio de seis formatos caía sempre no primeiro.

## Decisões

1. **Estilo por bioma, um arquivo por assunto** (`src/render/rocks/`, o `index.ts` só reexporta): `types.ts` (os estilos e o número de formatos), `style.ts` (qual estilo cada bioma pede), `variant.ts` (a variação da pedra), `mossRock.ts` (o pintor da pedra de musgo, comum às regiões). A pedra de arenito só aparece no Sul e fica em `src/render/south/rocks/sandstoneRock.ts`.
2. **Pedra de arenito** (`dunes` e `ruins`): estratos em faixas de tons de areia com a junta escavada pelo vento, nichos de erosão, lado de sombra, areia amontoada no pé, contorno e reflexo, **sem nenhum verde**. Seis formatos: matacão, laje, pilar esculpido, dois blocos, arco baixo e um grupo de três pedras pequenas. As fendas são recortadas pela silhueta e nunca passam dela.
3. **A pedra de musgo é a de antes**, só que movida de `scenery.ts` para o seu arquivo (as seis assinaturas de desenho são idênticas às originais). Os demais biomas continuam com ela.
4. **Variação própria da pedra** (`rockVariant`: hash da posição e da semente), no lugar do `decoration`, que escolhia sempre o formato 0. Vale para os dois estilos, então a pedra de musgo do resto do mundo também passa a ter os seis formatos.
5. **Integração:** o renderizador de mundo põe `rockStyle` e a variação em cada pedra; o cenário escolhe o pintor pelo estilo e a chave do sprite leva o estilo (um sprite por estilo e formato, pintado uma vez). Quem não traz estilo continua com a pedra de musgo.
6. **Contrato de arte:** os seis formatos de cada estilo estão registrados como `prop` (12 peças), sem baixar nenhum piso.
7. `WorldRenderer` passou a ter o campo `seed` explícito (antes era "parameter property", que o Node não carrega nos testes), sem mudar comportamento. Sem mudança de mundo, colisão, save, Go ou servidor.

## Verificação

- `tests/rocks.test.ts` (10 testes): um assunto por arquivo; o mapa bioma→estilo para todos os biomas; a variação usa os seis formatos em centenas de pedras reais **e** o teste mostra o defeito de antes (o `decoration` dava um formato só); a pedra de musgo idêntica à original; a de arenito com seis desenhos diferentes, estáveis, equilibrados, **sem nenhuma cor esverdeada** (com a conferência de que o detector enxerga o verde da pedra de musgo) e tolerante a valores inválidos; o recorte das fendas; o número certo de pedras em cada formato; o renderizador de mundo com o estilo e a variação certos em chunks de deserto e de mata; e o cenário com um sprite por estilo e formato, pintado uma vez.
- Mutações conferidas (todas reprovadas): tirar ou acrescentar bioma de arenito, variação constante ou sem semente, mudar a pedra de musgo, estrato verde, fenda sem recorte, formato fora de faixa, grupo com pedra repetida, estilo fixo no mundo, variação do tile, chave de sprite sem estilo e pintor sempre de musgo.
- `tests/browser/rocks.spec.ts` (desktop e Android): deserto, ruína e oeste abrem e desenham sem erro (teste de fumaça).
- Capturas antes e depois no jogo real (deserto, ruína e oeste).

## Limites

- Pedras continuam sem colisão própria além do tile (a colisão não mudou). Outros biomas (neve, vulcânico, pico rochoso, brejo) ainda usam a pedra de musgo; o mapa de estilos está pronto para receber os próximos.
- A decoração do deserto (cacto, capim seco, ossos, rastros) continua pendente (item 4 da lista).
- Não verificado: Android físico.
