# ADR 0066 — Tela de escolha do herói (Cavaleiro e Mago)

**Estado:** entregue em 2026-11-23, direto na `main`, por pedido do dono: "uma tela de introdução onde o jogador pode escolher os diferentes tipos de personagens, e se for jogador novo poder escolher com qual personagem vai começar a jogar; por enquanto temos mago e cavaleiro". É a parte visível da fatia F do [ADR 0065](0065-heroi-mago-fundacao.md), feita antes das outras fatias do Mago.

## Decisões

1. **Quando aparece:** para o **jogador novo** (sem save deste mundo) e depois de **confirmar "Novo mundo"**. Quem já tem save entra direto, sem tela (uma tela a cada abertura incomodaria; um menu de "continuar" pode vir depois, se o dono quiser).
2. **O que mostra:** "Escolha o seu herói" com uma carta por vocação (nome, frase, três traços e o botão). O Cavaleiro aparece **desenhado pelo próprio herói do jogo** (o mesmo `renderHero` do mundo, de frente e com a espada de treino). A janela **não fecha com Esc**: é preciso escolher. Os textos ficam em `game/messages/classIntro.ts`.
3. **O Mago aparece bloqueado ("Em breve")**, com o botão desabilitado. Deixar escolher entregaria um personagem quebrado a quem entra no jogo: ele ainda não tem corpo, cajado, ataque nem animação (fatias B a E do ADR 0065). Quem pode ser escolhido é a regra `playable` da ficha da vocação (`engine/character/classes`): **liberar o Mago é trocar um valor em `mage.ts`** e ajustar os testes que o travam de propósito. A carta do Mago usa um selo violeta no lugar do desenho, que virá com o corpo do Mago (fatia B).
4. **A escolha vale para o mundo criado:** `OfflineSimulation(seed, saved, startingClass)`; um save do mesmo mundo manda mais (a vocação nunca muda), outro mundo não herda. Escolher salva na hora (para a tela não voltar na próxima abertura); o "Novo mundo" **não salva antes de escolher**.
5. **Camadas:** o jogo (`Game.ts`) pede a escolha pela interface `GameUi.promptHeroClass`; o `HudService` guarda se a tela está aberta e só deixa passar vocação jogável; a janela fica em `game-page.html` e abre pelo mesmo caminho das outras (o jogo pausa); o estilo em `styles/hero-select.css` (duas cartas lado a lado no desktop, empilhadas no celular).

## Os testes de navegador antigos

Muitos testes abrem o jogo sem montar um save e passariam a ver a tela. Em vez de remendar um a um, o **ponto de partida de todos os testes de navegador passou a ser um jogador que já voltou** (`tests/browser/support/returning-player.ts`, usado em `playwright.config.ts`: um save igual ao de um jogo recém-começado). Quem testa o jogador novo troca por um armazenamento vazio (`test.use({ storageState: NEW_PLAYER_STATE })`): `hero-select.spec.ts` e `session.spec.ts` (que só grava o próprio save com o navegador vazio, para o progresso sobreviver ao recarregar). Um teste do inventário no `session.spec.ts` ganhou o seu save inicial.

## Verificação

- `tests/hero-select.test.ts` (5): quem é jogável (só o Cavaleiro); os textos de cada vocação; a vocação escolhida vale para o mundo, o save do mesmo mundo manda e outro mundo não herda; o jogo pergunta no jogador novo e no mundo novo e só salva depois de escolher; a janela (Esc não fecha, o Mago desabilitado, só a vocação jogável fecha a tela, o jogo pausa).
- `tests/browser/hero-select.spec.ts` (desktop e Android): jogador novo (a tela abre, o Mago está bloqueado, Esc não fecha, escolher o Cavaleiro começa e salva, recarregar não pergunta de novo); quem tem save entra direto; Novo mundo pergunta o herói e começa o mundo novo.
- Mutações: 16 estragos de propósito (Mago liberado, Cavaleiro bloqueado, jogador novo ou mundo novo sem escolha, herói bloqueado aceito pelo jogo e pelo HUD, escolha ignorada, salvar antes de escolher, o save deixando de mandar, outro mundo herdando, botão do bloqueado ativo, Esc fechando, abrir sem pausar, textos); os testes pegaram todos.

## Limites

- O Mago só é escolhível quando as fatias B a E estiverem prontas.
- A carta do Mago tem um selo no lugar do desenho; a do Cavaleiro mostra o herói parado, de frente.
- Não há tela de "continuar" para quem já joga.
- Android físico não foi testado.
