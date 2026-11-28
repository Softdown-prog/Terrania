# Pendências do Terrania — a lista única

**Para que serve.** O dono tem muita coisa escrita nos documentos que ainda não foi feita, e pediu que **nada se perca** quando se escolhe uma coisa. Esta é a lista única: tudo o que está proposto e não está pronto, **com o documento onde está o detalhe**. Quem trabalha no jogo (pessoa ou IA) confere esta lista no começo e no fim de cada entrega, e **sempre que uma frente avança, anota aqui**. Escolher uma frente não apaga as outras: elas continuam aqui, na ordem.

**Como se trabalha a lista.** Uma fatia pequena por vez, com teste que falha sem a mudança, suíte completa e documento, como sempre. Ao terminar uma fatia, passa-se à **próxima da fila** (a ordem abaixo, ajustável pelo dono a qualquer momento), alternando as frentes para nenhuma ficar parada muito tempo. Se o dono pede uma coisa específica, ela passa na frente, e a fila segue depois dela.

Estado: **feito** · **em andamento** · **a fazer** · **espera o dono** (falta uma decisão dele).

## 1. As cidades

| Frente | Estado | O que falta | Detalhe |
| --- | --- | --- | --- |
| **Vila da Travessia** (onde se nasce e se renasce) | em andamento | Contorno orgânico das manchas de mata e areia (hoje macio, mas ainda de grade); lagoas pequenas de borda reta; feira, hortas, praça com bancos, muralhas leves e portões previstos; missões do plano de expansão | [VILA_INICIAL.md](VILA_INICIAL.md), [ADR 0107](adr/0107-transicao-suave-do-solo.md) |
| **Concórdia** (capital do Centro, a uns 800 tiles ao norte da Vila) | em andamento | ~~Moradores andando pelas ruas~~ (feito, ADR 0108); jogabilidade (distâncias entre os serviços); os **13 terrenos vazios** só ganham edifício quando o dono definir a função de cada um (hoje são parques); funções do Conselho, do Quartel e das guildas | [CAPITAL_CONCORDIA.md](CAPITAL_CONCORDIA.md), [CAPITAL_EDIFICIOS.md](CAPITAL_EDIFICIOS.md), [ADR 0106](adr/0106-vida-na-capital.md), [ADR 0108](adr/0108-moradores-da-capital.md) |
| **Cidade do Leste** (porto, docas, farol) | a fazer | Planta, edifícios, NPCs, missões, no molde da capital e do Poço Negro | [VILA_INICIAL.md](VILA_INICIAL.md), [BESTIARIO_LESTE.md](BESTIARIO_LESTE.md) |
| **Cidade do Oeste** (fortaleza, minas, forjas) | a fazer | idem | [VILA_INICIAL.md](VILA_INICIAL.md), [BESTIARIO_OESTE.md](BESTIARIO_OESTE.md) |
| **Cidade do Norte** (aldeia de caçadores, torre) | a fazer | idem | [VILA_INICIAL.md](VILA_INICIAL.md), [BESTIARIO_NORTE.md](BESTIARIO_NORTE.md) |
| Poço Negro (Sul) | feito | — | [POCO_NEGRO.md](POCO_NEGRO.md) |

## 2. As vocações (personagens)

| Frente | Estado | O que falta | Detalhe |
| --- | --- | --- | --- |
| **Druida** | espera o dono | Antes do D1, o **sim** dele à arma: **bordão** (recomendado), garras e foice, ou totem. Depois D1 a D6: a vocação e o primeiro bordão; o desenho; os dez bordões; as sete magias especiais; os onze conjuntos de pele; as formas de lobo e urso | [DRUIDA.md](DRUIDA.md) |
| **Arqueiro** | em andamento | **Feito:** ficha, vida, agilidade e cartão bloqueado (ADR 0109); Arco de Caça, flecha de junco e aljava (0110); o tiro na superfície e na caverna (0111); a flecha que voa e o impacto (0112); o inventário e as lojas (0113); o corpo do Arqueiro (A2a, 0114); o arco nas mãos e a pose de atirar (A2b, 0116). as regras da flecha de ferro, da compra e da escolha da flecha (A3a, 0117); a Irmandade dos Arqueiros na capital, com porta, salão, Mestre Orlan e tela de compra (A3b, 0118). e a **liberação** do Arqueiro na tela de escolha (0119); a troca de arco por nível e os arcos de Chifre, Teixo e Osso (A4a, 0120); os arcos de Brasa, Espinheiro e Boreal (A4b, 0121). **Falta:** A4c e A4d os quatro arcos restantes; A5 as habilidades; A6 os onze conjuntos de roupa | [ARQUEIRO.md](ARQUEIRO.md), [ADR 0109](adr/0109-arqueiro-a1a-vocacao.md), [ADR 0110](adr/0110-arqueiro-a1b-arco-e-flechas.md), [ADR 0111](adr/0111-arqueiro-a1c-o-tiro.md), [ADR 0112](adr/0112-arqueiro-a1c-a-flecha-que-voa.md), [ADR 0113](adr/0113-arqueiro-a1c-inventario.md), [ADR 0114](adr/0114-arqueiro-a2a-corpo.md), [ADR 0116](adr/0116-arqueiro-a2b-arco-e-pose.md), [ADR 0117](adr/0117-arqueiro-a3a-flechas-e-compra.md), [ADR 0118](adr/0118-arqueiro-a3b-irmandade-dos-arqueiros.md), [ADR 0119](adr/0119-arqueiro-liberado.md), [ADR 0120](adr/0120-arqueiro-a4a-arcos-e-troca.md), [ADR 0121](adr/0121-arqueiro-a4b-arcos-brasa-espinheiro-boreal.md) |
| **Mago: magias especiais** (além do ataque do cajado) | a fazer | Definir em documento e implementar em lotes | [MAGO_CAJADOS.md](MAGO_CAJADOS.md) |
| **Mago: roupas** | a fazer | Lote B2 (Rocha Viva), B3 (Marés), C (Brasa Rubra, Espinheiro, Geada Boreal), D (Sol Nascente, Lua Negra, Tempestade) e o conjunto do Astral | [MAGO_ROUPAS.md](MAGO_ROUPAS.md) |
| **Mago: aparência** | a fazer | M2: barba e cabelo que envelhecem e o nível no desenho; M3: o corpo que se fortalece, rugas e a mensagem de nível | [MAGO_APARENCIA.md](MAGO_APARENCIA.md) |
| **Cavaleiro 1.0** | a fazer | Elmos, escudos, armaduras e acessórios mudando o visual do herói; balancear o combate e a comida; jogar e corrigir poses e colisões visuais; validar no celular | [ROADMAP.md](ROADMAP.md) |
| **Roupas e cajados como prêmio** de missões e achados no mapa (não só compra e nível) | a fazer | Ligar às missões novas | — |

## 3. As regiões: criaturas, cavernas e masmorras

| Frente | Estado | O que falta | Detalhe |
| --- | --- | --- | --- |
| **Leste** (hoje 4 criaturas, meta de ~20) | a fazer | L1 a L6: comuns e praia; médios de terra e costa; aquáticos e elites; o Capitão Fantasma e o Kraken Filhote; a masmorra do Leste (3 andares) e o Leviatã; mutantes | [BESTIARIO_LESTE.md](BESTIARIO_LESTE.md) |
| **Oeste** (hoje 4) | a fazer | L1 a L6: goblins, gnomos e cão-de-pedra; anões e fortaleza; gárgula, troll e ogro; golems; wyvern, gigante e dragões; a masmorra do Oeste e o Dragão Ancião | [BESTIARIO_OESTE.md](BESTIARIO_OESTE.md) |
| **Norte** (hoje 6) | a fazer | L1 a L6: fauna comum, morsa e foca; esquimós e bárbaros; golem de neve, troll e elemental; fantasma, espectro e cavaleiro congelado; gigante e dragão jovem; a masmorra do Norte e o Dragão Boreal | [BESTIARIO_NORTE.md](BESTIARIO_NORTE.md) |
| **Cavernas das outras regiões** | a fazer | As do Centro já têm 5 andares, tocas, baús, missão e coleta; as dos outros temas ainda são pequenas e simples (relato do dono) | [ADR 0101](adr/0101-toda-gruta-das-raizes-e-masmorra.md) a [0105](adr/0105-pontos-de-coleta.md) |
| **Centro** | feito (bestiário, masmorra) | Planta maior da masmorra (hoje 42 × 30 tiles) | [BESTIARIO_CENTRO.md](BESTIARIO_CENTRO.md) |
| **Missões regionais** (Norte, Leste, Oeste) | a fazer | Escoltar caravanas e a torre congelada; o farol e a rota entre ilhas; as minas e as masmorras antigas | [VILA_INICIAL.md](VILA_INICIAL.md) |

## 4. As montarias

| Frente | Estado | O que falta | Detalhe |
| --- | --- | --- | --- |
| **Variedade** (simples, difíceis, raras, fáceis de conseguir) | a fazer | Hoje há 10 montarias; só a quest do Garrano é jogável | [MOUNTS.md](MOUNTS.md) |
| **Quests 2 a 10** | a fazer | Cada uma exige uma peça real do mundo (barco, pesca, furtividade, ritual lunar, planado, ponto de interesse); selas e iscas; combate montado; cura do unicórnio; areia movediça e gelo; navegação oceânica | [MOUNTS.md](MOUNTS.md) |

## 5. Qualidade e infraestrutura

| Frente | Estado | O que falta | Detalhe |
| --- | --- | --- | --- |
| **Chão e visual do mundo** | em andamento | Contorno orgânico das transições de solo; lagoas pequenas; outros acabamentos da lista de qualidade | [QUALIDADE_VISUAL.md](QUALIDADE_VISUAL.md) |
| **Integração contínua lenta e instável** | em andamento | Os testes de navegador que esperam e andam falham quando a máquina está lenta (a execução 743 estava 1,9× mais lenta); `cave-floors` falhou de novo (execução do A1c-3) e agora solta a tecla dentro da página e mostra o trajeto no erro ([ADR 0115](adr/0115-ci-masmorra-solta-a-tecla-na-pagina.md)); falta endurecer os demais | [ADR 0107](adr/0107-transicao-suave-do-solo.md) |
| **Bot de QA** | a fazer | Ganhar as criaturas e regiões novas a cada lote | [QA_BOT.md](QA_BOT.md) |

## Como esta lista é mantida
Cada entrega que fecha ou avança uma frente atualiza a linha dela aqui e cita o ADR. Nada sai da lista sem estar **feito** ou sem o dono dizer que não quer mais. Uma frente nova que o dono pedir entra aqui antes de qualquer outra coisa.
