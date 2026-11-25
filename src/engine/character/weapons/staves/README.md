# Cajados do mago — `weapons/staves`

Cada cajado tem **uma ficha TypeScript por arquivo**, com ID estável, como as espadas em `weapons/swords`. O arquivo `src/engine/character/Staves.ts` agrega as fichas e expõe `STAVES`, `STAFF_IDS`, `StaffId`, `DEFAULT_STAFF` e `staffUnlocked`.

| Nível | Arquivo | Cajado | Elemento | Magia |
| ---: | --- | --- | --- | --- |
| 0 | `apprentice.ts` | Cajado de Aprendiz | arcano comum | dano simples |
| 10 | `breeze.ts` | Cajado da Brisa (comprado na Academia Arcana) | vento | empurra o alvo |
| 15 | `stone.ts` | Cajado de Rocha Viva | terra | alvo 30% mais lento |
| 20 | `tide.ts` | Cajado das Marés | água | cura o mago |
| 30 | `ember.ts` | Cajado de Brasa Rubra | fogo | queima o alvo |
| 45 | `thorn.ts` | Cajado do Espinheiro | natureza | veneno que acumula |
| 60 | `frost.ts` | Cajado da Geada Boreal | gelo | alvo 40% mais lento |
| 70 | `sun.ts` | Cajado do Sol Nascente | luz | o feixe atravessa o alvo |
| 80 | `moon.ts` | Cajado da Lua Negra | sombra | devolve mana |
| 90 | `storm.ts` | Cajado da Tempestade | raio | salta para 2 vizinhos |
| 100 | `astral.ts` | Cajado Astral de Terrania | astral | acerta o alvo e 2 vizinhos |

Os onze cajados (fatia G do [ADR 0065](../../../../../docs/adr/0065-heroi-mago-fundacao.md), lista em [`docs/MAGO_CAJADOS.md`](../../../../../docs/MAGO_CAJADOS.md)) espelham as onze espadas, um elemento cada.

A ficha guarda o **combate** (`damage`, `interval`, `windup`, `manaCost`, `range`, `element`) e o **visual** (`visual`: rampas de três tons da haste e da gema, empunhadura, ponteira, anel, garras e fita). Só dados, sem Canvas. Os números de combate são **propostos** e passam a valer na fatia D (o ataque à distância); o desenho está em `src/render/staves.ts` e `src/render/staves/`. Alterações devem manter `tests/staves.test.ts` verde e o cajado registrado em `tests/helpers/artAssets.ts`.
