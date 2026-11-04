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
- Asterisco importante: deslocamento em tiles de 32 px, perseguição automática, battle list, mana, vocações, runas, equipamentos e IA de respawn ainda serão recortes separados. Não afirmar que o sistema inteiro do Tibia já foi reproduzido.

## Testes
`npm test`, `npm run typecheck`, `npm run build`, suíte Playwright desktop/Android, QA-BOT e workflows completos. Nenhuma aprovação automática por compilar.
