# RPG-001 — XP e níveis no modo solo

Cada slime derrotado pela simulação real concede **10 XP**, mesmo sem recolher o drop. Não há XP duplicado pelo mesmo ID.

O nível 1 começa com 100 HP máximo. Cada nível acrescenta 10 HP máximo e 10 HP atual (respeitando o limite). Experiência cumulativa para o nível L: `30 * L * (L - 1) / 2`; nível 2 = 30 XP, nível 3 = 90 XP, teto de nível 50.

O campo opcional `experience` preserva saves antigos, que iniciam com XP 0 mesmo se possuírem kills anteriores. Morte mantém XP e nível, reaparecendo com HP máximo daquele nível. Gerar outro mundo zera a progressão.

**Escopo atual:** somente offline. Classes, mana, habilidades, persistência e XP autoritativo no Go continuam pendentes. O modo multiplayer não deve exibir progresso fictício.

Validar com typecheck, testes Node, build, Playwright e QA bot. Cinco abates no cenário controlado devem gerar 50 XP e nível 2, com 110 HP máximo.
