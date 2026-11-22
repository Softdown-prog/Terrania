# ADR 0064 — Capital: o Templo da Concórdia como lugar de renascimento

**Estado:** entregue em 2026-11-22, direto na `main`, por pedido do dono: em vez de a bênção temporária de vida máxima, o Templo serve de **lugar de renascimento** do herói. Terceira porta da capital (Hospedaria, ADR 0062; banco, ADR 0063). Decisão do dono sobre quando renascer lá: **no último lugar que ele consagrou**.

## Decisões

1. **Dois pontos de renascimento** (`engine/character/center/shrine/`): a **Vila da Travessia** (o de sempre) e o **Templo da Concórdia**, à porta do edifício, na rua e ao lado da sacerdotisa. A capital fica a uns 800 tiles da Vila, por isso renascer lá não pode ser automático: quem morre perto da Vila no começo do jogo não acorda do outro lado do mapa.
2. **A escolha é do jogador:** o herói começa renascendo na Vila. Falando com a **sacerdotisa Irmã Maelis** (nome de trabalho), escolhe "Renascer no Templo da Concórdia" ou "Renascer na Vila da Travessia", pelo painel da conversa. A escolha vale até mudar, e escolher o que já está escolhido não muda nada.
3. **Regras da escolha:** só com a conversa aberta, ao lado da sacerdotisa, fora de interior e com o herói de pé (o mesmo molde do banco e do descanso).
4. **Renascer:** `OfflineSimulation.respawn()` leva o herói ao ponto escolhido, de vida cheia, em chão livre; o resto (montaria desmontada, sem efeitos) fica como antes.
5. **Save:** `respawnPoint` só existe quando não é a Vila (quem nunca consagrou fica com o save igual ao de antes); é normalizado ao carregar (só os pontos conhecidos valem, o resto volta à Vila) e outro mundo não herda.
6. **Porta e nave:** o `templo` entra em `CAPITAL_ENTERABLE`; a nave tem o altar no meio e um banco de cada lado, na paleta da capital ("Interior · Concórdia").
7. **Tela:** painel da sacerdotisa (onde renasce hoje e os dois botões); o aviso de derrota passa a dizer "Você renasce em …" e o botão vira "Renascer no Templo" quando o Templo está consagrado ("Retornar à vila" continua igual para quem renasce na Vila).

## Verificação

- `tests/center-capital-shrine.test.ts` (8): pontos de renascimento (a Vila de sempre; o do Templo em chão livre, à vista da porta e da sacerdotisa, a mais de 20.000 px da Vila); renascer em cada ponto, de qualquer lugar; save e recarga (sem campo para a Vila, lixo vira Vila, outro mundo não herda); a sacerdotisa; a porta e a nave; recusas; consagrar, voltar à Vila e repetir; a fiação do jogo e da tela.
- `tests/browser/capital-shrine.spec.ts` (desktop e Android): entrar e sair pela porta; consagrar o Templo e voltar à Vila conferindo o save; herói derrotado renasce à porta do Templo, de vida cheia, com o aviso certo. O teste de derrota de `session.spec.ts` segue passando (a Vila continua o padrão).
- Os testes da Hospedaria passaram a contar três portas.
- Mutações: 17 estragos de propósito (ponto dentro do edifício, Vila no lugar errado, save sem normalizar, renascer sempre na Vila, escolha fora do save, outro mundo herdando, escolha perdida ao carregar, distância, repetição, caído consagrando, porta fechada, oferta, tela e botão de derrota); os testes pegaram todos.

## Limites

- Só a Vila e o Templo são pontos de renascimento; o Poço Negro pode ganhar o seu quando tiver um templo.
- A sacerdotisa só consagra; ainda não há missão do Templo. O nome é de trabalho.
- Morrer numa caverna continua levando ao ponto escolhido, como antes levava à Vila.
- Android físico não foi testado.
