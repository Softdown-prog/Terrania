# Pendências do Terrania — a lista única

**Para que serve.** O dono tem muita coisa escrita nos documentos que ainda não foi feita, e pediu que **nada se perca** quando se escolhe uma coisa. Esta é a lista única: tudo o que está proposto e não está pronto, **com o documento onde está o detalhe**. Quem trabalha no jogo (pessoa ou IA) confere esta lista no começo e no fim de cada entrega, e **sempre que uma frente avança, anota aqui**. Escolher uma frente não apaga as outras: elas continuam aqui, na ordem.

**Como se trabalha a lista.** Uma fatia pequena por vez, com teste que falha sem a mudança, suíte completa e documento, como sempre. Ao terminar uma fatia, passa-se à **próxima da fila** (a ordem abaixo, ajustável pelo dono a qualquer momento), alternando as frentes para nenhuma ficar parada muito tempo. Se o dono pede uma coisa específica, ela passa na frente, e a fila segue depois dela.

Estado: **feito** · **em andamento** · **a fazer** · **espera o dono** (falta uma decisão dele).

## 1. As cidades

| Frente | Estado | O que falta | Detalhe |
| --- | --- | --- | --- |
| **Vila da Travessia** (onde se nasce e se renasce) | em andamento | Contorno orgânico das manchas de mata e areia (hoje macio, mas ainda de grade); lagoas pequenas de borda reta; feira, hortas, praça com bancos, muralhas leves e portões previstos; missões do plano de expansão | [VILA_INICIAL.md](VILA_INICIAL.md), [ADR 0107](adr/0107-transicao-suave-do-solo.md) |
| **Concórdia** (capital do Centro, a uns 800 tiles ao norte da Vila) | em andamento | Moradores andando pelas ruas; jogabilidade (distâncias entre os serviços); os **13 terrenos vazios** só ganham edifício quando o dono definir a função de cada um (hoje são parques); funções do Conselho, do Quartel e das guildas | [CAPITAL_CONCORDIA.md](CAPITAL_CONCORDIA.md), [CAPITAL_EDIFICIOS.md](CAPITAL_EDIFICIOS.md), [ADR 0106](adr/0106-vida-na-capital.md) |
| **Cidade do Leste** (porto, docas, farol) | a fazer | Planta, edifícios, NPCs, missões, no molde da capital e do Poço Negro | [VILA_INICIAL.md](VILA_INICIAL.md), [BESTIARIO_LESTE.md](BESTIARIO_LESTE.md) |
| **Cidade do Oeste** (fortaleza, minas, forjas) | a fazer | idem | [VILA_INICIAL.md](VILA_INICIAL.md), [BESTIARIO_OESTE.md](BESTIARIO_OESTE.md) |
| **Cidade do Norte** (aldeia de caçadores, torre) | a fazer | idem | [VILA_INICIAL.md](VILA_INICIAL.md), [BESTIARIO_NORTE.md](BESTIARIO_NORTE.md) |
| Poço Negro (Sul) | feito | — | [POCO_NEGRO.md](POCO_NEGRO.md) |

## 2. As vocações (personagens)

| Frente | Estado | O que falta | Detalhe |
| --- | --- | --- | --- |
| **Druida** | espera o dono | Antes do D1, o **sim** dele à arma: **bordão** (recomendado), garras e foice, ou totem. Depois D1 a D6: a vocação e o primeiro bordão; o desenho; os dez bordões; as sete magias especiais; os onze conjuntos de pele; as formas de lobo e urso | [DRUIDA.md](DRUIDA.md) |
| **Arqueiro** | a fazer | A1 a A6: a vocação, o primeiro arco e as flechas de junco; o desenho e a animação de atirar; os tipos de flecha e a compra na Irmandade dos Arqueiros; os dez arcos; as habilidades; os onze conjuntos | [ARQUEIRO.md](ARQUEIRO.md) |
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
| **Integração contínua lenta e instável** | em andamento | Os testes de navegador que esperam e andam falham quando a máquina está lenta (a execução 743 estava 1,9× mais lenta); `cave-floors` já foi consertado; falta endurecer os demais | [ADR 0107](adr/0107-transicao-suave-do-solo.md) |
| **Bot de QA** | a fazer | Ganhar as criaturas e regiões novas a cada lote | [QA_BOT.md](QA_BOT.md) |

## Como esta lista é mantida
Cada entrega que fecha ou avança uma frente atualiza a linha dela aqui e cita o ADR. Nada sai da lista sem estar **feito** ou sem o dono dizer que não quer mais. Uma frente nova que o dono pedir entra aqui antes de qualquer outra coisa.
