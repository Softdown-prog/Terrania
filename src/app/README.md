# Angular: site e HUD

**Papel:** Navegação, páginas e camada de interação com o usuário.

**Ponto de entrada:** consulte [registro central](../../architecture/modules.json) e o índice gerado em [docs/INDEX.md](../../docs/INDEX.md). Os caminhos de código completos são listados automaticamente; não repetir listas manuais aqui.

**Ao alterar:** Atualizar componentes/template, contrato de interface e testes de UI em conjunto.

**Verificação:** typecheck Angular, build e Playwright mobile/desktop.

**Limites:** O Angular não é autoridade de dano, posição, loot ou XP.

O HUD recebe o progresso calculado da missão da Aela e as falas prontas para exibição. O contrato `GameUi` também recebe vida, coordenadas em tiles, contagens da bolsa e a ação próxima disponível. O Angular formata esses dados e envia comandos ao orquestrador.


**Inventário do Cavaleiro para celular:** game-page.html e hud.service.ts apresentam mochila em grade, filtros, seleção com detalhes e comparação de defesa/dano. BackpackItemView é derivado dos dados reais da bolsa e dos equipamentos, sem segundo inventário ou novo cálculo de dano no Angular. O conjunto inicial pertence ao personagem; ao equipar, a peça sai da mochila e passa ao slot do herói. A quantidade de células visuais não representa limite de capacidade — apenas os limites de pilha do motor são regras atuais. No Android, Mochila e Equipamento são seções tocáveis; no desktop ambos aparecem. As operações online continuam validadas na sala Node. Os testes de navegador ficam em tests/browser/app.spec.ts.

**Ícones de item:** `item-icon.component.ts` desenha os 16 ícones (gel, poção, três comidas, duas espadas e os nove espaços do conjunto) em SVG inline, sem gradientes nem ids internos. É apenas apresentação: `BackpackItemView.icon` substitui os antigos glifos Unicode, e o motor (`EQUIPMENT_SLOTS.icon`) permanece intocado. Espaços vazios e itens zerados aparecem em silhueta; a arma exibe a espada realmente equipada. Um novo item precisa de um `ItemIconId` correspondente.

**Mapa dentro do inventário:** a terceira aba, Mapa do mundo, substitui o antigo overlay. O Angular alterna Mundo inteiro, Meu setor e Arredores, e permite escolher um dos nove setores reais por coordenada. O renderizador Canvas é executado apenas quando esta aba está visível; navegar pela aventura, abrir mochila ou equipamento não gera trabalho do atlas. Testes desktop/Android verificam que o mapa não intercepta toques no Canvas Phaser. O HUD também explica quando a sala confirma um respawn ou inicia uma nova sessão após reconexão.

**Consistência visual:** o atlas agora usa as mesmas regras de composição do inventário — moldura em relevo, destaque metálico, legendas desenhadas e tipografia compatível — sem um overlay na tela do Phaser. A aba Mapa é descartada quando o diálogo fecha, incluindo o Canvas; reabrir começa na Bolsa. O render estático é armazenado por viewport enquanto o Canvas existe, e os marcadores continuam atualizáveis a partir dos dados do HUD.
