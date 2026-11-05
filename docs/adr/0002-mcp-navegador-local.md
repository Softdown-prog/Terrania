# ADR 0002 — MCP local, somente leitura, derivado de índices

- **Data:** 2026-11-04
- **Estado:** implementado experimentalmente na branch; sem autorização de merge ou instalação na VPS
- **Escopo:** descoberta de arquivos/módulos; não muda gameplay ou serviços online

## Contexto

O Terrania já possui 16 módulos catalogados, índices gerados e regras de camada. Agentes futuros devem localizar as mudanças por responsabilidade sem precisar despejar 10 mil arquivos num contexto. Um servidor MCP remoto administrativo seria arriscado e desnecessário para essa primeira necessidade.

## Decisão

- Usar servidor **MCP local em stdio**, sem listener TCP/HTTP, dependências novas ou credenciais.
- Prover apenas `list_modules`, `locate_file`, `read_module_docs`, `find_tests`, `find_decisions`.
- Derivar informação de `architecture/modules.json` e `docs/indexes/`, gerados e validados pela CI. Recusar leitura arbitrária de caminhos, comandos, rede e edição.
- Limitar argumentos, tamanhos, número de arquivos examinados e quantidade de requisições; testar protocolo e tentativas de escapar da raiz.
- Suportar handshake `2025-11-25`/`2025-06-18` com fallback quando clientes modernos tentarem `server/discover`; futuras versões podem exigir atualização protocolar separada.

## Consequências

- Um usuário pode iniciar o servidor em cliente MCP local, mas ele não está automaticamente conectado ao ChatGPT ou à VPS.
- A busca só é tão atual quanto os índices versionados; obrigatória a checagem `npm run architecture:check`.
- Não confundir acesso somente leitura com backup, recuperação automática, auditoria de segurança, indexação semântica ou capacidade validada para 500 jogadores.
- A evolução do protocolo e instalação remota serão decisões independentes. O código do motor permanece intacto.

## Alternativas rejeitadas

Servidor com shell/sudo, HTTP público sem autenticação, base vetorial obrigatória, dependências grandes para um protocolo simples e importação de todo o repositório para o contexto de um modelo.
