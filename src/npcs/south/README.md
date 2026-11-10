# Poço Negro — NPCs dos Ermos do Sul

Doze personagens são instanciados em `index.ts` com coordenadas reais dentro dos muros.
Cada ficha contém aparência (incluindo orcs, goblins, troll e diabretes), acessório
e três falas exclusivas. Hesh e Zinha patrulham trajetos curtos; a mesma função
alimenta desenho e alcance da conversa.

Madame Víbora vende o **descanso pago** (24 Terrania Gold: vida completa e sem status, ADR 0022 e 0025); é o
primeiro serviço da cidade.

Interiores disponíveis: Fortaleza, Fornalha e Hospedaria. Bazar, Casa de Venenos,
Ossuário, Templo, Arena e Estábulo possuem fachadas, **sem transação, cura,
montaria ou missão inventada nesta fase** (a exceção é o descanso de Madame Víbora). Novos serviços exigem sistema de
economia e progresso previamente definido.

Planta, limites e portões: `src/world/southCity.ts`.
