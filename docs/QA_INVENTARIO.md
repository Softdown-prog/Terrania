# QA — Primeira etapa do inventário (modo solo)

Esta entrega adiciona uma **bolsa local**, **gel de slime recolhido no chão** e **poções de cura obtidas com Aela**. Não há ainda crafting, comércio, equipamento alterável ou inventário autoritativo online.

## Aceite funcional
- [ ] Abrir `/jogar/?modo=solo`, escolher um mundo e abrir **Bolsa** com mouse, teclado e toque Android.
- [ ] Slime derrotado cria um pequeno cristal verde visível no chão; aproximar o herói recolhe exatamente **1 gel**.
- [ ] Recarregar antes de recolher: o gel continua no chão e o slime derrotado não reaparece.
- [ ] Recarregar depois de recolher: o gel permanece na bolsa, sem duplicar.
- [ ] Gel com bolsa cheia (99) continua no chão; novas derrotas não geram quantidades ilimitadas.
- [ ] Derrotar cinco slimes, conversar com **Aela**, obter **duas poções**; conversar de novo ou recarregar não duplica a recompensa.
- [ ] Usar poção quando ferido recupera até 35 PV sem ultrapassar 100. Com vida cheia não deve gastar o item.
- [ ] Durante o uso da bolsa, movimento/ataque para (modal pausa o jogo local), com Escape ou Voltar à aventura funcionando.
- [ ] Testar bolsa no Chrome Android com 320, 360, 390 e 412px, barras do navegador, retrato e paisagem.
- [ ] Abrir um save antigo `terrania-origins-v1`: posição, missões e inimigos derrotados continuam; bolsa nova começa vazia e Aela pode entregar a recompensa se a missão já estava completa.
- [ ] Gerar novo mundo local reinicia bolsa, drops e missão sem afetar mundos salvos em outros perfis.
- [ ] Modo online: botão Bolsa desabilitado, sem conceder itens por morte de inimigos no servidor.
- [ ] Alternar online → solo depois de perda de conexão: itens e poções do save solo original reaparecem.
- [ ] Validar que ataques, movimento, NPCs e os interiores continuam funcionando.

## Limites e publicação
- O inventário desta fase é **exclusivamente offline**. Não confundir loot local com estado compartilhado pelo servidor.
- Nenhum schema de protocolo WebSocket, rota da VPS, container ou variável Cloudflare é alterado.
- CI verde não substitui teste manual de UX no Android. Não publicar enquanto o deploy Cloudflare estiver com falha.
