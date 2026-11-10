# ADR 0018 — Andares de caverna e masmorras do Sul

**Estado:** fatia 2 do projeto do Sul entregue em 2026-11-10 (a fatia 1 é o [ADR 0017](0017-ruinas-e-lago-negro-do-sul.md)).

## Contexto

Toda caverna tinha um andar só e os moradores saíam de uma lista única por tema. O dono pediu cavernas de 2 a 3 andares, torres, masmorras e monstros espalhados no Sul, e pediu que **cada coisa tenha o seu arquivo e a sua pasta, por região**, sem juntar assuntos num arquivo só. Esta fatia entrega o **motor de andares** e as **duas primeiras masmorras do Sul**; as torres reaproveitam o mesmo motor.

## Decisões

1. **Dados de masmorra num módulo próprio, `src/dungeons/`**, com uma pasta por região e **um arquivo por masmorra** (`south/cripta-das-dunas.ts`, `south/masmorra-do-brejo.ts`). Só nome do andar, espécies, número de encontros e chefe. Fica fora de `world` porque cita espécies de `monsters` (a regra de camadas de `world` é "só importa `world`"). Registrado como módulo `dungeons`, no teste de camadas, no portão de determinismo e na fronteira de domínio. `tests/dungeons.test.ts` confere que existe **um arquivo por masmorra** e nenhum solto.
2. **A planta do andar saiu de `CaveRoom.ts` para `world/caveFloor.ts`** (ADR 0014, sessão 3c), em commit à parte e sem mudar nenhum mapa (`tests/cave-floor.test.ts`: impressão digital de 12 cavernas, 2 por tema, tirada antes). A planta ganhou `floorIndex`, `floorCount` e a escada para baixo. O andar 1 mantém o sal de sempre; os de baixo têm o seu.
3. **Escadas:** a saída fica sempre no mesmo lugar (`CAVE_EXIT`); no andar 1 leva à superfície e **nos de baixo sobe um andar**. A escada para baixo fica na câmara do fundo (`CAVE_STAIRS_DOWN`), numa clareira de 7 × 5 tiles sempre ligada por corredor, e não existe no último andar. Quem desce chega ao pé da escada de saída; quem sobe chega ao lado da escada de descida, **fora do alcance** dela para não descer de volta.
4. **Masmorras:** Cripta das Dunas (cavernas do deserto, 3 andares, ou 2 na versão curta sorteada pela entrada; chefe Verme da Areia Carniceiro) e Masmorra do Brejo (cavernas do sudeste, 2 andares; chefe Hidra de Lodo). Os encontros de cada andar vêm da tabela do andar, ficam longe das escadas e de quem chega, e o chefe espera na câmara do fundo. Cavernas **sem masmorra** (norte, leste, oeste, centro e a gruta tutorial) continuam com 1 andar e o comportamento de sempre.
5. **Motor de troca de andar em arquivo próprio** (`engine/rooms/caveStairs.ts`): decide o movimento (descer, subir, sair) e cria o andar de destino levando vida, comida e condições do herói. Os derrotados continuam derrotados porque os ids carregam o andar. O `Game` só chama; `caveMode.ts` só decide pela escada pisada.
6. **Escada de descida com arte própria** (`render/caveStairsDownArt.ts`): poço escuro com degraus que estreitam e escurecem, aro de pedra e lampião de ferro; registrada como `prop` nos seis temas. O mapa interno marca a descida com uma seta violeta.

## Verificação

- Testes unitários: 12 novos (`cave-floor`, `dungeons`, `cave-floors`). Mutações conferidas: chefe em todo andar, saída do andar 2 que sai da caverna, chegada sem olhar de onde veio (o primeiro teste de chegada era fraco e foi reforçado) e escada de descida em parede reprovam.
- Teste de navegador `tests/browser/cave-floors.spec.ts` (desktop e Android): entra numa Cripta de 3 andares, desce, sobe e sai pela mesma entrada.
- Três testes antigos foram **atualizados, não enfraquecidos**: o travamento de layout do motor (um arquivo novo em `rooms/`), o total de módulos do MCP (19) e o teste de segunda onda de monstros, que agora varre todos os andares das cavernas em vez de só o primeiro, pois as espécies passaram a se espalhar por andar.

## Limites

- **Sem torres ainda** (a próxima fatia reaproveita este motor) e o **loot raro dos chefes** vem só das fichas existentes.
- A tabela de monstros do andar 1 do deserto mudou (agora é a lista do andar, não o sorteio com preferência por comuns). Os monstros continuam sendo espécies que moram em cavernas do deserto.
- No teste de navegador os monstros entram como derrotados; **a jogabilidade contra eles nos andares não foi medida**. Num teste anterior, sem isso, o herói travou perto da saída com monstros em volta, o que é combate normal, mas vale jogar.
- Não verificado: Android físico, desempenho no aparelho.

## Próximas fatias

Torres de 2 a 3 andares (Torre do Vigia Caída, Torre da Miragem, Torre do Sol Negro), masmorras do Norte, Leste e Oeste (uma pasta e um arquivo cada), monstros nos lagos e nas ruínas, loot raro dos chefes.
