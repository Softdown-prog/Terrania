# Terrânia — arquitetura regional Go/Rust (protótipo isolado)

## Regra de ouro
**Um único worker Go autoritativo por província em um determinado epoch.** O Rust continua módulo auxiliar de cálculo/buffers, não um segundo servidor de networking. O backend de produção continua inalterado.

## Implementado nesta branch
- `cluster.ProvinceAt(x,y)`: mapeamento determinístico do mundo para províncias de 16×16 chunks (8192 px de largura, mantendo `engine.ChunkPixels=512`). As coordenadas negativas usam `math.Floor` e são rejeitados NaN, infinito e valores fora dos limites do motor.
- `Router.PickProvince(province)`: rendezvous hashing por província, independente da ordem declarada dos workers. É distinto de `Pick(room)`; **não muda o roteamento atual do gateway**, que continua distribuindo salas.
- `RegionDirectory`: coordenador **apenas em memória e processo único, para testes**. `Register` recusa transferências de autoridade implícitas; `Begin` cria token criptograficamente aleatório e reserva uma transferência por região; `StageDestination` compara o digest do snapshot; `QuiesceSource` suspende a autoridade de escrita; `Commit` transfere para um worker com epoch incrementado; `Abort` cancela com epoch incrementado.
- `CanSimulate` permite que testes demonstrem o *fencing*: a origem pode simular até ser quiescida, nenhum lado pode simular durante a barreira, e somente o destino com epoch novo pode simular após o commit.
- Tokens de transferência têm validade de 30 segundos para operações normais; timeout **não** reativa automaticamente ninguém. Recuperação requer decisão explícita e reconciliada. Os tokens nunca devem aparecer em logs.

## Fluxo proposto (próxima integração controlada)
```text
Source Go worker (epoch N)       Coordinator              Target Go worker
       | Begin(region, digest) ------>|                                |
       |<------ ticket (N -> N+1) ----|                                |
       |     snapshot privado via gRPC/mensageria + autenticação mTLS -->|
       |                              |<-- StageDestination(ticket,hash)|
       | QuiesceSource(ticket) ------>|                                |
       |   [origem não pode escrever] | [nenhum worker pode escrever]   |
       |                              |-- Commit e publicar epoch N+1 ->|
       |                              | [só destino pode escrever]      |
```
**O desenho acima é o futuro protocolo entre processos; não existe transporte, gRPC nem mTLS implementados nesta etapa.** Para não permitir `split brain` em um cluster real, `CanSimulate` precisa ser incorporado ao loop real dos workers com epochs persistidos e autoridade consistente, inclusive sob partições de rede. Um coordenador apenas em memória não oferece isso.

## Gargalos e decisões
1. A mudança de topologia por rendezvous hashing **não pode redirecionar uma província ativa instantaneamente**: novos destinos exigem handoff explícito, *drain* e confirmação da origem.
2. Backpressure: suspender novas admissões para uma região em migração; garantir fila limitada e evitar retransmissões ilimitadas de snapshots.
3. Fencing: cada comando de worker deve carregar a versão/epoch do dono da província e rejeitar mensagens antigas, inclusive após reconexão.
4. Estado: snapshot completo (posição, HP, inventário, cooldowns, NPCs, mobs, RNG, tick e sequências) e replay de eventos precisam manter determinismo. O digest desta fase é somente um hash recebido, não um serializador de estado.
5. Segurança: autenticação servidor-servidor, TLS/mTLS, autorização por worker e região, antirreplay e sem aceitar endereços de destino do cliente.
6. Escalabilidade: preservar a divisão entre regiões ativas, entidades frias/estáticas e múltiplos processos. Não ativar 10 milhões de entidades no motor apenas porque o laboratório suporta criar registros compactos.

## Testes da fase
A CI dedicada roda `go test -race` para todos os cenários de transferência: negativo de posição, distribuição, token adulterado, digest divergente, commit antecipado, exclusividade de autoridade, timeout, recuperação, stale epoch e 512 províncias migrando concorrentemente, repetidas 3 vezes. Também executa regressões de gateway e motor Go.

**Não incluído:** persistência, failover confiável, gRPC, trânsito de jogadores em produção, suporte multi-gateway com coordenação distribuída, Kubernetes, abertura de portas, Docker/VPS, merge ou deploy.
