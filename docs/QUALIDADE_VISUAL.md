# Campanha de acabamento visual

O jogo foi montado como protótipo; agora cada área em que mexemos sobe para o nível dos monstros e das espadas
(material, volume, luz de noroeste, detalhe secundário, contorno). Regra do dono: **elevar a qualidade onde se
mexer**, uma fatia por entrega, sempre com captura do jogo real (desktop e Android) antes e depois.

## Auditoria (2026-11-11, jogo real, Sul)

Referência de qualidade: monstros (`src/render/creatures/`), espadas (`src/render/swords/`), a Travessia
(grama, flores, árvores, casas). O Sul ficou abaixo disso, nesta ordem de impacto:

| # | Área | O que se vê hoje | Estado |
| --- | --- | --- | --- |
| 1 | Chão do deserto (dunas e terra batida) | cor lisa e um traço repetido por tile; sem relevo; concha do mar no deserto | **feito** (ADR 0033) |
| 2 | Estradas e trilhas | marcas de roda sempre horizontais, mesmo em estrada vertical; emenda abrupta com a areia | **feito** (ADR 0034) |
| 3 | Pedras do deserto | a mesma pedra cinza com musgo verde em todo lugar; falta arenito | **feito** (ADR 0035) |
| 4 | Decoração do deserto | só pedras: faltam cacto, capim seco, ossos, rastros (peças registradas no contrato de arte) | **feito** (ADR 0036; rastros ficaram de fora) |
| 5 | Lago negro | costa em degraus de tile, sem borda irregular nem areia úmida suave | **feito** (ADR 0039) |
| 6 | Ruínas | peças pequenas e chapadas | **feito** (ADR 0040) |
| 7 | Torres (exterior) | volume bom, superfície plana, pouco detalhe de desgaste | **feito** (ADR 0041) |
| 8 | Cidade do Poço Negro | pavimento roxo chapado, edifícios pequenos e planos ao lado dos personagens | **partes 1 a 4a feitas** (piso e praça, ADR 0042; os doze prédios, ADR 0043 e 0044; muralha, portões, torres e poço, ADR 0049); faltam os objetos de feira e vida (tendas, barracas, tochas, ossos, barris, palmeiras, placas, arena, curral) e a areia |
| 9 | Cavernas (piso e formações) | linguagem de protótipo; as poças da Gruta Luminosa se repetem | pendente |

## Como entregar uma fatia

1. Capturar o jogo real antes (desktop e Android) e olhar ao lado de um monstro ou espada.
2. Peça nova: um arquivo por peça, registrada em `tests/helpers/artAssets.ts` e dentro do contrato de arte
   (sem baixar pisos). Terreno contínuo: campo puro + sombreamento puro + camada por chunk, testáveis em Node.
3. Medir o custo de um chunk novo (o jogo gera chunks de forma síncrona) e manter a geração barata.
4. Teste de regressão que **falhe sem a mudança**, mutações conferidas, captura depois e ADR.
