# Macro-regiões do mundo — implementação incremental

## Contrato ativo
- Coordenadas globais: norte Y negativo, sul Y positivo, oeste X negativo, leste X positivo; centro seguro com vila preexistente.
- `regions.ts` oferece cinco territórios e influências contínuas; as fronteiras são suavizadas por ruído espacial estável, sem divisão quadrada rígida.
- `terrainProfiles.ts` produz altitude, temperatura, umidade, rugosidade e influência costeira reprodutíveis pela seed.
- `biomes.ts` classifica o bioma; `terrain.ts` materializa água, chão, obstáculos e rotas, com bioma presente nos tiles compartilhados entre cliente/Node.
- `regionDifficulty.ts` descreve ameaça e temas de monstros/landmarks **futuros**, não cria criaturas que ainda não existem. Regiões perigosas já aumentam a presença de slimes e ajustam a velocidade no terreno.
- `atlas.ts` mantém nove setores navegáveis para cartografia, agora com nomes das cinco macro-regiões.

## Decisões de compatibilidade
- Sem novas variantes de `Ground`: mantidos contratos anteriores de colisão e os consumidores multiplayer.
- Travessias cardeais procedurais oferecem rota base entre centro e extremos, inclusive costa, sem prometer livre deslocamento por toda a água.
- O mapa mundial é amostrado; não é garantia de caminhos, embarcações ou dungeons existentes.
- Mudança da geografia para uma mesma seed é intencional nesta fase de desenvolvimento; client e servidor devem ser atualizados juntos.

## Marcos físicos regionais
`regionalLandmarks.ts` posiciona agulhas de gelo, obeliscos, faróis abandonados e monólitos a partir de células de 256 tiles e seed. Cada objeto só surge em solo alcançável com vizinhança livre; `WorldRenderer` desenha a estrutura, `collision.ts` bloqueia seu corpo e o atlas **próximo** marca suas posições em âmbar. Go experimental calcula os mesmos marcos e colisões e os compara no teste de paridade. Não há entradas de dungeon ou navegação funcional nesses objetos.

## Pendências explícitas
- Criaturas regionais autênticas, drops, recursos, chefes, cavernas e dungeons jogáveis.
- Interações narrativas e estruturas completas (entradas de cavernas/masmorras, portos funcionais). Monumentos regionais físicos já possuem colisão e posição no atlas próximo.
- Verificação prática do atlas e do deslocamento em Android; testes de runtime de salas Go em ambientes reais.

O Go experimental agora reproduz a geração regional em `server-go/engine/world_regions.go` e `world.go`; alterações devem manter a paridade TypeScript/Go.

## Verificação desta etapa
- `tests/landmarks.test.ts`: presença em quatro direções, seed, solo alcançável e corpo sólido.
- `server-go/engine/regional_landmarks_test.go`: distribuição e colisão equivalentes.
- `server-go/scripts/ts-reference.mjs` e `cmd/parity`: coordenadas de marcos na comparação TypeScript/Go.
- `tests/browser/tap-online.spec.ts`: marcador remoto verificado no atlas do inventário (o minimapa sobreposto não faz parte da interface canônica).
- CI e browser são obrigatórios antes de integrar; resultados não devem ser inferidos apenas da compilação.
