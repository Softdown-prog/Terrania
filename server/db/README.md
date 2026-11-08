# PostgreSQL do Terrânia — base do ADR 0010

Módulo dono: `node-server`. O jogo e o save solo continuam no navegador. Este
módulo persiste catálogo e prepara contas, identidade externa, itens raros únicos,
cofre/retirada, propostas, confirmações, idempotência e auditoria. Não cria itens
raros fictícios nem importa o save editável como prova de propriedade.

## Contrato desta primeira etapa

- Banco `terrania`, dono sem login `terrania_owner`, migrador dedicado
  `terrania_migrator` e usuário de consulta `terrania_app`.
- `GET /market/catalog`: os 16 itens existentes, lidos do PostgreSQL. Falha é 503,
  nunca uma lista inventada. Cache interno de dez segundos limita consultas.
- `GET /market/health` e `/health`: prontidão real e versão de schema, sem DSN,
  usuário, senha, contagem de contas ou dados de jogadores.
- A API web recebe somente SELECT no catálogo/versão. Não recebe DDL, acesso a
  contas, escrita de inventário ou EXECUTE da transação de troca.
- `market.confirm_trade` é infraestrutura transacional interna, testada com duas
  confirmações, posse/versão, travas ordenadas, idempotência e concorrência.
  Ainda depende de serviço de identidade autenticada para virar uma API de jogo.
- Não há cadastro/login, reivindicação pública de raro ou emissão de recibo solo
  nesta etapa. Esses fluxos precisam integrar identidade e inventário real antes
  de receber permissões de escrita. Nenhuma cobrança faz parte deste módulo.

## Migração e deploy

`node dist/server/src/db/migrate.js`, com cwd `/app`, aplica SQL empacotado,
checksum imutável e trava transacional; executa como `terrania_owner`. O catálogo
deriva de Equipment/Food/Weapons/Inventory existentes. Repetir não duplica itens.
Migrações não são executadas pelo servidor HTTP nem em cada inicialização.

Configuração privada do servidor: `TERRANIA_DB_ENABLED=1`, `TERRANIA_DB_HOST`,
`TERRANIA_DB_USER` e `TERRANIA_DB_PASSWORD_FILE`. O banco e a porta são fixos. O
pool tem no máximo quatro conexões e timeouts. Credencial e rede PostgreSQL não
entram em VITE, assets, respostas HTTP, GitHub ou logs.

Na VPS, usar rede privada exclusiva com o PostgreSQL existente. A configuração
antiga da instância usa trust em sua rede original: a nova sub-rede exige regras
HBA específicas SCRAM para `terrania_app`/`terrania_migrator` no banco `terrania`,
seguidas de reject para os demais acessos dessa sub-rede. Recarregar HBA sem
reiniciar o PostgreSQL; preservar as regras dos projetos existentes.

## Validação e recuperação

Workflow `postgres-market.yml`: PostgreSQL 18 descartável, migração repetida,
catálogo, permissões negativas e transações concorrentes. Os testes não aceitam
endereços remotos nem nomes de bases de produção; não apagar/recriar uma base
existente para rodar a suíte.

Antes de dados reais, verificar pg_dump/pg_restore em banco isolado e manter
cópia externa criptografada. Reversão do código desliga a integração preservando
banco e dados. Não usar down migration que apague contas ou inventário.

Estado de código/CI/instalação/backup deve ser confirmado pelo PR e recibo de
implantação; presença desses arquivos não prova que a VPS foi atualizada.
