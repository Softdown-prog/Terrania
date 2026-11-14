# Concórdia — capital dos povos humanos (Terras da Travessia)

> **Nome de trabalho.** "Concórdia" é só a constante `CAPITAL.name` (`src/world/center/capital/layout.ts`) e este texto; trocar o nome não mexe em mais nada. Os nomes dos terrenos e dos bairros também são propostas para o dono ajustar.

## Contexto do mundo (resumo do que o dono contou)
Houve uma guerra e cada povo ficou com uma região. O **Centro** é a região dos povos humanos; o **Oeste** é a dos gigantes e das criaturas híbridas (umas bondosas, outras que não toleram humanos); o **Norte** é o frio, onde se abrigaram as criaturas que dependem dele; o **Sul** abriga as criaturas mais malignas (o Poço Negro); o **Leste** é a região das ilhas, dos piratas, das criaturas marítimas e das fábulas, com saqueadores e enganadores; um **pântano** vem a sudeste, perto do Sul (ainda não é uma região no código). Os heróis, cavaleiro, mago e arqueiro, são **exploradores** que rondam o mundo desvendando mistérios e tentando alguma conciliação, que como em todo RPG clássico nunca fecha de vez.

A capital é o lugar onde os povos humanos se governam e de onde saem os exploradores. A **Vila da Travessia** continua sendo o começo do jogo; a capital fica mais adiante, ligada pela estrada norte-sul.

## Localização
- Centro da praça em **(tile X −2, tile Y −800)**, na região central (peso 1 em toda a área), a uns 800 tiles ao norte da Vila da Travessia (cerca de 2,5 minutos andando).
- **80 × 64 tiles**, muralha incluída: X −42..37 e Y −832..−769. O X do centro (−2) fica entre as duas estradas da travessia que passam por ali (a reta e a que serpenteia), que entram pelo mesmo portão.
- **Grande Portão do Norte** e **Grande Portão do Sul**, de 9 tiles de largura cada, no meio dos muros norte e sul. A muralha tem 266 tiles fechados.
- Em volta da muralha há uma **faixa de 40 tiles de terra limpa**: sem lago, margem de areia, mata, pedra nem caverna.

## Ruas
Grande Avenida (norte-sul, 9 de largura), Avenida dos Povos (leste-oeste, 5), **Praça dos Povos** (23 × 23, com o monumento da Concórdia no centro), quatro Ruas das Muralhas em anel, Travessa dos Ferreiros e Travessa dos Mercadores (norte-sul) e Rua da Cidadela e Rua das Casas (leste-oeste).

## Quatro bairros e 21 terrenos
| Bairro | Terrenos |
| --- | --- |
| **Cidadela dos Povos** (norte) | Salão da Ordem dos Cavaleiros, Quartel da Guarda, Salão do Conselho dos Povos, Academia Arcana |
| **Alameda das Guildas** | Irmandade dos Arqueiros, Hospedaria dos Viajantes, Casa da Moeda e dos Mercadores, Templo da Concórdia |
| **Quarteirão dos Ofícios e Saberes** | Forjas da Travessia, Mercado Coberto, Arquivo dos Exploradores, Alquimia e Ervas |
| **Bairro Residencial e Cura** (sul) | Estábulo e Montarias, seis casas, Casa de Cura da Concórdia, Celeiros da Capital |

Uma guilda para cada herói: **cavaleiro, arqueiro e mago**. O **Arquivo dos Exploradores** é o coração dos mistérios: lá o que os heróis descobrem vira registro.

## O que já existe (parte 1: a planta)
- Terreno: dentro da muralha só há rua (caminho) e grama, sem árvore, pedra nem água, em qualquer semente.
- Zona protegida: dentro da muralha (sem a muralha), vale para todos os monstros da superfície, como no Poço Negro e na Vila da Travessia.
- Nenhuma caverna nasce dentro da capital nem na terra limpa em volta.
- A planta (`capitalBlocks`) já sabe quais tiles são muralha, fundação e monumento, mas **não está ligada à colisão**: sem a arte da muralha e dos edifícios, seria parede invisível.

## O que vem depois
1. Muralha, portões, torres, ligados à colisão (arte e colisão juntas).
2. Piso da cidade e praça com o monumento.
3. Edifícios, por bairro (um arquivo por edifício, na pasta da região central).
4. Moradores e diálogos, interiores, missões e o serviço de cada guilda.

Ver [ADR 0055](adr/0055-capital-do-centro-planta.md).
