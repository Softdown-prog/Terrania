# Poço Negro — cidade murada dos Ermos do Sul

Referência visual: imagem de cidade do deserto enviada nesta conversa (arte de referência,
não importada como textura). A implementação usa Canvas 2D procedural, a iluminação
vem de cima/esquerda e o negro da água é azul ardósia, jamais preto puro.

## Localização no mundo
- Centro fixo em **(tile X 0, tile Y 15500)**, na estrada norte–sul já existente;
  escala de **56 × 48 tiles**, maior que a Travessia já expandida (39 × 31).
- Muros em torno de X -28..27 e Y 15476..15523.
- **Portão das Presas**: meio do muro norte (Y 15476); **Portão dos Ossos**:
  meio do muro sul (Y 15523). Os cinco tiles centrais formam passagens livres.
- Estradas de argila no eixo central; ramais externos levam às dunas, ao
  oásis e ao Obelisco Soterrado. Não foram criados teletransportes artificiais.

## Quatro bairros
| Quadrante | Instalações |
| --- | --- |
| Noroeste | Fortaleza do Poço, casas de argila, guarda |
| Nordeste | Bazar das Raridades, Casa de Venenos e tendas |
| Sudoeste | Fornalha dos Trolls, Hospedaria Sombra do Escorpião, Estábulo |
| Sudeste | Templo do Sol Negro, Ossuário, Arena das Dunas |

Centro: **Poço Negro**, poço físico com água escura, corrente e crânio
de verme, rodeado por calçamento de pedra sombria. Fachadas de argila,
ameias de osso e bandeiras vinho; tochas roxas/verdes, bronze e areia.
A arena é somente cenário nesta etapa.

## Jogabilidade existente
- A área interna é segura: as duas espécies-base e os monstros regionais
  usam `protectedSurfaceTile` para impedir perseguição, ataques normais,
  magias, espinhos refletidos e explosões. Fora dos muros não há proteção.
- Colisão determinística: paredes, edifícios e poço bloqueiam passagem, mas
  os dois portões não. O Go experimental espelha terreno, portões e colisão.
- **12 habitantes** têm diálogos próprios e aparência regional, com adaga,
  balança, frasco ou chicote; Hesh e Zinha patrulham.
- Apenas **Fortaleza, Fornalha e Hospedaria** possuem interiores caminháveis,
  usando a mesma simulação e teclado/toque do restante do jogo.

## Serviço existente
- **Hospedaria Sombra do Escorpião:** Madame Víbora cobra **4 de gel** por um descanso que
  cura toda a vida e remove os status (ADR 0022). Não cobra de quem já está bem.

## O que NÃO foi implementado
- Venda/compra de loot raro no Bazar e Ossuário;
- Alquimia e comércio de itens na hospedaria (o **descanso pago** existe: ver abaixo);
- Montarias lagarto ou escaravelho no estábulo;
- Cultos, missões de corrupção do poço, combate de arena;
- Uma caverna fixa de brejo junto ao muro (o bioma de brejo fica na
  transição sudeste e possui geração própria).

Esses são marcos de evolução, não funcionalidades simuladas por texto.
NPCs mencionam os rumores sem recompensas ou estados de missão falsos.

## QA
Executar `npm run architecture:check && npm run typecheck && npm test && npm run build`
e a suíte Go; conferir visual de distritos, portões e interiores no Playwright
desktop/Android. O QA bot inicial permanece focado na Travessia;
`runQaBot({region:"south"})` permite iniciar uma auditoria local da cidade.
