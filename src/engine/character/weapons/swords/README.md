# Espadas do cavaleiro — `weapons/swords`

As dez espadas têm **uma ficha TypeScript por arquivo**, separada por ID estável. As regras de combate, dano, requisito de nível, ritmo, efeitos especiais e cores de rastro estão na própria ficha. O arquivo `src/engine/character/Weapons.ts` apenas agrega essas fichas e preserva a API `WEAPONS`, `WEAPON_IDS`, `WeaponId`, `weaponUnlocked` e `FORGE_SWORD_PRICE` para todos os consumidores.

| Progressão | Arquivo | Espada |
| ---: | --- | --- |
| 1 | `starter.ts` | Espada de Treino de Carvalho |
| 2 | `forge.ts` | Espada Curta de Ferro Batido (ID legado `forge`) |
| 3 | `bronze.ts` | Gládio de Bronze Temperado |
| 4 | `copper.ts` | Montante de Cobre Rubro |
| 5 | `dunes.ts` | Lâmina Serrilhada das Dunas |
| 6 | `boreal.ts` | Espada de Cristal Boreal |
| 7 | `obsidian.ts` | Lâmina Vulcânica de Obsidiana |
| 8 | `marsh.ts` | Cutelo Peçonhento do Charco |
| 9 | `tempest.ts` | Sabre Abissal da Tempestade |
| 10 | `astral.ts` | Espada Astral de Terrania |

Esta pasta contém apenas **dados e regras de domínio**, sem Angular/Canvas. O desenho procedural da espada equipada é responsabilidade de `src/render/swords.ts`, e os ícones do inventário permanecem em `src/app/item-icon.component.ts`. Não misturar ícones com fichas de gameplay; não duplicar a lógica de golpes ou desbloqueio entre espadas. O primeiro item de progressão é sempre `starter.ts` (nível 0). Alterações devem manter `tests/knight-swords.test.ts`, `tests/sword-strike.test.ts` e `tests/sword-definitions.test.ts` verdes.
