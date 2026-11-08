# Renderizador e UI adaptável

**Papel:** CanvasScene e módulos de render desenham mundo, entidades e efeitos; GameUi é a fronteira com o HUD.

`Game` traduz o estado do herói e as interações com o mundo para dados de leitura em `GameUi`. A interface recebe vida, posição em tiles, quantidades da bolsa e as ações conversar, ler ou entrar. O orquestrador executa os comandos e atualiza o HUD.

**Ponto de entrada:** consulte [registro central](../../architecture/modules.json) e o índice gerado em [docs/INDEX.md](../../docs/INDEX.md). Os caminhos de código completos são listados automaticamente; não repetir listas manuais aqui.

**Ao alterar:** Preservar contratos de render e tratar zoom, câmera e resize.

**Verificação:** Playwright desktop/Android, smoke render e build.

**Limites:** Não tratar renderização como fonte autoritativa de estado de jogo.

**Pose do herói:** `heroPose.swordSwing` usa os mesmos tempos do combate para alinhar a espada ao alvo no instante autorizado de impacto. Não decide dano. Os pés seguem a velocidade real enquanto o torso acompanha o alvo; a arma muda a ordem de desenho ao olhar para o norte. A apresentação online usa o relógio do buffer de snapshots.

**SAC visual integrado:** `tests/browser/app.spec.ts` confere em Chromium real (desktop e perfil Android) se a saída final do `canvas#game` contém pixels variados/opacos do mundo, rejeita um Canvas sintético vazio com o mesmo avaliador e repete a observação após movimento e resize para paisagem. Também registra dimensões da captura contra a largura CSS e o `devicePixelRatio`. Esta prova observa frames efetivamente mostrados pelo Phaser, mas **não** compara igualdade de pixels entre sementes, nem certifica arte, FPS, colisões ou todos os dispositivos físicos.

**Arte procedural recuperada (`fc4d579`):** `draw.ts` contém primitivas visuais reutilizadas e `animation.ts` contém funções de passada, piscar e squash/stretch. `actors.ts` e `npcs.ts` desenham personagens; `terrain.ts` rasteriza o solo no cache dos chunks; `WorldRenderer.ts` desenha espuma de margem durante a animação. `Effects.ts` apresenta partículas, dano e rastro, sem autorizar golpes. A opção de efeitos deve continuar controlando animações decorativas, e alterações precisam ser medidas no Chromium desktop e Android (não presumir desempenho a partir do build). Tests de poses matemáticas ficam em `tests/hero-pose.test.ts`.


**Prévia do cavaleiro no inventário:** GamePageComponent reutiliza renderHero de actors.ts em Canvas separado quando a bolsa está aberta, limitando atualização a 20 FPS e cancelando animação ao fechar/destruir. O botão Girar alterna as quatro orientações e a arma equipada é repassada como attackWeapon, usando as animações procedurais existentes. Elmo, escudo, peitoral e outros equipamentos ainda não alteram o sprite do herói; apenas os slots, a defesa e a bolsa refletem seu estado. Não tratar preview como prova de equipamento visual terminado.

**Aparência de equipamento do Cavaleiro:** `renderHero` recebe `gear?: GearState` e desenha elmo, peitoral, escudo, botas, pernas, mochila e pingente como peças procedurais no mesmo corpo animado (sem Canvas de personagem paralelo). Elmo acompanha o rosto e deixa os olhos à mostra; escudo acompanha o antebraço livre; botas seguem os tornozelos de `gait`; peças sobrepostas respeitam a direção frente/costas. A tela de inventário passa o conjunto real de `HudService`, a cena do jogo recebe `Inventory.gear`; na sala Node, o snapshot de jogadores próximos transmite somente o equipamento visual de cada um, preservando as quantidades/recibos da bolsa como dados privados. Clientes antigos ignoram o campo opcional. Testes: `tests/browser/app.spec.ts`, `server/tests/room.test.ts`, `tests/snapshot-timeline.test.ts`. Verificar arte em dispositivo físico antes da aprovação.
