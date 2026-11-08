# Revisão técnica do multiplayer — Node, Go e Rust (2026-11-08)

Revisão feita sobre a `main` em `c1d6b15`. Objetivo: responder se o caminho multiplayer se sustenta, onde está o risco e o que foi corrigido. Esta revisão **não** substitui teste de carga na VPS nem jogar com pessoas reais.

## Resposta curta

| Pergunta | Resposta |
| --- | --- |
| O servidor Node de produção aguenta o limite atual (48 conexões, 12 por sala)? | **Sim, com folga de CPU.** Medido: ~2 % de um núcleo no limite. Havia, porém, uma queda remota trivial (corrigida). |
| O multiplayer vira gargalo no futuro? | **Sim, mas por banda e arquitetura, não por CPU.** Cada jogador recebe ~25 KB/s de JSON. 1.000 jogadores ≈ 25 MB/s (~200 Mbit/s) só de saída. |
| O Go substitui o Node hoje? | **Não.** Falta inventário, loot, XP, equipamento e comida. O cliente cai em um modo antigo (entrada contínua). |
| O Rust é necessário para memória? | **Não hoje.** Está correto e seguro, mas é opcional (build tag) e fora do caminho de produção. |

## O que foi corrigido (commits diretos na `main`)

### Node — `server/src/main.ts` (produção)
1. **Queda remota com uma requisição.** `GET //` fazia `new URL` lançar dentro do listener HTTP e do `upgrade`; sem handler, o processo inteiro caía (todas as salas e jogadores). Reproduzido antes da correção. Agora responde 400.
2. **Vazamento de salas.** A sala entrava no mapa antes do handshake. Se o `ws` rejeitasse o handshake (chave inválida), a sala vazia ficava para sempre. Com 8 nomes de sala o limite `maxRooms` se esgotava e novas salas ficavam recusadas até reiniciar. O `Origin` pode ser forjado por clientes que não são navegadores, então isso é explorável. Agora a sala só é registrada no aceite.
3. **Sem isolamento de falhas.** Exceção em `Room.tick`, no snapshot ou no tratamento de mensagem derrubava todas as salas. Agora só a sala/cliente afetado é encerrado (close 1011).
4. Um `close` antigo não remove mais uma sala nova de mesmo id; `socket.on('error')` no upgrade (o Node remove o handler padrão nesse ponto).

Testes de regressão: `server/tests/hardening.test.ts` (**falham no código anterior**, passam agora).

### Go — `server-go/cmd/terrania/room_runtime.go`
Um `panic` em `Tick`/`SnapshotFor` mantinha o mutex da sala e o `defer` de `Close` tentava tomá-lo de novo: a sala **congelava com os jogadores presos**. Agora `tickRoom` recupera o panic, a sala é retirada do registro e só seus jogadores recebem close 1011. Teste: `TestRoomPanicRetiresOnlyThatRoom` (falha sem a correção).

### Rust — `rust/spatial-kernel`
`cargo clippy --all-targets -- -D warnings` (o mesmo comando da CI) falhava com 12 erros `float_cmp` em testes. Os testes comparam round-trips exatos de propósito; o lint foi permitido só nos módulos de teste. Também: `.gitignore` para `rust/spatial-kernel/target/` (a pasta entrava no índice de arquitetura) e remoção do arquivo solto `V`.

## Medições (Node, `Room` real, 12 jogadores com todos os recursos ligados)

| Cenário | Tick médio | p99 | Snapshots (10 Hz) médio |
| --- | ---: | ---: | ---: |
| 1 sala × 12 jogadores | 0,08–0,16 ms | 0,4–0,5 ms | 0,25 ms |
| 4 salas × 12 (= 48 conexões, o limite) | 0,29–0,44 ms | ~1,0 ms | 0,8–1,2 ms |
| 8 salas × 6 | 0,29 ms | 1,1 ms | 0,6 ms |

Orçamento de tick: 50 ms. Pico isolado observado: ~9 ms. Snapshot: **2–3 KB por jogador, 10 vezes por segundo.**
Limites desta medição: processo único sem rede real, sem latência de WebSocket, jogadores sintéticos que andam em linha; **no máximo 34 mobs vivos** (o teto é 96).

## Riscos e gargalos futuros (não alterados)

1. **Banda de snapshot (principal).** JSON completo a cada 100 ms, inclusive campos quase estáticos (`gear`, `loadout`, `inventory`). O limite atual de 48 conexões esconde o problema (~1,2 MB/s). Para escalar: deltas, campos estáticos só quando mudam, ou formato binário. É mudança de protocolo, por isso exige decisão sua.
2. **Sem limite por IP.** Uma origem permitida pode ocupar as 48 vagas. Um limite correto depende de como o Caddy repassa o IP (`X-Forwarded-For`) e de redes compartilhadas (CGNAT, Wi-Fi), então não implementei por suposição.
3. **Node é um único processo, um único laço.** Aceitável nos limites atuais; o plano de escala por salas já passa por Go, mas ver o próximo item.
4. **`send` no Node ignora mensagens quando o buffer passa de 64 KB**, mas nunca derruba o cliente lento. A doc diz "descarte de conexões com buffer grande"; o comportamento real é "descarte de mensagens". Só o heartbeat remove clientes mortos.
5. **Sem persistência multiplayer.** Reiniciar o servidor apaga inventário, XP e progresso da sala (documentado, mas é o maior bloqueio para um modo online "de verdade").

## Go: o que é e o que não é

- Worker e gateway estão bem construídos: reserva de vaga sob lock curto, snapshot que descarta o mais antigo para clientes lentos, relógio por sala, sala criada só depois do upgrade (não tem o vazamento do Node).
- **Paridade de funcionalidades: não existe.** O protocolo Go aceita só `input`. Não há inventário, loot, XP, equipamento, comida, caminhada por tiles nem combate por alvo. Como o `welcome` do Go não anuncia esses recursos, o cliente cai no modo de entrada contínua: não quebra, mas **é outro jogo**. Trocar o Node pelo Go hoje seria uma regressão de gameplay.
- `docs/GO_SCALE_1000.md` fala em preparar 1.000 jogadores **em várias salas**; isso depende do item 1 acima (banda), não só de CPU.

## Rust: o que é

- `EntityKind` é `repr(transparent)` sobre `u16` (sem enum recebido por FFI, portanto sem UB por discriminante inválido). Ponteiros nulos verificados, contagens limitadas, lote validado inteiro antes de aplicar, handles com geração contra uso após liberação. O único `expect` é uma invariante.
- É opt-in (build tag) e **não está no caminho de produção**. Com `panic = "abort"`, qualquer panic em Rust encerraria o processo Go: hoje não há caminho de panic visível, mas vale manter assim.
- "Ajuda no controle de memória": o benefício só aparece com muitas entidades por sala (limite 200 mil). Com 12 jogadores e <100 mobs, o GC do Go/Node não é problema.

## O que **não** foi verificado

- Teste de carga real (1.000 WebSockets, Docker, VPS): **não executado**; Docker e VPS estão fora do escopo autorizado.
- Cluster Go (Raft, handoff, autoscale): `go test ./cluster/... ./autoscale/...` passa, mas o código é tratado como laboratório e a lógica **não foi revisada em profundidade**.
- Build Go com Rust (`-tags` opt-in) e paridade Go↔TypeScript: não executados aqui.
- Playwright online (`tap-online.spec.ts`): não executado nesta revisão.

## Próximos passos sugeridos (em ordem)

1. Decidir o formato do snapshot (deltas/binário) **antes** de qualquer meta de 1.000 jogadores.
2. Persistência mínima de personagem no servidor (o maior bloqueio de produto).
3. Limite por IP, depois de confirmar o repasse de IP no Caddy.
4. Só então expandir o Go até a paridade do Node (inventário, tiles, combate por alvo), com testes de paridade, antes de qualquer corte.
