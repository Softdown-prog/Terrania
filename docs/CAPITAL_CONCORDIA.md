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

## O que já existe
**Parte 1 — a planta** ([ADR 0055](adr/0055-capital-do-centro-planta.md)):
- Terreno: dentro da muralha só há rua (caminho) e grama, sem árvore, pedra nem água, em qualquer semente.
- Zona protegida: dentro da muralha (sem a muralha), vale para todos os monstros da superfície, como no Poço Negro e na Vila da Travessia.
- Nenhuma caverna nasce dentro da capital nem na terra limpa em volta.

**Parte 2 — muralha, portões e torres** ([ADR 0056](adr/0056-capital-muralha-portoes-torres.md)):
- A muralha de calcário com ameias (134 peças), os dois **Grandes Portões** de 9 tiles, com a grade erguida, lanternas e o brasão do sol dourado, e **8 torres redondas**: 4 de canto com telhado cônico de ardósia e pendão azul, e 4 de portão com coroa de ameias e o estandarte da capital.
- A muralha e as torres **bloqueiam** o herói de verdade; só se entra pelos portões.
- A arte mora na pasta da região central (`src/render/center/`), com cores próprias: calcário claro, ardósia, o azul e o dourado da capital.
- Os terrenos dos edifícios ainda **não** bloqueiam: sem a arte deles, seria parede invisível.

**Parte 3 — piso, praça e monumento** ([ADR 0057](adr/0057-capital-piso-praca-monumento.md)):
- As ruas ganham **granito escuro** em fiadas de pedra com meio-fio de calcário na beira do gramado; a Praça dos Povos, **lajes de calcário** claras com a **rosa dos ventos** de pedra incrustada (anéis azuis e dourados e oito raios) em volta do monumento.
- O **monumento da Concórdia** no centro da praça: estrado de três degraus, **cinco pilares com a gema e o pendão de cada povo** (Centro, Norte, Sul, Leste e Oeste) e, no meio, o sol dourado da capital. É a ideia da conciliação: cinco povos em volta de uma mesma luz.
- O monumento **bloqueia** o herói (72 px de raio); anda-se livre em volta dele.

## O que vem depois
1. Edifícios, por bairro (um arquivo por edifício, na pasta da região central), com a colisão ligada junto; a Cidadela dos Povos primeiro.
2. Moradores e diálogos, interiores, missões e o serviço de cada guilda.
3. Tochas e fogo nos portões e nas torres.

Ver [ADR 0055](adr/0055-capital-do-centro-planta.md), [ADR 0056](adr/0056-capital-muralha-portoes-torres.md) e [ADR 0057](adr/0057-capital-piso-praca-monumento.md).
