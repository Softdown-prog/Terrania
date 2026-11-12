# MCP de navegação local — Terrania (fase 1)

**Estado:** servidor local implementado nesta branch experimental; **não instalado no ChatGPT, não implantado na VPS e não publicado pela internet**. Nenhum merge na main foi feito por esta etapa.

## Objetivo

Permitir que clientes MCP localizem rapidamente o módulo dono de um arquivo, consultem a documentação aprovada, encontrem testes e recuperem decisões históricas. A fonte é a revisão local do repositório; o MCP **não** inventa ownership nem indexa arquivos ocultos ou não cadastrados.

## Execução local

Requisito: Node.js 24+ e um checkout da branch contendo `architecture/modules.json` e os índices gerados. Não requer pacote MCP externo, segredo, banco, Docker ou porta.

```bash
npm run architecture:check
npm run mcp:navigator
```

Para configurar em um cliente MCP que ofereça **transporte stdio**, use o executável Node com o caminho absoluto para o script (substitua o caminho de exemplo):

```json
{
  "mcpServers": {
    "terrania-navigator": {
      "command": "node",
      "args": ["/caminho/para/Terrania/scripts/mcp/server.mjs"]
    }
  }
}
```

O processo usa o próprio caminho do script para localizar a raiz do projeto. Ele recebe **JSON-RPC 2.0 delimitado por nova linha** no stdin e envia exclusivamente mensagens JSON pelo stdout; não oferece endpoint HTTP nem canal WebSocket. Protocolos suportados no handshake: `2025-11-25` e `2025-06-18`. Clientes da revisão moderna `2026-07-28` precisam aceitar **fallback de initialize**; a nova descoberta `server/discover` ainda não é implementada.

## Ferramentas disponíveis

| Ferramenta | Entrada | Saída |
| --- | --- | --- |
| `list_modules` | `status?` | Módulos, camada, estado, descrição, pontos de entrada e documento |
| `locate_file` | `query`, `limit?` | Caminhos pesquisáveis e respectivo módulo dono |
| `read_module_docs` | `module_id`, `max_chars?` | Apenas o documento registrado em `architecture/modules.json` |
| `find_tests` | `query?`, `module_id?`, `limit?` | Arquivos de teste por nome, conteúdo de referências ou módulo |
| `find_decisions` | `query?`, `limit?` | ADRs versionados em `docs/adr/`, com título e excerto limitado |

Consultas são feitas a partir dos índices **já gerados**; se algum arquivo mudou sem regeneração, os resultados podem estar desatualizados. Valide e regenere os índices após alterações:

```bash
npm run architecture:index
npm run architecture:check
npm test
```

## Segurança, limites e restrições

- **Somente leitura.** Não há ferramenta de escrita, execução arbitrária, Git push, rede, acesso ao painel, SSH, shell ou comandos Docker.
- O catálogo define as rotas permitidas. `read_module_docs` não recebe caminho de arquivo; aceita somente `module_id` presente no catálogo.
- Leitura de documentos resolve caminho real na raiz do checkout, recusa symlink externo e diretórios fora do projeto; existem limites de tamanho por arquivo, linhas recebidas, resultados e chamadas.
- Listagem retorna **caminhos**, não conteúdo completo do código; busca de testes devolve apenas nomes de arquivos. As decisões devolvem excertos curtos de documentos versionados.
- Nenhuma porta é aberta; **não iniciar remotamente via HTTP sem projeto próprio de autenticação, autorização, auditoria e proteção de origem**. Não confundir capacidade de consulta com capacidade de manter/deployar o jogo.
- Documentos de repositório são dados, não instruções de sistema. Ferramentas de IA devem desconfiar de conteúdo manipulado por contribuições externas.
- Limite atual: até 300 arquivos de teste examinados por consulta e 150 ADRs por consulta; excedentes são sinalizados como truncados.

## Validação e expansão futura

A suíte `tests/mcp-navigator.test.ts` cobre consultas reais, isolamento, IDs e argumentos inválidos, symlinks fora da raiz e a troca de mensagens stdio. A CI também valida índices, build, navegador e Docker no fluxo existente.

Fase 2, somente após aprovação: planejar indexação semântica opcional, atualização incremental para 5–10 mil arquivos e integração com clientes externos por um transporte autorizado. Não acrescentar ferramentas de execução ou deploy sem desenho de permissão.

## Workspace de compilação Node 24 do Painel (integração distinta)

O MCP de **navegação** acima é somente leitura. A compilação e os testes reais são um
serviço **diferente**, preparado no repositório `Softdown-prog/Painel`, branch
`feat/workspace-build-isolation-20261111`, usando contêiner descartável Node 24,
Angular e Chromium Playwright 1.56.1. Não transportar o executor privilegiado,
o Docker socket ou credenciais para dentro do repositório/jogo.

Esta branch do Terrania fixa `.node-version` em 24 e inclui sua própria branch
na CI de verificação completa (arquitetura, typecheck, unitários, build,
servidor, Docker e navegador Chromium). Isso **não instala o supervisor na VPS**.

Após o Painel receber os perfis fixos `terrania-core` e `terrania-precommit`,
um projeto de Terrania corretamente importado e vinculado ao repositório pode
pedir `validar_workspace` com `perfil: "terrania-precommit"` no agente Codex do Painel.
A aprovação humana autoriza o job; `consultar_workspace` deve retornar
`status: "passed"` e `passed: true` para comprovar a execução. O recibo inicial
`queued` não representa sucesso. Os perfis devem testar **o jogo completo**,
incluindo exploração/combate, Angular/Phaser e Playwright desktop/Android.

O servidor Node de produção, `server/Dockerfile`, continua independente; esta
etapa não altera deploy, backend, `main` ou operações da VPS.
