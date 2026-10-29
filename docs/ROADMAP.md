# Roadmap — Terrania: Origins

## Fase 0 — Fundamentos (protótipo 0.2)
- [x] Estrutura TypeScript/Vite e build para Cloudflare Pages
- [x] World seed determinística, chunks e cache limitado
- [x] Herói procedural, caminhada e ataque
- [x] Slimes, colisão, missão inicial e save offline
- [x] WebSocket, salas experimentais, simulação server-authoritative
- [x] Docker isolado e CI de verificação
- [ ] Validar build real com dependências instaladas e fluxo entre dois navegadores

## Fase 1 — Vertical slice de RPG
- [ ] Melhorar herói procedural e animações em oito direções
- [ ] Cidade inicial com NPCs, placas, interiores e diálogos
- [ ] Inventário, equipamentos, loot e itens consumíveis
- [ ] Sistema de quests com estados e recompensas
- [ ] Três tipos de monstros e dois tipos de ataque

## Fase 2 — Multiplayer de teste
- [ ] Testar VPS em staging e configurar WSS via Caddy
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
