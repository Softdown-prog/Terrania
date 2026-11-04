# RPG-003 — Fundação de identidade e personagem persistente (não ativada)

**Estado:** código de domínio e adapter SQL isolados, sem rota HTTP de cadastro, sem cookie emitido, sem conexão com banco de produção, sem alterações do WebSocket. A entrada atual continua anônima e NÃO recupera XP depois de sair.

## Modelo de confiança

- Um convidado autenticável só pode ser criado por operação explícita, transacional, com conta UUIDv4, um personagem UUIDv4 e credencial aleatória de **256 bits**. UUID, nome, IP, sala, ID público do WebSocket e localStorage **não são credenciais**.
- O servidor revela a credencial no momento da emissão, mas o banco grava somente SHA-256 dos 32 bytes aleatórios. Sessões expiram em 30 dias, têm revogação e comparação por hash na consulta SQL.
- Cada personagem tem proprietário e revisão. A atualização `SaveAuthoritative` exige identidade previamente resolvida, estado validado, revisão esperada e faz `UPDATE ... WHERE id/account_id/revision` atômico, impedindo substituição por checkpoint atrasado.
- XP, kills, SlimeKills e HP precisam ter origem no **tick autoritativo Go**. O limite é nível 50, XP 36.750 e HP máximo derivado (não aceito do navegador). A camada SQL não oferece nenhuma rota para o cliente escrever progresso.
- Não há senha, e-mail, contas externas ou recuperação de credencial perdida nesta etapa. Para contas duráveis de verdade, adicionar login/recuperação segura em etapa futura.

## Persistência

A migração opcional está em `server-go/characters/migrations/001_characters.sql` e exige **PostgreSQL exclusivo de Terrania**, com permissão mínima. Não executar na VPS ou misturar com as tabelas administrativas do Painel sem uma revisão de migração e rollback.

`server-go/characters` usa apenas `database/sql` e placeholders PostgreSQL. **Nenhum driver SQL está configurado, nenhuma conexão é aberta pelo servidor e nenhum endpoint foi ativado.** O driver e a injeção de conexão, os endpoints autenticados, a criação e rotação de cookie e a política de origem/CSRF serão integrados posteriormente, com testes reais contra PostgreSQL.

Ao conectar o navegador, preferir origem própria ou proxy mesmo-site. Um token de sessão deve ser entregue somente por HTTPS em cookie `HttpOnly; Secure`, com política `SameSite` apropriada, checagem de Origin, CSRF quando necessário e revogação de sessão. Não colocar token em URL, log, telemetria, localStorage ou mensagem de broadcast WebSocket. Cookies de terceiros podem ser bloqueados; avaliar o domínio antes de implementar.

## Testes

`cd server-go && go test -race -count=1 ./characters && go vet ./characters`

O pacote cobre geração aleatória e tamanho de token, hash canônico, nomes/IDs inválidos, limites de progressão, uso de hash no adapter SQL, emissão + resolução + gravação com revisão, conflitos, expiração e revogação, por um driver de teste em memória. **Este driver simulado NÃO substitui um teste de integração PostgreSQL**; este gate será obrigatório antes da ativação real.

## Próxima etapa

Conectar uma conta autenticada à sala Go por identidade de sessão validada, restaurar o perfil de forma transacional e persistir snapshots autoritativos fora do tick de 20 Hz, sem bloquear outras salas. Desenhar serialização/conflito de identidade única entre shards, logout, rotação de credenciais, cookies e testes Android de reconexão antes de qualquer deploy.
