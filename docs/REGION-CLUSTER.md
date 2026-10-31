# Terrânia — arquitetura regional Go/Rust (protótipo isolado)

## Regra de ouro
**Um único worker Go autoritativo por província em um determinado epoch.** O Rust continua módulo auxiliar de cálculo/buffers, não um segundo servidor de networking. O backend de produção continua inalterado.

## Implementado nesta branch
- `cluster.ProvinceAt(x,y)`: mapeamento determinístico do mundo para províncias de 16×16 chunks (8192 px de largura, mantendo `engine.ChunkPixels=512`). As coordenadas negativas usam `math.Floor` e são rejeitados NaN, infinito e valores fora dos limites do motor.
- `Router.PickProvince(province)`: rendezvous hashing por província, independente da ordem declarada dos workers. É distinto de `Pick(room)`; **não muda o roteamento atual do gateway**, que continua distribuindo salas.
- `RegionDirectory`: coordenador **apenas em memória e processo único, para testes**. `Register` recusa transferências de autoridade implícitas; `Begin` cria token criptograficamente aleatório e reserva uma transferência por região; `FreezeSource` bloqueia novos ticks na origem; `StageDestination` compara o digest do snapshot; `QuiesceSource` confirma a suspensão; `Commit` transfere para um worker com epoch incrementado; `Abort` cancela com epoch incrementado.
- `CanSimulate` permite que testes demonstrem o *fencing*: a origem pode simular até ser congelada, nenhum lado pode simular durante a barreira, e somente o destino com epoch novo pode simular após o commit.
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
**O diagrama é conceitual.** O protótipo inclui HTTPS/mTLS em testes isolados, mas ainda não implementa gRPC, consenso, serialização por província nem transferência de sessões WebSocket em produção. Para não permitir `split brain` em um cluster real, `CanSimulate` precisa ser incorporado ao loop real dos workers com epochs persistidos e autoridade consistente, inclusive sob partições de rede. Um coordenador apenas em memória não oferece isso.

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

## Fase 2 — transporte privado autenticado de snapshots (experimental)

A biblioteca `server-go/cluster/transfer_wire.go` agora contém um **receptor HTTP separado, destinado a redes internas com HTTPS/mTLS**, e um remetente que valida a confirmação do destino. O receptor não é registrado no `cmd/terrania` nem no `cmd/gateway`, portanto **não há endpoint novo na VPS**.

- **Identidade de serviço**: exige certificado de cliente validado pela CA interna no handshake TLS, com URI SAN `spiffe://terrania.internal/worker/<id>`, sem confiar em cabeçalhos fornecidos pelo usuário. O destino deve corresponder ao ID do ticket do coordenador. O cliente também verifica o certificado do servidor pela CA configurada. Esta etapa usa testes com CA temporária; não instala nem distribui chaves de produção.
- **Formato e integridade**: `RegionSnapshot` versionado; SHA-256 com separação de domínio vincula província, epoch, tick, sequência, tamanho e bytes opacos. Dados serializados são **opacos** nesta fase, ainda não há exportador/importador real de `engine.Room`.
- **Tamanho e pressão de memória**: máximo de 8 MiB de dados por mensagem, 12 MiB de envelope HTTP, no máximo 16 snapshots em preparação por worker, com cópia defensiva do payload.
- **Ordem segura**: sob o lock do tick da origem, produzir o estado e seu digest; registrar `Begin` e `FreezeSource` sem liberar o lock; depois enviar o payload via HTTPS/mTLS; o receptor valida e guarda em memória; o remetente confere a confirmação; só então o coordenador chama `QuiesceSource` e `Commit`.
- **Falhas**: rejeita alterações de snapshot, versão inválida, certificado de worker errado, sessão sem mTLS, token inválido, reenvio após commit, destino em preparação lotado e HTTP redirecionado. O receptor só marca `StageDestination` depois de guardar o payload e valida o ticket ativo.
- **Não é alta disponibilidade pronta**: tickets, registros e snapshots ainda são **voláteis**. Um processo encerrado perde os registros de controle e a cópia do estado. Persistência transacional e reconciliação de epochs, aplicação do snapshot em uma sala inativa, inspeção de sucesso e ativação sincronizada no motor são próximas fases obrigatórias.

## Fase 3 — estado restaurável do motor Go, ainda isolado

`engine.Room.ExportState()` cria uma representação JSON privada, versionada (`RoomStateVersion=1`) e limitada a 1 MiB, contendo **todo o estado mutável atualmente usado na simulação da sala**: ID, seed, relógio de spawn, ordem de jogadores, entrada e ataque pendente, data do último input, contagem de kills, posição/velocidade, vida, orientação, cooldown de ataque, invulnerabilidade, knockback e golpe pendente; para mobs inclui HP, pulse, dano, cooldown e impulso; e preserva a ordem dos mobs derrotados.

`engine.RestoreRoomState([]byte)` valida a versão, o ID/seed, limites atuais de 12 jogadores e 96 monstros, 5000 registros derrotados, identificadores duplicados, limites espaciais, campos não finitos, dados inválidos, JSON extra e payload muito grande **antes de criar uma nova sala**. A sala restaurada possui mapas, jogadores e monstros independentes da origem. Não restaura handles nativos do Rust: buffers e espelhos são recriados sob demanda pelo worker.

Os testes verificam igualdade exata do JSON após exportação e restauração, progressão de múltiplos ticks com resultados equivalentes, rejeição de dados alterados e um envio real do payload através do teste HTTPS/mTLS privado com verificação SHA-256, seguido de restauração em uma sala **inativa**.

**Limites importantes:** a captura exige exclusão mútua com a goroutine de tick e inputs. `RegionDirectory` e `SnapshotReceiver` continuam exclusivamente em memória, e o destino restaurado **não** é ativado automaticamente no loop multiplayer. Sessões WebSocket, reservas do lobby, encaminhamento de clientes, inventário (ainda inexistente no motor atual) e controle distribuído de epochs não fazem parte do codec. O código atual não sustenta failover entre VPSs; precisa de journal/persistência e fences verificáveis por workers antes de qualquer uso real.

## Fase 4 — journal local persistente da autoridade, recuperação fail-closed

A implementação experimental `NewPersistentRegionDirectory(router, path)` usa um **arquivo de journal absoluto e privado (modo 0600)** para registrar cada mudança de autoridade e cada etapa de transferência, com uma sequência monotônica, SHA-256 do registro e `fsync` **antes** de publicar a mudança na memória. O formato é append-only, de escritor único e não exige uma base de dados ou serviço novo nesta fase. Se a gravação falhar, o diretório entra em falha e `CanSimulate` passa a negar autoridade.

Ao reconstruir o diretório após uma queda, o processo verifica a sequência e os checksums, rejeitando registro truncado, inválido ou adulterado. Todas as províncias recuperadas entram em fase **`recovery-required`**, independentemente de o último registro dizer que estavam ativas ou migrando: `CanSimulate` retorna falso, `Begin`, `Commit`, `Abort` e registro do mesmo owner não podem reativar uma região silenciosamente. É uma proteção deliberada contra *split brain* em testes de reinicialização.

**O journal registra SOMENTE metadados de controle** (owner, epoch, ticket de transferência e fases), não o estado do jogo. O `SnapshotReceiver` padrão armazena dados em memória; há agora um receptor experimental opt-in com arquivo durável. Ainda não existe um mecanismo de consenso nem uma prova de parada de workers remotos. Assim, **não implementa failover nem autoriza retomada automática**. A fase posterior deverá usar armazenamento confiável para snapshots, reconciliação explícita por operador/controlador com comprovação de isolamento dos workers e epochs verificáveis no loop real, antes de permitir que uma província volte a simular.

**Segurança:** o arquivo contém nonces de transferência confidenciais. O caminho deve ser privado e não compartilhado em rede; não colocar o journal no Git nem registrar tickets em logs. A API de journal não deve ser exposta no gateway público. Não usar um mesmo arquivo para dois coordenadores simultaneamente. O sistema continua experimental e sem persistência ou portas habilitadas na VPS.

**Exclusividade local do arquivo:** um marcador `.lock` criado com `O_EXCL` impede a abertura simultânea por um segundo processo no mesmo filesystem. O fechamento limpo apaga o marcador; após crash ele permanece intencionalmente e exige verificação manual de que nenhum coordenador antigo está executando antes de ser liberado. **Não é uma trava distribuída nem um mecanismo de eleição de líder.**

## Fase 5 — snapshots duráveis e inspeção de recuperação (experimental)

O componente `SnapshotArchive` mantém **snapshots completos e imutáveis** em um diretório absoluto com permissões `0700` e arquivos `0600`. O nome de cada arquivo depende de província e token de transferência já validado. A criação utiliza exclusividade (`O_EXCL`), `fsync` do arquivo e do diretório antes de considerar a cópia persistida. Uma tentativa idêntica é idempotente; cópias divergentes e arquivos incompletos são rejeitados, **não reparados silenciosamente**. Limites: máximo de 128 registros em disco por instância e o mesmo teto de mensagem do transporte privado, sem remoção automática dos arquivos. Necessita limpeza deliberada e procedimento de retenção antes de produção.

`NewArchivedSnapshotReceiver` é um receptor HTTPS/mTLS **opcional**: verifica identidade e ticket, grava o snapshot no disco, revalida a fase do coordenador e **só então** devolve confirmação de staging. Um disco lotado ou arquivo corrompido bloqueia a confirmação; nenhum worker é ativado. Continua fora do gateway e do worker de produção.

`InspectRecoveredProvince` cruza, em modo **somente leitura**, o journal reiniciado (`recovery-required`) com a cópia persistida. Confere token, worker, epoch, checksum e se `engine.RestoreRoomState` aceitaria o payload. O retorno é um relatório sem dados de jogadores ou tokens e marca `SafeToResume=false` em qualquer situação. Ele não elege líder, remove lock, desfaz freeze, prova que o antigo worker está desligado ou restaura sessões WebSocket.

**Ainda falta:** coordenação distribuída, isolamento de worker remoto confirmado, serialização por província em vez de sala inteira, ativação autoritativa no loop de jogo, transferência de conexões e política de expiração/limpeza da coleção de snapshots. Não foi instalado armazenamento na VPS e nenhum snapshot real de jogadores foi coletado.
