# PostgreSQL do Terrânia — instalação e recuperação

Estado conferido na VPS em 2026-11-08; não inferido apenas do CI.

## Instalação comprovada

- Instância existente `vps-postgres`, PostgreSQL 18, sem nova instância ou porta pública.
- Banco `terrania`, dono sem login `terrania_owner`, migrador exclusivo
  `terrania_migrator` e consulta do site com `terrania_app` (sem superuser,
  criação de bancos ou criação de usuários).
- Rede interna `terrania_db_private`; HBA exige SCRAM nessa rede e recusa acesso
  aos demais bancos/identidades. Redes/regras originais foram preservadas, sem
  reiniciar PostgreSQL.
- Schema 1, nove tabelas e 16 definições de itens derivadas do jogo. Nenhuma
  conta, posse de raro ou anúncio fictício foi criado.
- Backend `f1bc1d096735962e45e9789525fdc38ed59ff97d` verificado na VPS e por HTTPS;
  `/market/health` retornou `ready:true`, schema 1, e `/market/catalog` retornou
  os 16 IDs únicos. A publicação seguinte deve confirmar novamente SHA/saúde.
- `/health` verifica o banco quando habilitado. Uma falha não vira sucesso vazio.

O nome técnico histórico do container é mantido para compatibilidade do deploy.
O Compose efetivo já inclui a montagem privada da senha e a rede de dados; o
broker preserva essa configuração ao instalar novas imagens. Não trocar pelo
Compose de exemplo sem essas configurações.

## Backup real

- `terrania-postgres-backup.timer`: diário, 03:30 UTC com pequeno atraso aleatório.
- `pg_dump` somente de `terrania`, CMS AES-256-GCM para certificado público,
  snapshots em `/var/backups/terrania`, retenção de sete dias.
- A chave privada de recuperação permanece no computador do responsável, fora
  dos repositórios. Não é colocada na VPS nem no GitHub.
- Tarefa Windows `Terrania-PostgreSQL-ExternalBackup`: cópia horária criptografada,
  sem duplicar conteúdo igual. Usa `terrania_backup`, uma chave SSH de leitura
  com forced-command, sem sudo, Docker, terminal ou encaminhamento de portas.
- Execução externa depende do computador ligado, rede disponível e conta Windows
  conectada; consultar `last-pull.json`/`last-pull-error.json` no diretório privado.

Uma cópia externa foi decifrada com autenticação e restaurada em banco temporário
isolado. Foram conferidos os 16 itens, schema 1 e checksum da migração; o banco
temporário foi removido. O original e os demais bancos não foram alterados pelo
teste. Recibo local: `restore-proof.json`, junto ao material privado de recuperação.

## Recuperação e mudança de versão

1. Conservar certificado, chave privada e snapshots externos. O repositório não
   contém essas chaves nem substitui o backup de dados.
2. Em uma recuperação, criar primeiro as identidades/dono exclusivos do Terrânia,
   rede e acesso privados. Um dump desse banco não inclui roles/senhas globais.
3. Decifrar o snapshot com OpenSSL CMS; somente usar a saída se o comando concluir
   com sucesso e o arquivo for um dump PostgreSQL válido.
4. Restaurar primeiro em banco novo isolado, com `pg_restore --exit-on-error`,
   dono `terrania_owner`, verificar schema/catálogo e só depois planejar a troca.
   Não apagar/recriar a base original para testar.
5. Rollback de código preserva a base e seus volumes. Não fazer down migration
   destrutiva. Antes de nova migração, gerar/conferir backup e checksum aplicado.

Credenciais ficam somente em `/etc/terrania-postgres`, com permissões privadas;
recibos de provisionamento, schema e preparação do Compose ficam nesse diretório.
Não copiar seu conteúdo para logs, arquivos VITE ou comentários públicos.

## Limites desta etapa

O site consulta o catálogo; cadastro/login, emissão autenticada de raros e recibos
para o solo ainda precisam da integração de produto do ADR 0010. A conta de
consulta não pode gravar inventário, ler contas ou executar a troca interna.
Os testes PostgreSQL demonstram invariantes e concorrência da estrutura, não uma
economia pública já liberada. Mundo, combate e save solo continuam no navegador.
