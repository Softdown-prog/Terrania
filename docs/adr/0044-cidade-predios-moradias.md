# ADR 0044 — Acabamento visual, fatia 8 (parte 3): ossuário, estábulo e moradias da cidade

**Estado:** entregue em 2026-11-12, direto na `main` por pedido do dono ("sim, vamos lá"). Terceira parte da cidade do Poço Negro (piso e praça no ADR 0042, seis prédios de comércio e serviços no 0043). Com esta, **os doze prédios** têm pintor próprio.

## Contexto

Sobravam seis prédios no desenho antigo de retângulos: o Ossuário, o Estábulo de Lagartos, a Casa de Argila, a Tenda de Couro, o Casebre de Ossos e a Barraca sobre Estacas.

## Decisões

1. **Um pintor por prédio, cada um no seu arquivo** (`ossuary`, `stable`, `homeClay`, `homeHide`, `homeBone`, `homeStilts`), com o mesmo kit dos outros seis.
2. **O kit ganhou o que as moradias pedem:** `thatchRoof` (telhado de palha: fios inclinados em três tons, franja irregular no beiral, cumeeira amarrada), `hideRoof` (telhado de couro curtido: painéis costurados que se afinam para o alto, pontos de linha, remendos tracejados e o travessão de osso), `bone` (osso longo com haste e as duas cabeças) e `skull` (caveira pequena em escala). A paleta ganhou madeira, palha e couro.
3. **Identidade de cada um.** Ossuário: alvenaria cor de osso, friso de sete nichos fundos com uma caveira em cada, nove espetos de osso, duas urnas e pilha de ossos. Estábulo: tábuas, telhado de palha, baia escura com olhos de lagarto e meia-porta de madeira, fardo de feno, cocho com água e poste com argola. Casa de Argila: reboco com teto plano, oito pontas de viga aparecendo, janela redonda, varal de pimentas e potes. Tenda de Couro: cone vinho em painéis costurados com remendos, entrada de aba levantada, ossos cruzados no alto e franja de pelos. Casebre de Ossos: paredes de ossos longos deitados, telhado de couro, costelas de moldura e a caveira grande sobre a porta. Barraca sobre Estacas: quatro estacas com travessas em X, plataforma de tábuas, escada de mão, cabana de tábuas com telhado de couro e potes pendurados.
4. **O desenho antigo saiu.** A função `building` de `southCityArt.ts` foi removida; o cenário agora usa sempre o pintor novo (com cache de sprite) e só a chama é pintada por quadro. Um índice sem prédio não pinta nada.
5. **Posição, tamanho aproximado, porta e colisão dos prédios não mudaram.**
6. **Contrato de arte:** os seis novos estão registrados como `structure` (doze prédios no total, mais as duas composições com chama) e passam, sem baixar nenhum piso.

## Verificação

- `tests/south-city-homes.test.ts` (9 testes): o telhado de palha (fios, franja, cumeeira, sombra), o de couro (costuras crescem com a largura, remendos tracejados, travessão de osso), o osso (duas cabeças) e a caveira (cinco dentes, escala); e a identidade de cada prédio (sete caveiras menores, uma maior e uma no chão no ossuário; dois olhos de lagarto e cocho com água no estábulo; oito vigas e janela redonda na casa de argila; quatro remendos e entrada escura na tenda; 99 cabeças de osso e a caveira grande no casebre; quatro estacas de 6 × 16 px, plataforma e dois potes na barraca).
- `tests/south-city-buildings.test.ts` passou a cobrir os doze (arquivos, pintores, entradas: porta com maçaneta de bronze ou vão escuro na baia e na tenda, sprite por prédio, índice inválido sem desenho).
- Mutações conferidas (todas reprovadas): palha com poucos fios e sem cumeeira ou franja, couro com costuras fixas e sem remendos ou travessão, caveira sem dentes, osso de uma cabeça só, friso de cinco nichos, ossuário sem caveira no lintel, estábulo com um olho só e sem água, casa de argila com poucas vigas e com janela menor, tenda com dois remendos e com entrada de outra cor, casebre sem caveira e com metade dos ossos, barraca com duas estacas e com um pote só, e prédio sem pintor.
- Contrato de arte: doze prédios e duas chamas passam; determinismo exato.
- Captura dos doze prédios isolados e da cidade no jogo real.

## Limites

- Ainda no desenho antigo da cidade: o poço, as tendas, as barracas, as tochas, as placas, os cestos, a muralha, os portões, a arena e o curral, além da areia dentro dos muros (partes seguintes).
- Android físico não foi testado; a fumaça de navegador cobre o perfil Android emulado.
