# ADR 0060 — Capital dos povos humanos, parte 5: a Alameda das Guildas

**Estado:** entregue em 2026-11-19, direto na `main`, por pedido do dono ("vamos continuar com os edifícios"). Quinta parte da capital (ADR 0055 a 0058): os quatro edifícios do segundo bairro, com a colisão de cada um ligada junto da arte, como na Cidadela.

## Decisões

1. **Quatro edifícios**, um por arquivo, cada um ocupando o terreno inteiro e com a porta ao sul (a mesma geometria da Cidadela, então o `HallKit`, a entrega à câmera e o preparo de sprites servem sem mudança):
   - **Irmandade dos Arqueiros** (`archers.ts`, 12 × 13 tiles): pavilhão de caça de madeira aparente sobre soco de pedra, telhado de telhas de madeira, empena sobre a porta, **torre de vigia de galeria aberta e telhado cônico verde** sobre a cumeeira, alvos de treino de cinco aros e carcazes na parede, suporte de arcos, fardos de feno e o brasão do arco e flecha. O **verde-floresta** é a cor da guilda do arqueiro.
   - **Hospedaria dos Viajantes** (`inn.ts`, 11 × 13): estalagem de madeira aparente de telhado de barro, **duas chaminés que fumegam**, águas-furtadas acesas, quatro janelas de luz quente com venezianas e floreiras, alpendre de **toldo listrado**, a placa da cama e da caneca num braço de ferro, mesas, barris e uma roda de carroça.
   - **Casa da Moeda e dos Mercadores** (`mint.ts`, 11 × 13): banco de pedra de dois andares; **arcada de cinco arcos** com um balcão de feira e toldo em cada vão, o arco do cofre com a porta de ferro e ouro, janelas de grade com moldura dourada, a **grande moeda do sol** sobre a cornija, telhado de ardósia com cumeeira dourada e cata-vento em forma de moeda, a balança de ouro.
   - **Templo da Concórdia** (`temple.ts`, 11 × 13): nave de **mármore claro** de telhado de **cobre cinzento-esverdeado**, pórtico de quatro colunas sob o frontão do sol, seis vitrais, **campanário de arcos abertos com o sino**, agulha de cobre com o sol de ouro, dois braseiros acesos nos degraus.
2. **Kit de madeira, toldos e arcadas** (`buildings/timber.ts`, classe `TimberKit`, compõe o `HallKit`): parede de madeira aparente (reboco entre vigas, mãos-francesas em X, soco), venezianas, floreira, toldo listrado (o número de listras vem da largura), arcada, placa pendurada, barril, caixote, saco, fardo, chama e fumaça. Cores novas em `palette.ts`: verde-floresta, telha de madeira, de barro e de cobre, mármore, reboco, viga e as listras do toldo.
3. **Colisão ligada.** `CAPITAL_BUILT` passa a ter os oito terrenos (Cidadela e Alameda); o bloqueio é o terreno inteiro de cada um, como na parte 4. Os 13 terrenos sem edifício (Quarteirão dos Ofícios e Bairro Residencial) seguem livres. As peças da capital passam a 143.
4. **Contrato de arte:** os quatro estão registrados como `structure` e passam sem baixar nenhum piso.

## Verificação

- `tests/center-capital-alameda.test.ts` (8): lista e desenho de cada um; **o que distingue cada edifício, por contagem exata** (alvos e brasões e janelas e floreiras dos Arqueiros; chaminés, as doze listras do toldo, mesas e a roda da Hospedaria; cinco arcos, quatro toldos de sete listras, cofre e as duas moedas da Casa da Moeda; quatro colunas, seis vitrais, campanário, dois sóis e os braseiros do Templo) e que cada um só usa as cores da sua guilda; o kit de madeira (montantes a cada 32 px, travessas, mãos-francesas só nos vãos pares, venezianas, floreira, toldo, arcada, placa, peças pequenas, chama e fumaça).
- Os testes gerais dos edifícios (`center-capital-buildings.test.ts`) passaram de quatro para oito: geometria, bloqueio nas quatro bordas, todo tile dos oito bloqueia e a frente das portas e as ruas ficam livres, alcance e entrega à câmera, tudo dentro do sprite, cache e preparo de um sprite por quadro. Testes ajustados: 143 peças, o terreno livre de exemplo agora é o das Forjas.
- Mutações: ver o fim deste arquivo.

## Memória e desempenho

- Pintar cada edifício leva de 4 a 8 ms na máquina de teste (ops: 4.500 a 5.300; 75 a 88 degradês), pelo mesmo caminho do telhado sem recorte do ADR 0058.
- **Correção de uma estimativa do ADR 0058.** Lá escrevi que os 21 edifícios somariam "perto de 40 MB". A conta certa, pelo tamanho de cada sprite (em dobro de resolução, 4 bytes por pixel), dá **26,6 MB para os oito de agora** (de 2,8 a 4,2 MB cada, média 3,3) e **uns 70 MB para os 21**. Num celular de 4 GB isso pesa. Antes de terminar a capital, os sprites precisam ser **soltos da memória quando o herói sai da cidade** (e repintados na volta), sem cortar nenhuma arte (ADR 0054). Fica registrado como a próxima providência de desempenho.

## Limites

- As portas ainda não abrem (sem interiores, moradores nem serviços), e as lanternas, a fumaça e os braseiros são fixos (sem animação).
- Faltam 13 terrenos: os do Quarteirão dos Ofícios e do Bairro Residencial. Esses têm a porta ao **norte**, então serão vistos de trás (a face dos fundos), um desenho novo.
- Android físico não foi testado.
