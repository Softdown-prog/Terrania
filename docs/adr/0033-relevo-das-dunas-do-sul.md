# ADR 0033 — Acabamento visual, fatia 1: relevo das dunas do Sul

**Estado:** entregue em 2026-11-11, direto na `main` por pedido do dono. Abre a campanha de acabamento visual ([docs/QUALIDADE_VISUAL.md](../QUALIDADE_VISUAL.md)).

## Contexto

Quase tudo no jogo nasceu como protótipo. O dono pediu para elevar a qualidade onde formos mexendo, igualando o mundo ao nível dos monstros e das espadas. A auditoria com capturas do jogo real mostrou o Sul bem abaixo disso. O maior ponto de diferença, e o mais visível, é o **chão do deserto**: cada tile era pintado com uma cor lisa (mistura de ruído) e **um traço curto por tile**, o que dava um ondulado repetido, sem dunas, com faixas verticais nas emendas e até uma **concha do mar** no deserto.

## Decisões

1. **Relevo contínuo, em arquivos próprios** (`src/render/south/terrain/dunes/`): `field.ts` (altura do terreno como função pura da posição, com perfil assimétrico de duna: sobe devagar pelo lado do vento e cai rápido na face de deslizamento, dunas grandes e pequenas, ondulações do vento), `palette.ts` (rampas de cor da sombra funda ao realce), `shade.ts` (sombreamento por luz de **noroeste**, como no resto do jogo) e `relief.ts` (a camada do chunk).
2. **Sem costura:** o campo é global (mesma posição, mesma altura em qualquer chunk), então chunks vizinhos se encaixam. A camada é recortada pelo mapa de tiles do bioma, ampliado com suavização, o que dá uma borda macia onde o bioma acaba.
3. **Dois visuais:** `dunes` (areia, contraste alto) e `ruins` (terra batida, mais cinza e relevo suave).
4. **Custo controlado:** o sombreamento usa uma amostra a cada 4 px e é ampliado com suavização. Medido no navegador: o relevo custa cerca de 4,6 ms por chunk (o chunk inteiro, cerca de 13 ms; com 2 px por amostra eram 17 ms só de relevo, e foi descartado).
5. **Limpeza:** saem o traço chapado por tile e a concha do mar no deserto; um seixo raro com sombra ocupa o lugar. A classe `Grid` do pintor de terreno passa a ter campos explícitos (antes usava "parameter properties", que o Node não carrega nos testes), sem mudar comportamento.
6. Sem mudança de mundo, colisão, geração, save, Go ou servidor.

## Verificação

- `tests/south-dunes.test.ts` (11 testes): um assunto por arquivo; campo determinístico, limitado e dependente da semente; **continuidade** em linhas longas nos dois eixos (nenhum salto, em qualquer ponto); **assimetria** da duna (a subida é mais longa e a queda mais íngreme); sombreamento determinístico e só com cores da rampa; **sem costura** na borda de chunks vizinhos; **luz de noroeste** (o lado voltado para ela é mais claro); rampas ordenadas e a terra batida mais cinza e suave; a camada só existe onde há duna, é recortada pelo mapa suave e some sem Canvas completo; e o `generateChunkCanvas` completo, rodado num Canvas gravador, desenha a camada a 90 % de opacidade e volta a 1, usa o visual de terra batida onde o bioma é `ruins` e não monta nada num chunk sem duna.
- Mutações conferidas (todas reprovadas): perfil simétrico, luz invertida (constante e fórmula), costura no campo (também na posição do chunk), não montar a camada, não recortar pelo mapa, terra batida com o visual da duna, trocar o bioma, relevo com opacidade zero, sem restaurar a opacidade, sem desenhar a camada e passar a resolução de 4 para 2 px.
- `tests/browser/south-dunes.spec.ts` (desktop e Android) é **teste de fumaça**: o deserto abre, desenha areia e não dá erro. Ele **não** prova o relevo: tentei uma métrica de "sombra" e ela passava mesmo com o relevo desligado, então foi descartada; a regressão está nos testes unitários acima.
- Capturas antes e depois do deserto, da ruína e da torre, desktop, no jogo real.

## Limites

- Só o chão mudou nesta fatia. As pedras (cinza com musgo verde), a falta de decoração do deserto, as estradas (marcas de roda sempre horizontais), o lago negro, as ruínas, a cidade e as cavernas continuam na lista de [QUALIDADE_VISUAL.md](../QUALIDADE_VISUAL.md).
- A faixa da estrada principal continua com o visual antigo e a emenda com a areia segue abrupta (item 2 da lista).
- Não verificado: Android físico (o jogo roda no emulador do Playwright).
