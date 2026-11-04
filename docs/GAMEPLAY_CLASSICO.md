# Terrania — protótipo de combate RPG clássico (não aprovado para merge)

## Referência histórica
O período desejado é o MMORPG clássico entre 2008 e 2010. A versão 8.60 de Tibia saiu em 30/06/2010; a sensação de 2008/2009 aproxima-se de 8.4/8.5. São referências de *regras de interação*, não de código, sprites, mapa, efeitos, nomes exclusivos ou interface copiada.

## Isolamento
Este trabalho começa da main `6ce58c1`, **sem** trazer os RPG-004/005 de golpe forte, esquiva, salto ou teia do PR #42. O PR #42 continua sem aprovação. Nenhum merge, deploy, banco, autenticação ou protocolo multiplayer deve ocorrer nesta etapa.

## Recorte CLASSIC-001
- `?modo=classico`: modo solo experimental. O modo `?modo=solo` original continua igual.
- Clique ou toque sobre criatura para selecionar alvo; Space/J ou botão ATACAR escolhe a criatura mais próxima. Escape cancela o alvo. Clicar no chão continua a caminhar.
- Personagem executa ataques automáticos periódicos contra **o único alvo selecionado**, apenas quando alcance, linha de visão, estado do herói e intervalo permitem. O motor continua decidindo impacto, kill, loot e inventário. Selecionar outro alvo não zera a recarga.
- Ataque automático não muda o contrato Go, não cria PvP, magia, vocação ou créditos arbitrários de XP.
- A apresentação Angular mostra o alvo sem painel de jogadores sobre o mapa; input funciona com teclado e touch.
- Asterisco importante: deslocamento **por passos discretos** em tiles de 32 px, battle list, mana, vocações, runas, equipamentos e IA de respawn ainda serão recortes separados. Não afirmar que o sistema inteiro do Tibia já foi reproduzido.

## Recorte CLASSIC-002 — Perseguição automática por A* (somente solo clássico)
- Selecionar um monstro habilita a aproximação até um dos pontos caminháveis próximos da criatura. O motor conserva o movimento contínuo e a colisão do Terrania; **ainda não** implementa passos discretos estilo Tibia.
- O planejador usa tiles de 32 px para gerar posições válidas de ataque ao redor do alvo e o TapNavigator com A* para contornar árvores, paredes e pedras. Não teleporta nem atravessa obstáculos.
- Só persegue alvos vivos dentro de 16 tiles (512 px), com novo plano limitado a intervalos de aproximadamente 0,4 s ou se o alvo deslocar 16 px. Não recalcula caminhos a cada tick e não muda o cooldown de 1,6 s.
- Para quando entra no alcance real da espada e há linha de visão. Tenta outros pontos próximos se a posição ideal estiver bloqueada. Alvos removidos ou morte do herói cancelam o seguimento.
- WASD/joystick têm prioridade enquanto acionados. Toque no terreno permite caminhar manualmente sem perseguição até escolher o alvo novamente ou apertar ATACAR; o alvo permanece selecionado para ataque se estiver ao alcance.
- Os controles existentes, modo solo normal, multiplayer Go/Node, persistência, contas e PRs rejeitados não são modificados.
- Regressões: tests/classic-pursuit.test.ts, tests/classic-combat.test.ts, tests/tap-navigation.test.ts e tests/browser/classic-combat.spec.ts. Confirmar testes unitários, build Angular, Playwright Android e desktop e smoke Docker no workflow de validação antes de aceitar o recorte.

## Testes
`npm test`, `npm run typecheck`, `npm run build`, suíte Playwright desktop/Android, QA-BOT e workflows completos. Nenhuma aprovação automática por compilar.
