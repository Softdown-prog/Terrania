# Cajados do mago — `weapons/staves`

Cada cajado tem **uma ficha TypeScript por arquivo**, com ID estável, como as espadas em `weapons/swords`. O arquivo `src/engine/character/Staves.ts` agrega as fichas e expõe `STAVES`, `STAFF_IDS`, `StaffId`, `DEFAULT_STAFF` e `staffUnlocked`.

| Progressão | Arquivo | Cajado | Elemento |
| ---: | --- | --- | --- |
| 1 | `apprentice.ts` | Cajado de Aprendiz (nível 0) | arcano comum |

Os outros dez cajados (fatia G do [ADR 0065](../../../../../docs/adr/0065-heroi-mago-fundacao.md)) espelham as onze espadas, um elemento cada: gelo, magma, veneno, tempestade, astral...

A ficha guarda o **combate** (`damage`, `interval`, `windup`, `manaCost`, `range`, `element`) e o **visual** (`visual`: rampas de três tons da haste e da gema, empunhadura, ponteira, anel, garras e fita). Só dados, sem Canvas. Os números de combate são **propostos** e passam a valer na fatia D (o ataque à distância); o desenho está em `src/render/staves.ts` e `src/render/staves/`. Alterações devem manter `tests/staves.test.ts` verde e o cajado registrado em `tests/helpers/artAssets.ts`.
