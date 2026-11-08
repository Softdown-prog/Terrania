# Renderizador e UI adaptável

**Papel:** CanvasScene e módulos de render desenham mundo, entidades e efeitos; GameUi é a fronteira com o HUD.

`Game` traduz o estado do herói e as interações com o mundo para dados de leitura em `GameUi`. A interface recebe vida, posição em tiles, quantidades da bolsa e as ações conversar, ler ou entrar. O orquestrador executa os comandos e atualiza o HUD.

**Ponto de entrada:** consulte [registro central](../../architecture/modules.json) e o índice gerado em [docs/INDEX.md](../../docs/INDEX.md). Os caminhos de código completos são listados automaticamente; não repetir listas manuais aqui.

**Ao alterar:** Preservar contratos de render e tratar zoom, câmera e resize.

**Verificação:** Playwright desktop/Android, smoke render e build.

**Limites:** Não tratar renderização como fonte autoritativa de estado de jogo.

**Pose do herói:** `heroPose.swordSwing` usa os mesmos tempos do combate para alinhar a espada ao alvo no instante autorizado de impacto. Não decide dano. Os pés seguem a velocidade real enquanto o torso acompanha o alvo; a arma muda a ordem de desenho ao olhar para o norte. A apresentação online usa o relógio do buffer de snapshots.

**SAC visual integrado:** `tests/browser/app.spec.ts` confere em Chromium real (desktop e perfil Android) se a saída final do `canvas#game` contém pixels variados/opacos do mundo, rejeita um Canvas sintético vazio com o mesmo avaliador e repete a observação após movimento e resize para paisagem. Também registra dimensões da captura contra a largura CSS e o `devicePixelRatio`. Esta prova observa frames efetivamente mostrados pelo Phaser, mas **não** compara igualdade de pixels entre sementes, nem certifica arte, FPS, colisões ou todos os dispositivos físicos.

**Profundidade de terreno procedural:** `terrain.ts` calcula faixas rasas e espuma nas bordas de água usando vizinhos por coordenadas globais, além de cascalho discreto em trilhas e areia. O acabamento é rasterizado uma vez no cache dos chunks, sem sprites externos, animações adicionais, alteração de colisão ou mudança de seed. `tests/world.test.ts` valida a máscara de margem, incluindo fronteiras entre chunks e coordenadas negativas. Conferir o aspecto visual em Chromium desktop/Android antes do merge.
