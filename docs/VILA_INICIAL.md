# Vila da Travessia — recorte 1 da Fase 1

Escopo congelado: sem novas classes, economia, missões, itens, portais ou contas.

- Leste da clareira: praça navegável em qualquer seed, três casas e três moradores com diálogos condicionais ao progresso de Aela.
- Placas legíveis e portas que permitem entrar em mapas internos caminháveis pelo mesmo teclado e joystick do mundo exterior.
- Interiores são mapas locais caminháveis, com mobília sólida e saída pela porta ou tecla E. Não há comércio, saque ou cura.
- As interações são locais, sem alterar estado autoritativo online.
- As fachadas são sólidas e compartilham colisão com o backend; protocolo 3 requer publicação coordenada do cliente e servidor.

**Pendente para concluir a cidade:** revisão real de navegação, acessibilidade e gráficos no desktop/celular; sincronização de instâncias interiores online não está prevista para a Fase 1. O item do roadmap permanece aberto até QA.

Verificar `npm run typecheck && npm test && npm run build` na raiz; repetir scripts equivalentes em `server/`, testar dois navegadores e touch real.
