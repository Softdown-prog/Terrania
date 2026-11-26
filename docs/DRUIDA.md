# A vocação Druida

**Proposta** do dono (2026-11-26), no mesmo molde do Mago ([MAGO_CAJADOS.md](MAGO_CAJADOS.md), [MAGO_ROUPAS.md](MAGO_ROUPAS.md), [MAGO_APARENCIA.md](MAGO_APARENCIA.md)). **Todos os números, nomes e escolhas abaixo são propostas que o dono ajusta.** **Nada está feito ainda:** este documento define o que será feito e em que ordem. O dono pediu: a vocação, as magias, o que ele usa como arma (ainda não definido), as roupas de pele de animais, o uso de mana e o inventário próprio.

## Onde estamos hoje
- Existem duas vocações jogáveis, o **Cavaleiro** e o **Mago** (`HERO_CLASS_IDS`). O Druida e o Arqueiro só aparecem hoje como nome de prédio da capital (a Irmandade dos Arqueiros) e como ideia no roteiro das quatro vocações.
- O Mago deixou o caminho pronto: ficha da vocação (`HeroClassSheet`: espaços de equipamento, mana, vida), inventário com espaços e nomes próprios, roupas por vocação com nível mínimo, aparência por vocação (`HeroLook`), tela de escolha do herói, mana e barra de mana. O Druida reaproveita tudo isso.

## O papel
Guardião da natureza: **apoio, cura e controle**, com **mana** (como o Mago) e **formas de animal**. Combate à distância curta e média. Não é um Mago verde: onde o Mago causa dano alto de longe, o Druida **prende, envenena, cura e se transforma**.
- **Vida:** 90% da do Cavaleiro no mesmo nível (o Mago tem 80%).
- **Mana:** como o Mago (50 no nível 1, mais 10 por nível), mas **volta mais depressa fora das cavernas** (a natureza ajuda): +25% de recarga ao ar livre, nada de bônus no subsolo.
- **Comida devolve mana** (vale também para o Mago; frente própria na lista).

## A arma (decisão do dono pendente)
Três opções; a **recomendada** é a primeira:
1. **Bordão** (cajado de madeira viva, mais curto e grosso que o do Mago): ataque à distância média (5 tiles), um tiro de **seiva e espinhos** com efeito natural (veneno, lentidão, raízes). Mesma estrutura dos cajados: onze bordões, um por nível, cada um com o seu arquivo e o seu desenho.
2. **Garras e foice de lua:** luta de perto, mais forte nas formas de animal.
3. **Totem:** a arma é um totem que o Druida finca no chão e que dispara sozinho; ele em si se defende e cura.

## As magias
Duas camadas, como o Mago (a magia do cajado e as especiais):
- **Magia do bordão** (o ataque básico, gasta mana por tiro, efeito conforme o bordão).
- **Magias especiais** (recarga própria, custo de mana alto), aprendidas por nível, uma tecla ou botão cada:

| Nível | Magia | O que faz |
| ---: | --- | --- |
| 8 | **Folhas Curativas** | cura 25% da vida em 4 s |
| 15 | **Raízes Prensas** | prende os monstros em volta por 3 s |
| 25 | **Enxame** | nuvem de insetos que envenena quem está dentro por 6 s |
| 35 | **Forma de Lobo** | +50% de velocidade e golpes de garra por 20 s |
| 50 | **Forma de Urso** | +50% de vida máxima e defesa dobrada por 20 s; ataque de perto |
| 70 | **Chamado da Floresta** | invoca um lobo companheiro por 30 s |
| 90 | **Tempestade Natural** | chuva de espinhos numa área, cura aliados (o herói) |

## As roupas: pele de animais
Mesma regra das roupas do Mago: **onze conjuntos** (nível mínimo, um por bordão), **oito espaços** (cocar ou capuz, colar de dentes e garras, anel de osso ou madeira, peitoral, arma, totem de mão no lugar do escudo, calça e botas), cada peça no seu arquivo, com bônus de mana, recarga e dano e defesa média (o Druida usa pele, mais defesa que a túnica do Mago e menos que a armadura). Os conjuntos seguem os animais do mundo: **Coelho** (1), **Raposa** (10), **Veado** (15), **Javali** (20), **Lobo** (30), **Urso Pardo** (45), **Urso Polar** (60), **Leão** (70), **Mamute** (80), **Grifo** (90) e **Dragão Menor** (100). O desenho segue o do Mago (ficha de cor por conjunto e enfeite próprio: pelos, presas, plumas).

## O desenho do personagem
Aparência própria, como a do Mago: rosto marcado e cabelo longo trançado com **pinturas de folha no rosto**, pés descalços até o conjunto de botas, sem chapéu: um **cocar de chifres e folhas** aparece nos conjuntos altos. Envelhece menos que o Mago (não ganha barba branca; ganha mais trança, pinturas e adornos).

## O inventário
Espaços do Druida: cocar, colar, anel, peitoral, bordão, totem de mão, calça e botas (sem mochila e sem flechas, como o Mago). Os conjuntos aparecem na mochila só no nível deles. A tela de escolha do herói ganha o Druida.

## Os lotes (proposta)
1. **D1:** a vocação (ficha, vida, mana, escolha do herói, inventário, save) e o **primeiro bordão** com a magia básica.
2. **D2:** o desenho do personagem (corpo e cabeça) e o conjunto inicial de pele (Coelho).
3. **D3:** os dez bordões restantes, em lotes de três.
4. **D4:** as magias especiais, uma ou duas por lote.
5. **D5:** os outros dez conjuntos de pele, três por lote.
6. **D6:** as formas de animal (lobo, urso) com o desenho próprio.

## Decidido por enquanto (as opções recomendadas)
O **bordão** como arma (opção 1); 90% de vida; recarga de mana maior ao ar livre; magias especiais por nível como na tabela; roupas de pele nos onze conjuntos acima. O dono ajusta quando quiser; antes de começar o D1, preciso do **sim** dele à arma (bordão, garras ou totem).
