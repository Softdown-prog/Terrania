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

## Perfil físico independente por espada

`visual` acompanha cada ficha: comprimento e espessura, liga/cor de metal, cabo, guarda, geometria da ponta, runas, ornamentos e partículas do golpe. Não há mais dez perfis `SHAPES` dentro do renderizador. A geometria original foi transferida **sem alterar dano, desbloqueio, proporções ou cores**.

O motor possui apenas valores declarativos; `src/render/swords.ts` mantém o algoritmo compartilhado de pintura Canvas e consulta `WEAPONS[id].visual`. A resolução de golpes continua em `SwordCombat.ts`, e os ícones da mochila continuam isolados no Angular.

## Rastros procedurais por material

Cada espada declara a paleta (`trail.first/second/opacity`) e a forma de partículas (`visual.trailAccent`), quando aplicável. O código compartilhado no Canvas desenha seis acabamentos distintos: **sand** (Dunas, poeira), **ice-shards** (Boreal, lascas cristalinas), **embers** (Obsidiana, faíscas), **venom-drops** (Charco, gotas viscosas), **bolts** (Tempestade, relâmpagos) e **stars** (Astral, constelações). As quatro espadas iniciais usam rastro simples, sem partículas elementais.

Os efeitos acompanham o arco físico da ponta e se dissipam no tempo, sem texturas externas, `Math.random` nem relógio. Os testes verificam determinismo, geometria distinta, limites espaciais e que as rotinas de gameplay, dano e cooldown continuam separadas da arte.

## Largura do rastro e orientação

A geometria do arco segue a ponta da arma, nunca o centro do herói. `visual.trailThickness` define a largura máxima da **fita afilada**, sem criar um setor preenchido até o cabo. O início e o fim ficam estreitos e a transparência segue o progresso da varredura. As dez espadas usam espessuras próprias entre 2,4 e 5 unidades locais, sem interferir no alcance de colisão ou no dano.

Na Tempestade, os segmentos de raio são orientados pela tangente do golpe, inclusive quando o personagem está olhando para os lados ou para cima. A fita usa um gradiente determinístico; testes no Canvas cobrem quatro direções, isolamento do estado, proporção e ausência de qualquer relógio ou sorteio.
