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

## Fase 6 — bloqueio de ticks por província e restauração controlada (experimental)

A camada `cluster.GuardedRoom` controla um único `engine.Room` no laboratório sem expor ponteiros mutáveis: `Tick`, `Input`, `Join`, `Leave` e leitura de estado passam pela verificação do `workerID + epoch` do diretório. Nenhum comando de jogador deve ser aceito se a região estiver congelada, com epoch antigo ou em recuperação.

O coordenador passou a ter um **gate `sync.RWMutex` por província**: `WithAuthority` usa leitura enquanto um tick roda; `FreezeSource` e `Abort` exigem exclusividade. Assim, o congelamento espera ticks locais em andamento e regiões distintas não compartilham uma trava longa de simulação. `CaptureAndFreeze` mantém a exclusividade durante `engine.Room.ExportState`, reserva do ticket e gravação da fase congelada no journal. O destino usa `NewStagedGuardedRoom` para restaurar os dados **sem simular** e só pode chamar `Activate` depois do commit do epoch novo.

Os testes cobrem rejeição de inputs após congelamento, rejeição de ticks de epochs antigos, espera por ticks anteriores, progresso independente em províncias distintas, rejeição de snapshots alterados, proteção após reiniciar o coordenador e envio real em servidor de teste HTTPS/mTLS antes de ativação.

**Limites decisivos:** `GuardedRoom` ainda é um *sandbox local de uma sala por província*, não substitui `roomSession` de produção. Workers em máquinas diferentes **não compartilham** essas travas Go. `RegionDirectory` não implementa leases ou consenso distribuído, e um `Close`/falha abrupta não interrompe imediatamente callbacks de tick já em execução. Integração multiplayer, streaming de estado de várias salas, sessões e isolamento remoto precisam ser tratados separadamente. Sem endpoint aberto, PR, merge ou deploy.

## Fase 7 — autorização temporária assinada para workers remotos (laboratório)

O componente experimental `WorkerLeaseGate` vive no processo do worker, separado dos mutexes e do journal do coordenador. Cada instância cria um **BootID aleatório de 128 bits**; somente permite operações quando apresenta uma autorização **Ed25519** assinada por uma chave pública de coordenador previamente configurada, restrita a `WorkerID`, `Province`, `Epoch`, `BootID` e `Sequence` monotônica. Autorizações de uma inicialização anterior, com assinatura alterada, epoch diferente, outro worker ou sequência repetida são rejeitadas.

A validade máxima assinada é de **2 segundos**, e o worker encerra a autorização um pouco antes do horário anunciado. A expiração é calculada com um prazo local monotônico **depois de adquirir o lock**: um tick demorado não pode estender acidentalmente o prazo durante uma renovação. Sem renovação por perda da conexão, `WithLease` deixa de executar ticks/inputs; uma renovação tardia **não** ressuscita a instância sem um procedimento explícito de recuperação. `Revoke` espera os callbacks locais terminarem antes de confirmar e bloqueia novas autorizações na mesma instância. Um callback Go bloqueado pode atrasar a revogação: não há preempção automática.

`LeaseBoundRoom` demonstra a aplicação das permissões sobre operações de `engine.Room`, independente do `RegionDirectory` local. O endpoint experimental `WorkerLeaseEndpoint` recebe instalações e revogações **somente** em HTTPS/mTLS com certificado de cliente cuja URI SAN verificada é `spiffe://terrania.internal/coordinator/control` (identidade configurável). O corpo da instalação continua exigindo a assinatura Ed25519. Cabeçalhos HTTP, conexões anônimas, certificados de worker e assinaturas falsas não autorizam ações. A resposta de revogação só é produzida após a barreira local de ticks. O endpoint não é conectado ao `cmd/terrania` ou ao gateway; nenhum certificado de produção é emitido, instalado ou exportado.

**Limites de segurança antes de usar em vários processos:** uma assinatura autêntica **não garante unicidade global de proprietário**. Um emissor incorreto pode assinar permissões sobrepostas para dois workers; não existe ainda um coordenador com consenso e persistência de *leases*, nem política global de espera até expiração para evitar *split brain* na promoção de um novo dono. Relógios precisam de sincronização/limites de desvio; um callback de duração arbitrária pode ultrapassar seu prazo. A confirmação mTLS não prova desligamento de outra máquina fora do protocolo. Portanto o novo mecanismo apenas fornece **expiração local e revogação autenticada experimental**, não autoriza failover ou migração automática na VPS. Prioridade seguinte: controlar concessões com persistência e verificar o intervalo seguro de promoção entre workers.

## Fase 8 — coordenador local de concessões com journal (experimental)

`GrantCoordinator` é um controlador **single-writer, sem listener, desacoplado do gateway**. Seu journal append-only (arquivo `0600`, caminho absoluto, marcador `.lock` exclusivo, contador sequencial e SHA-256 por registro) confirma cada concessão em disco via `fsync` **antes** de devolver a autorização Ed25519 ao worker. A chave privada é fornecida ao processo em memória, nunca gravada no journal; o hash da chave pública identifica o emissor e impede reabrir o journal com um emissor diferente. Falhas de escrita bloqueiam todas as novas concessões.

- `GrantInitial` só cria o primeiro proprietário (`epoch=1`) de uma província ainda desconhecida. Emissão simultânea para a mesma província é serializada, com no máximo uma concessão.
- `Renew` permite somente o **mesmo WorkerID, BootID e epoch**, exige renovação antes do fim e sequência estritamente crescente, não podendo reduzir a data de expiração anteriormente autorizada.
- `RevokeAndRecordFence` envia uma revogação pela conexão mTLS privada com o worker antigo, confere a identidade e a sequência no ACK e só registra `Fenced=true` depois da confirmação de que as operações locais terminaram. Uma falha de rede **não** é tratada como revogação.
- `Promote` exige **as duas condições**: revogação remota comprovada pelo canal configurado e fim do prazo da maior concessão anterior, acrescido de **300 ms de margem experimental**. Apenas então reserva o epoch seguinte e emite a autorização assinada do novo worker.
- Após reiniciar, o journal é relido verificando sequência, transições, integridade e identidade do emissor. Todas as províncias existentes entram em `RecoveryRequired`; nenhuma pode renovar, revogar ou ser promovida sem um procedimento posterior de reconciliação. Um lock abandonado após crash exige isolamento/manualidade.

**Importante:** isso evita concessões conflitantes **apenas quando existe exatamente um coordenador ativo usando o mesmo journal local confiável**. Sem uma eleição de líder/quorum, relógios com limites garantidos, atestado de isolamento de máquinas e integração real ao `roomSession`, continua **não sendo consenso distribuído**. A margem de 300 ms é apenas para testes; não serve como garantia de tolerância a falhas de clock, latência ou ticks bloqueados por tempo indefinido. Não existe failover automático de servidor. Os testes de promoção usam HTTPS/mTLS local e não modificam as chaves, banco de dados ou containers da VPS.

## Fase 9 — votação persistente e certificados de maioria (laboratório)

`ElectionWitness` é um **votante independente**, com seu próprio arquivo append-only `0600`, lock exclusivo, número de termo monotônico, registro sequencial e SHA-256. O votante grava e sincroniza cada termo/voto com `fsync` **antes** de assinar uma resposta Ed25519. A assinatura contém domínio do protocolo, identificador do cluster, identificador do votante, candidato e termo. `ObserveTerm` persiste termos mais recentes mesmo sem escolher candidato, rejeitando propostas anteriores. Após reinicialização, nenhum processo pode alterar um voto já registrado para aquele termo. Arquivos corrompidos, permissões inseguras e segundo escritor são rejeitados, sem assumir liderança por conta própria.

`VerifyElectionCertificate` exige um cadastro explícito e idêntico de **3, 5, 7 ou 9 votantes** de chave pública distinta, maioria estrita de votos válidos e únicos, e correspondência exata de cluster, candidato e termo. O código não trata cabeçalhos HTTP, resultados de votos não verificados ou contagens de nós como prova de autoridade. A CI exercita divisão de 5 votantes em 2/3, ataques com votos repetidos/falsificados, votos de candidatos concorrentes, persistência após reinício e concorrência no mesmo termo, sob o detector de corrida.

**Limitação fundamental:** isto **não é Raft nem um coordenador distribuído funcional**. Não há transporte interprocessos, eleição por timeout, replicação de log, `commit index`, persistência compartilhada por quórum, equivalência de dados entre nós, aplicação da política de voto com log atualizado, nem ligação com `GrantCoordinator`. Dois certificados de **termos diferentes** podem ser válidos historicamente; sem os mecanismos de reconciliação de log/fencing e sem aguardar todas as permissões anteriores, nenhum deles autoriza iniciar um worker. A próxima fase deve definir um log replicado e seus invariantes, preferindo uma biblioteca de consenso consolidada antes de ativar processos reais na VPS. Sem PR, merge, deploy ou novas portas.

## Fase 10 — journal de propostas de autoridade por réplica, com confirmação por maioria (laboratório)

A camada `ReplicaLog` cria um **log local por votante**, imutável e separado do journal de concessões. Cada entrada `AuthorityLogEntry` contém um identificador de cluster/líder, termo, índice consecutivo, hash da entrada anterior e somente o SHA-256 de uma **proposta** `grant|renew|revoke|promote`. Não inclui dados pessoais, estado de jogadores, chave privada ou a própria autorização de jogo. Cada réplica verifica um `ElectionCertificate` com maioria de votos previamente assinados antes de aceitar uma proposta.

A réplica escreve um registro versionado no arquivo privado `0600` com lock exclusivo, tamanho limitado, numeração de escrita, checksum e `fsync`; **só após a confirmação em disco** assina o `ReplicaReceipt` (Ed25519), vinculando cluster, réplica, termo, índice e hash integral da proposta. Reenvios idênticos são idempotentes. Índices ausentes, conteúdos diferentes no mesmo índice, divergência do hash anterior, termos já superados, tentativas de truncar a cadeia e arquivos adulterados são rejeitados. O diário pode ser reaberto para auditoria após reinicialização, preservando o termo mais alto observado. Para limitar a superfície de testes, cada réplica recebe no máximo **256 entradas**, sem retenção ou compactação automática.

`VerifyReplicaCommitProof` valida, **sem executar ações**, se uma maioria de membros do cadastro fixo possui recibos criptográficos válidos para a **mesma entrada, mesmo termo e mesmo índice**, junto de um certificado de votação válido. Nos testes, dois recibos em um cluster de cinco não bastam; três validam a evidência de persistência. São testadas partições simuladas, corrupção, recibos falsificados ou duplicados, conflito de entradas, reinício, troca de termo e gravação concorrente. A CI executa `TestReplica*` com detector de corrida.

**Limitação crítica:** essa é uma **prova de persistência majoritária para propostas**, NÃO uma implementação do protocolo Raft ou commit index operacional. O certificado de votação da fase anterior não verifica a atualização de logs dos candidatos; nem este protótipo implementa AppendEntries, sincronização de seguidores atrasados, resolução de divergência, transferências automáticas, associação a um líder ativo, *read index*, aplicação de comandos com idempotência ou recuperação de concessões baseada em estado consensual. A persistência local não funciona como quórum distribuído na VPS. Nenhum recibo permite chamar `GrantCoordinator.GrantInitial`, `Promote` ou `WorkerLeaseGate.Install`. **Manter isolado até escolher e integrar uma biblioteca madura de consenso, e garantir o fencing efetivo dos workers antigos.** Sem PR, merge, portas ou deploy.

## Fase 11 — eleição condicionada ao histórico e sincronização de prefixos (laboratório)

A nova API `ElectionWitness.VoteWithReplica` une o voto à consulta de um `ReplicaLog` **da mesma identidade de membro, cluster e chave pública**, mantendo o bloqueio de escrita durante a verificação de atualização do candidato. O `ReplicaLogTip` do candidato informa o termo e índice do último registro e o hash integral de sua entrada. A regra compara primeiro o último termo, depois o índice; quando são idênticos, também exige hash idêntico. Um candidato cuja ponta está atrasada **não recebe voto**. Antes de conceder voto, um termo de eleição superior é persistido no journal da réplica, impedindo novos appends do líder antigo, e no journal de eleição, impedindo votos tardios de termo anterior. Uma falha de persistência bloqueia o voto.

Os votos estritos incluem a ponta do candidato no **payload assinado Ed25519**. Essa ponta também é persistida no journal do votante antes da assinatura: votos do mesmo termo não podem ser reemitidos com outra ponta após um crash, e um voto legado não pode ser convertido retroativamente em voto estrito. `FreshElectionCertificate` só é válido com maioria de votos verificados e assinados para a **mesma ponta**, sem aceitar votos do caminho legado `ElectionWitness.Vote`. `ReplicaLog.AppendFreshCandidate` aceita somente esse tipo de certificado, continua dependente da cadeia de hashes e não publica alterações na autoridade de jogadores. As APIs legadas continuam exclusivamente para os testes históricos e não estão habilitadas para produção.

A leitura `ReplicaLog.ReadReplicaRange` fornece cópias limitadas de entradas consecutivas e `CatchUpReplicaRange` pode adicionar **apenas um prefixo de propostas do mesmo termo** a uma réplica atrasada, validando cada hash, índice e certificado; reenvios iguais são idempotentes e prefixos divergentes são rejeitados, não apagados. O limite de 256 entradas permanece. A CI executa testes com `-race` sobre competição entre votação e append de termo antigo, partição, adulteração dos votos, réplica atrasada e tentativa de reescrita.

**Atenção:** este é um passo de segurança incremental, **não Raft completo**. Não há RequestVote/AppendEntries em rede, relógios de eleição, serialização de liderança real, commit index linearizável ou sincronização de entradas de diferentes termos. A ponta do candidato é uma alegação fornecida ao método (não há atestado remoto de honestidade), e a prova de maioria histórica não implica liderança *atual*. A próxima implementação deve usar uma biblioteca Raft madura para reconciliar entradas de termos diferentes, operar com quorum real e controlar a aplicação dos comandos. Nenhuma rota foi registrada em `cmd/terrania`, nenhum worker da VPS foi alterado e nenhum deploy foi realizado.

## Fase 12 — laboratório HashiCorp Raft (dependência isolada, sem produção)

Criado o módulo independente `server-go/cluster/raftlab` para integrar a biblioteca madura `github.com/hashicorp/raft`, versão **v1.7.3**, sem modificar o `server-go/go.mod` do backend multiplayer. A CI executa verificação de dependências, `go vet`, testes com `-race` e testes regulares desse módulo **separadamente** dos testes anteriores do cluster.

`raftlab.NewCluster` permite montar uma rede inteiramente **em memória**, de três ou cinco membros. Ele cria instâncias reais `raft.Raft` independentes, com stores, snapshots, transportes conectados e configuração de membros votantes. A biblioteca cuida das eleições, termos, replicação, reconciliação de logs, reconhecimento de quórum e aplicação na FSM. O laboratório pode isolar um nó (partição simulada), reconectar a rede e verificar a convergência; nenhuma porta TCP ou recurso de nuvem é aberto.

A FSM `raftlab.FSM` aplica **somente registros auditáveis de propostas**, com ID idempotente, província, epoch, tipo `grant|renew|revoke|promote` e digest de conteúdo. Ela não possui chaves privadas de workers, não executa `GrantCoordinator` e não pode acionar gameplay. `Snapshot` e `Restore` são limitados e verificam entradas, rejeitando conflitos e conteúdo desconhecido. A resposta de `Propose` só representa êxito se o *future* do Raft confirmou a aplicação; timeout não é tratado como reprovação definitiva (resultado **desconhecido**, exigindo consulta do estado antes de repetir uma operação).

A suíte testa confirmação em três e cinco nós, isolamento de um líder antigo, eleição com a maioria restante, recuperação após reconexão, integridade de snapshot, rejeição de comandos inválidos e idempotência.

**Limitações:** o transporte e os stores continuam *in-memory*; o sistema não é um serviço Raft durável entre máquinas. Ainda faltam armazenamento realmente persistente dos logs/stable store/snapshots, conexão autenticada entre os nós, bootstrapping seguro, reconciliação do estado de autoridade com as permissões antigas e controle de recuperação/rejoin. Não usar resultado do laboratório para liberar `GrantCoordinator.Promote` ou ativar o jogo. A VPS e a branch `main` não são modificadas.

## Fase 13 — stores Raft duráveis em disco (laboratório isolado)

Adicionado `raftlab.OpenDurableCluster(root, membros...)` exclusivamente para testes locais. A integração utiliza `github.com/hashicorp/raft-boltdb/v2` versão **v2.3.1** para armazenar, em arquivo bbolt, o log e o *stable store* do Raft, com sincronização normal de disco, e `raft.NewFileSnapshotStore` para snapshots persistentes. O estado fica em uma árvore de diretórios privada `0700` e arquivos `0600`, sem guardar chaves de usuários, servidores ou permissões de gameplay. O transporte entre nós continua **em memória**.

O laboratório mantém `members.json` versionado e imutável, com a ordem e identidade dos três ou cinco membros. O primeiro boot faz *bootstrap* da configuração inicial; reinícios posteriores verificam a identidade e chamam `raft.HasExistingState`, **sem** criar silenciosamente um cluster novo quando arquivos do membro sumiram. A pasta deve ter caminho absoluto, não aceitar symlinks, e armazenamentos simultâneos disputando o mesmo bbolt falham pela trava do banco. Inicializações interrompidas ou manifestos divergentes falham fechados em vez de tentar consertar a configuração sem auditoria.

Os novos testes checam persistência de commits e snapshots durante shutdown/restart completo dos três membros, recusa de membros trocados, stores ausentes/corrompidos, permissões inseguras e manifestos em symlink. As verificações são executadas separadamente na CI do módulo experimental com `go test -race`.

**Limitação:** persistência local não equivale a implantação em múltiplas máquinas. Faltam transporte mTLS autenticado, provisionamento seguro de identidade de cada nó, inicialização de cluster por operações coordenadas, proteção de armazenamento contra perda do disco e integração do estado comprometido ao fencing dos workers. O teste não conecta `GrantCoordinator`, não abre portas, não usa PostgreSQL da VPS e não autoriza failover automático.
