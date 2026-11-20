# ADR 0061 — Soltar da memória os sprites dos edifícios quando a câmera se afasta da capital

**Estado:** entregue em 2026-11-20, direto na `main`. É a providência de desempenho anunciada no ADR 0060, antes de construir os 13 edifícios que faltam. Qualidade primeiro (ADR 0054): nenhuma arte foi cortada nem simplificada.

## O problema
Cada edifício da capital é um sprite grande no cache (de 2,8 a 4,2 MB, em dobro de resolução). Os oito de agora somam **26,6 MB** e os 21 somarão **uns 70 MB** (a estimativa de 40 MB do ADR 0058 estava errada, corrigida no ADR 0060). Até aqui, depois de pintado, o sprite ficava na memória para sempre, mesmo com o herói a 800 tiles da cidade, na Vila ou no Poço Negro. Num celular de 4 GB isso pesa.

## Decisões
1. **`releaseSprite(chave)`** (`props/spriteCache.ts`): zera a largura e a altura do canvas, para o navegador devolver a memória **na hora** (e não quando o coletor de lixo quiser), e esquece a chave, então o próximo pedido pinta de novo, num canvas novo.
2. **`releaseCapitalSprites(câmera, tela)`** (`center/capital/warm.ts`) solta os sprites dos edifícios quando **nenhuma peça da capital poderia estar na tela, nem numa tela 4.000 px maior** (`CAPITAL_RELEASE_SLACK`), usando a mesma regra que entrega as peças ao desenho (`capitalPropsInView`). Isso garante duas coisas: **nunca solta um sprite que está sendo desenhado** (desenhar um canvas solto dá `InvalidStateError` no navegador, conferido no Chromium) e **não pinta e solta na beirada**: o preparo começa com a câmera a 28 tiles da muralha e o soltador só age uns 2.000 px (uns 60 tiles) além de onde a cidade deixa de poder aparecer, então ir e voltar não repinta.
3. **Ligação por região**: `releaseRegionSprites` (em `props/registry.ts`, soma o que cada região soltou, uma linha por região que tenha sprites grandes) é chamado por `CanvasScene` a cada quadro, logo depois do preparo e **antes** de as peças serem entregues ao desenho. Longe da cidade a conta é só uma comparação de distância (o cálculo de visibilidade sai na primeira checagem), então não custa nada por quadro.
4. **Ao voltar**, o `warmCapitalSprites` já existente repinta **um por quadro**, antes de a cidade aparecer. Quem nasce dentro da cidade é pintado na hora, como antes.

## Verificação
- `tests/capital-sprite-release.test.ts` (6): o cache solta, zera o canvas, esquece a chave e repinta num canvas novo (e sem Canvas não há o que soltar); perto nada é solto, longe os oito, e ao voltar um por quadro; **varredura de 5 tamanhos de tela (de 412 a 7.680 px) e centenas de câmeras**: solta se, e só se, nenhuma peça poderia estar na tela maior, e nunca um sprite que estaria à vista; a histerese (onde o preparo começa o soltador nunca age, e ele age num pixel exato, uns 2.000 px além); entradas inválidas; o registro soma as regiões; depois de soltos, os edifícios voltam a ser desenhados pelo cenário; e a cena chama o soltador a cada quadro, antes de entregar as peças.
- `tests/browser/capital-sprite-release.spec.ts` (desktop e Android, **Chromium de verdade**): os sprites reais dos oito edifícios são pintados (com arte de verdade), soltos (todos os canvases vão a 0 × 0), repintados em canvas novos do mesmo tamanho e desenham sem erro; e desenhar um solto dá `InvalidStateError`.
- Mutações (19 de código e 1 de navegador): zerar só a largura, não esquecer a chave, devolver verdadeiro sem sprite, folga zero ou de 1.000, só a largura ou só a altura aumentada, o limite do número de peças, tamanho de tela inválido, esquecer o último edifício, não contar o que soltou, somar errado entre regiões, lista de soltadores vazia, e tirar ou inverter a chamada na cena. Uma sobreviveu na primeira rodada (somar contra atribuir era indistinguível com uma região só) e virou uma função de soma testada com dois soltadores de mentira.

## Limites
- Não medi o ganho em um aparelho real: o teste confirma que o canvas vai a zero e que a memória pode ser devolvida, não quantos MB o celular recupera. Fica na lista de medir num celular de 2018.
- Só os sprites dos edifícios são soltos. As outras peças da capital (muralha, portões, torres, monumento) são poucas e pequenas, e os chunks do mapa já têm cache de tamanho fixo.
- O sprite repintado ao voltar custa de 4 a 8 ms por edifício, espalhado em um por quadro.
