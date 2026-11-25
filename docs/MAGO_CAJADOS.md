# Os cajados do Mago

Lista aprovada pelo dono em 2026-11-24 (ADR [0073](adr/0073-cajados-elementais-lote-1.md) em diante). **Todos os números são propostas que o dono ajusta**; a ficha de cada cajado fica em `src/engine/character/weapons/staves/`.

## A regra

- Os cajados 2 a 11 **espelham as onze espadas**: o nível, o dano e o ritmo são os da espada correspondente (o intervalo é o da espada mais 0,2 s, como no Aprendiz). O Aprendiz (nível 0, arcano) é o primeiro e o único sem elemento.
- **Mana por magia** = intervalo × mana máxima do nível do cajado ÷ 10: atirando sem parar, a barra dura uns 20 s em qualquer cajado (como no Aprendiz); depois o Mago só consegue atacar metade do tempo. Quem passa do nível do cajado tem mais mana e aguenta mais.
- **Alcance:** 6 tiles em todos (o dono pode dar mais ao de raio e ao astral).
- **Como se consegue:** cada cajado libera sozinho no nível dele, como as espadas. Só o **primeiro elemental (Brisa)** precisa ser comprado, por **30 Terrania Gold**, na **Academia Arcana** (como a espada de ferro de Toren).
- Cada magia sai da cor da gema do cajado.

## A lista

| Nível | Cajado | Elemento | Dano | Intervalo (s) | Mana | Efeito da magia | Lote |
| ---: | --- | --- | ---: | ---: | ---: | --- | :-: |
| 0 | Aprendiz | arcano | 8 | 1,0 | 5 | dano simples | feito |
| 10 | Cajado da Brisa | vento | 16 | 1,2 | 17 | empurra o alvo para trás | 1 |
| 15 | Cajado de Rocha Viva | terra | 21 | 1,18 | 22 | alvo 30% mais lento por 2 s | 1 |
| 20 | Cajado das Marés | água | 26 | 1,15 | 28 | cura o mago em 10% do dano causado | 1 |
| 30 | Cajado de Brasa Rubra | fogo | 38 | 1,55 | 53 | queima o alvo: 4 de dano por segundo durante 3 s | 2 (feito) |
| 45 | Cajado do Espinheiro | natureza | 52 | 1,35 | 66 | veneno de 3 por segundo (durante 4 s) que acumula até 3 vezes | 2 (feito) |
| 60 | Cajado da Geada Boreal | gelo | 68 | 1,3 | 83 | alvo 40% mais lento por 3 s | 2 (feito) |
| 70 | Cajado do Sol Nascente | luz | 84 | 1,45 | 107 | o feixe atravessa e atinge também um alvo atrás | 3 |
| 80 | Cajado da Lua Negra | sombra | 98 | 1,5 | 126 | devolve ao mago 10% do dano em mana | 3 |
| 90 | Cajado da Tempestade | raio | 115 | 1,35 | 127 | o raio salta para até 2 monstros vizinhos | 3 |
| 100 | Cajado Astral de Terrania | astral | 140 | 1,6 | 166 | acerta o alvo e até 2 vizinhos | 4 |

## O desenho de cada um (cada um precisa de peça nova no contrato de arte)

Vento: haste clara de osso com penas e gema verde-água. Terra: pedra bruta com gema ocre. Água: coral com gema azul. Fogo: madeira carbonizada com brasa laranja. Natureza: galho vivo com espinhos e folhas verdes. Gelo: haste de cristal com gema ciano. Luz: ouro com disco solar amarelo. Sombra: ébano com lua crescente roxa escura. Raio: metal com bobina e gema azul elétrica. Astral: estrelas, branco e dourado.

## Os lotes

1. **Lote 1 (feito):** Brisa, Rocha Viva e Marés (G1a, [ADR 0073](adr/0073-cajados-elementais-lote-1.md)) e a **Academia Arcana** com porta, interior, mestra e a compra da Brisa (G1b, [ADR 0074](adr/0074-academia-arcana.md)), mais a troca de cajado no inventário.
2. **Lote 2 (feito):** Brasa Rubra, Espinheiro e Geada Boreal ([ADR 0075](adr/0075-cajados-elementais-lote-2.md)).
3. **Lote 3:** Sol Nascente, Lua Negra e Tempestade.
4. **Lote 4:** o Astral.

As roupas mágicas do Mago (defesa e desenho próprios) são uma entrega separada, depois dos cajados.
