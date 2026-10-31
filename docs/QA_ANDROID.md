# Checklist Android — movimento e mobile-first

A CI garante matemática do joystick, TypeScript, build e regressões. **Não substitui testes de toque em dispositivo real.**

## Jogo — Chrome Android
- [ ] Toque curto em solo livre: personagem chega ao destino e exibe marcador púrpura, sem ficar oscilando.
- [ ] Toque atrás de casa/árvore: personagem contorna obstáculos sem atravessar paredes, quando houver passagem.
- [ ] Toque na água, dentro de mobília ou a mais de 650 unidades: destino recusado sem travar a interface.
- [ ] Arrastar dedo sobre Canvas não cria rota; toque curto com dois dedos no Canvas não ativa rota.
- [ ] Após toque para caminhar, mover joystick, usar WASD ou atacar cancela imediatamente o destino.
- [ ] Abrir ajuda, ajustes, diálogo, perder foco, trocar de mundo ou conectar ao servidor cancela destino.
- [ ] Em interior, tocar em piso acessível move o herói respeitando mesas, forja e camas.
- [ ] Modo multiplayer no exterior mantém controle manual (tap-to-walk desabilitado).

- [ ] Em 320, 360, 390 e 412 px, iniciar `/jogar/?modo=solo` sem zoom horizontal e com HUD/controles acessíveis.
- [ ] Joystick: toque breve próximo ao centro não move; arrasto gradual dá controle fino; arrasto até a borda dá velocidade normal.
- [ ] Girar o joystick em oito direções, caminhar encostado às casas/árvores e soltar: sem deriva ou atravessar colisão.
- [ ] Manter joystick com um dedo e pressionar ATACAR com outro; soltar apenas o ataque não interrompe a caminhada.
- [ ] Arrastar o dedo para fora do círculo e soltar; cancelar o gesto, alternar abas e receber chamada: controles não ficam presos.
- [ ] Abrir/fechar ajuda, ajustes e diálogo com joystick ativo; não deve continuar andando no fundo.
- [ ] Aproximar-se de morador, placa e porta, entrar e sair dos três interiores apenas usando toque.
- [ ] Girar retrato/paisagem e expandir/ocultar barras do Chrome: Canvas e botões permanecem alinhados, sem faixa vazia.
- [ ] Entrar em tela cheia e sair; validar recorte de notch, bordas do aparelho e área da barra de gestos.
- [ ] Comparar efeitos visuais ligados/desligados e preferências de movimento reduzido em Android de baixo desempenho.

## Site institucional
- [ ] Abrir menu em 320/360/390/412 px; links inteiramente acessíveis, rolagem dentro do menu quando necessário.
- [ ] Abrir/fechar menu por toque, link e tecla Escape (teclado conectado); sem menu preso.
- [ ] Verificar hero e CTA na home, Guia, Comunidade, Novidades e Mundo em retrato e paisagem.
- [ ] Tocar em Jogar agora sem interferência do gesto de rolagem da página.

## Rede e publicação
- [ ] CI do frontend e servidor aprovada, com smoke Docker.
- [ ] Multiplayer protocolo 3 validado com dois clientes antes de publicação coordenada do backend.
- [ ] Publicação Cloudflare Worker é fluxo separado; não realizar deploy a partir deste PR.
- [ ] Registrar observações reais do Chrome Android antes de concluir a tarefa.

Alterações restritas ao input e apresentação. Velocidade, combate, colisão, protocolo e estado do servidor não são alterados.
