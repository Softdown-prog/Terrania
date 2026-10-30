# Vila da Travessia — recorte 1 da Fase 1

Escopo congelado: sem novas classes, economia, missões, itens, portais ou contas.

- Leste da clareira: praça navegável em qualquer seed, três casas e três moradores com diálogos condicionais ao progresso de Aela.
- Placas legíveis e portas que mostram uma ilustração do interior via E ou toque.
- Interiores são **visitas ilustradas**, não mapas caminháveis. Não há comércio, saque ou cura.
- As interações são locais, sem alterar estado autoritativo online.
- As fachadas são sólidas e compartilham colisão com o backend; protocolo 3 requer publicação coordenada do cliente e servidor.

**Pendente para concluir a cidade:** interiores caminháveis e revisão em desktop/celular. O item do roadmap permanece aberto.

Verificar `npm run typecheck && npm test && npm run build` na raiz; repetir scripts equivalentes em `server/`, testar dois navegadores e touch real.
