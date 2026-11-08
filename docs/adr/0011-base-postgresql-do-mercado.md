# ADR 0011 — Base PostgreSQL isolada e catálogo conectado

Decisão de implementação do ADR 0010, autorizada pelo responsável em 2026-11-08.

Criar `terrania` na instância existente, com proprietário sem login, identidade
separada de migração e API de consulta. Usar rede exclusiva e autenticação SCRAM
nessa sub-rede, preservando PostgreSQL, redes e permissões dos outros projetos.
Credenciais são arquivos privados montados somente nos processos necessários.

A primeira integração é o catálogo dos 16 itens já utilizados pelo jogo. Não
inventar raros, não emitir posses fictícias e não confiar no localStorage para
criar valor negociável. Contas, itens raros, confirmações, estados e livro-razão
são estruturados desde já, com transação interna testada. Autenticação e o fluxo
de cofre/recibos continuam sendo uma etapa de produto, com escrita bloqueada na
API de consulta até essa integração estar validada.

O catálogo na web consulta o backend HTTPS. O frontend nunca se conecta ao
PostgreSQL diretamente. O nome histórico multiplayer do container pode continuar
durante essa migração, preservando o contrato de deploy e evitando interrupção.

Antes de persistir dados reais, backup deve ser restaurado em base isolada e ter
cópia externa criptografada. Código não substitui backup de contas e inventário.
Ver [operação PostgreSQL](../../server/db/README.md) para contratos e limites.
