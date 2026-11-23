# ADR 0069 — O combate à distância do Mago

**Estado:** entregue em 2026-11-23, direto na `main`, por pedido do dono (fatia D do [ADR 0065](0065-heroi-mago-fundacao.md)). O dono aprovou as três propostas: (1) o mago usa o mesmo combate por alvo, mas **para a até 6 tiles e dispara**; (2) **sem mana** o ataque não faz nada, aparece "Sem mana" e a recarga não é gasta; (3) a **vida do mago é 80%** da do Cavaleiro.

## Decisões

1. **Mesma mira do Cavaleiro:** o jogador escolhe o alvo (toque/clique) e o herói se aproxima. O Cavaleiro para a ~1 tile e golpeia; o Mago **para a 4 pixels antes do alcance do cajado (6 tiles)** e conjura. O que muda de uma vocação para a outra está num só lugar, `CombatProfile` (`engine/combat/CombatProfile.ts`): intervalo, arma, alcance à distância (e se há mana) e a distância em que a perseguição para. As telas da superfície e da caverna só perguntam `sim.combatProfile`.
2. **A magia é uma fórmula só, nos dois mundos:** `engine/combat/SpellCombat.ts` (como `SwordCombat.ts` para a espada). Dano = `max(1, dano do cajado − defesa do alvo)`; só acerta o alvo **já escolhido** (vivo, com linha de visão, dentro de 6 tiles; cone folgado de -0,1 porque o alcance é de mira, não de arco). A superfície (`OfflineSimulation`) e a caverna (`CaveRoom`) chamam a mesma `resolveSpellStrike`, então defesa, alvo e abate são iguais.
3. **Mana gasta ao conjurar:** `Player.startCast(staff, spend)` checa recarga, vida e atordoamento **antes** de cobrar, e só então gasta os 5 de mana; sem mana, nada acontece e o tempo de recarga fica intacto. A espera do golpe (`attackWindup`) é a do cajado (0,12 s), a recarga é a do cajado (1 s, e mais lenta se o herói estiver lento). O dano do golpe pendente vem do cajado, mesmo que haja uma espada de outro dano na mão.
4. **"Sem mana":** o `ClassicCombat` marca o bloqueio quando o alvo está ao alcance mas a mana não chega, **não** gasta a recarga e devolve o motivo **uma única vez** (`takeBlocked`). Sair do alcance, trocar de alvo ou reiniciar o mundo limpam o aviso, então o próximo bloqueio avisa de novo. A tela mostra o texto (`messages/noMana.ts`) pelo aviso de viagem já existente.
5. **Vida do mago a 80%:** `hpPercent` na ficha da vocação (Cavaleiro 100, Mago 80); `maxHpForExperience(exp, vocação)` arredonda a conta. No nível 2, por exemplo, o Mago tem 88 de vida (o Cavaleiro, 110, a cada nível +10 contra +8). O save, a subida de nível na superfície e na caverna e a cura usam a mesma conta.
6. **O Cavaleiro não mudou:** o ramo da espada é o de antes (mesma fórmula, mesmo alcance, mesma parada de perseguição); o `combatProfile` dele devolve os valores antigos.

## Números (propostas do dono, ainda ajustáveis)

Cajado de Aprendiz: 8 de dano, 1 s entre magias, 0,12 s de preparo, 5 de mana, 6 tiles. Mana 50 + 10 por nível, barra cheia em 20 s. Vida do mago: 80% do Cavaleiro.

## Verificação

- `tests/mage-combat.test.ts` (17): a ficha e a vida, o perfil de combate das duas vocações, `startCast` (cobra só quando sai, em recarga/morto/atordoado não cobra, dano do cajado), a fórmula da magia (defesa, mínimo 1, só o alvo escolhido, linha de visão, alcance), o aviso "Sem mana" uma vez por bloqueio, a perseguição que para a 6 tiles, a superfície (abate, experiência, subida de nível com vida de mago, mana gasta) e a caverna (mesma fórmula, mesma mana).
- Mutações: **51** estragos de propósito. Sete sobreviveram na primeira rodada (vocação no ganho de experiência, dano do golpe de magia, alvo sem escolha, aviso não reiniciado ao reiniciar o combate ou ao sair do alcance, parada da perseguição, abate de magia sem experiência); cada um virou teste e hoje todos são pegos.

## Limites

- **Ainda sem animação:** a magia causa dano mas não há conjuração, projétil nem impacto desenhados, nem a barra de mana na tela (fatia E).
- O mago ainda não é jogável (carta "Em breve"); a liberação é a fatia F.
- Só existe um cajado; trocar de cajado entra na fatia G.
- Equilíbrio (dano, mana, vida) são propostas; sem medição em jogo real. Android físico não foi testado.
