# Roadmap — Terrania: Origins

## Fase 0 — Fundamentos (protótipo 0.2)
- [x] Estrutura TypeScript/Angular e build estático para Cloudflare
- [x] World seed determinística, chunks e cache limitado
- [x] Herói procedural, caminhada e ataque
- [x] Slimes, colisão, missão inicial e save offline
- [x] WebSocket, salas experimentais, simulação server-authoritative
- [x] Docker isolado e CI de verificação
- [x] Validar build real com dependências instaladas e fluxo entre dois navegadores

## Fase 1 — Vertical slice de RPG
- [x] Melhorar herói procedural e animações em oito direções
- [x] Separar site de apresentação e entrada do jogo
- [x] Profundidade no cenário, movimento com aceleração e câmera ajustável
- [x] Integração local com dois clientes WebSocket e build multipágina validado
- [x] Primeiro NPC procedural (Aela) com diálogos conforme a missão, teclado e toque
- [ ] Cidade inicial com outros NPCs, placas, interiores e diálogos encadeados (primeiro recorte: vila/NPCs/placas/interiores ilustrados; interiores caminháveis implementados; revisão visual e QA de navegação pendentes)
- [ ] Inventário, equipamentos, loot e itens consumíveis (primeiro recorte: bolsa offline, gel de slime no chão, poção de cura e recompensa única de Aela; equipamentos/crafting/online pendentes)
- [ ] Sistema de quests com estados e recompensas
- [ ] Três tipos de monstros e dois tipos de ataque

## Fase 2 — Multiplayer de teste
- [x] Testar WSS público via Caddy e sincronizar dois clientes numa sala temporária
- [ ] Autenticação, reconexão com sessão, validação e controle de abusos
- [ ] Persistência autoritativa (SQLite/PostgreSQL) e backup externo
- [ ] Latência simulada, interpolação, observabilidade e testes de carga

## Fase 3 — Mundo em expansão
- [ ] Biomas, cavernas e ruínas, cidades conectadas
- [ ] Missões encadeadas, chefes e eventos coletivos
- [ ] Balanceamento de economia e progressão
- [ ] Otimização de memória, teclado, touch e acessibilidade

## Regras
Entrega pequena com testes e plano de reversão. Não misturar o antigo C++/SDL com o frontend. Só colocar o backend na VPS após verificar rede, porta, origem HTTPS e conflito com os demais containers.

## Migração isolada Angular + Phaser 3

Ver [estado, validação e continuidade](MIGRACAO_ANGULAR_PHASER3.md). A branch `feat/angular-ui-phaser3` exige decisão posterior do usuário antes de PR ou merge.
