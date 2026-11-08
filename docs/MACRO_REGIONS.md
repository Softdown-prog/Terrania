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

## Pendências explícitas
- Criaturas regionais autênticas, drops, recursos, chefes, cavernas e dungeons jogáveis.
- Landmarks físicos e navegáveis com colisão/visual próprios (por enquanto há apenas temas de conteúdo).
- Verificação prática do atlas e do deslocamento em Android; smoke multiplayer Node + diferenças de Go shadow em servidor de testes.
