# Critérios de aceite — Vila da Travessia (Fase 1)

O PR só pode sair de rascunho quando os testes automáticos estiverem verdes e estes cenários forem comprovados no navegador real. Marcar uma caixa apenas após executar; não inferir por compilação.

## Desktop
- [ ] Iniciar solo com seed 842136, sair da clareira e chegar caminhando até a vila.
- [ ] Falar com Aela, Mira, Toren e Lina; conferir textos antes e depois de cinco slimes.
- [ ] Ler as duas placas com E e encerrar o diálogo sem movimentar o herói.
- [ ] Abrir Conselho, Oficina e Hospedaria **pela frente da porta**; entrada lateral não deve funcionar.
- [ ] Verificar três interiores com móveis próprios, colisões consistentes e saída pela porta e por E.
- [ ] Abrir Ajuda e Ajustes dentro de cada interior e voltar sem travar a movimentação.
- [ ] Salvar/recarregar o solo sem perder vida, posição externa nem progresso; troca de mundo reinicia o interior.
- [ ] Confirmar que nenhum slime surge ou ataca o herói na praça, mesmo após combater na floresta.

## Celular / viewport estreito
- [ ] Acessar /jogar/ com largura de 390 px ou menor: HUD, botão Entrar/Sair, joystick e ATACAR não podem impedir a navegação.
- [ ] Entrar, andar desviando dos móveis e sair em cada interior usando apenas toque.
- [ ] Rotacionar a tela e abrir/fechar menus sem deslocamentos ou controles presos.
- [ ] Conferir performance e toque num aparelho real; simulação responsiva isolada não substitui esse teste.

## Multiplayer e publicação
- [ ] Com dois clientes e backend **protocolo 3**, testar exterior, portas, slimes e sincronização de vida/posição.
- [ ] Confirmar o comportamento temporário documentado: interiores são locais; o avatar permanece parado junto à porta para os demais.
- [ ] Desconectar/reconectar na entrada e dentro de um interior; sessão deve voltar ao mundo externo sem duplicar jogadores ou travar a UI.
- [ ] Publicar cliente e servidor de forma coordenada, verificar HTTP /health e WSS e ter reversão para o par de builds anterior.
- [ ] Não implantar na VPS sem verificar o container existente, a rota Caddy e os outros projetos.

**Limites:** nenhuma classe, equipamento, missão nova, comércio ou teletransporte deve entrar neste PR. O item de cidade do roadmap permanece aberto até os cenários acima passarem.