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

## Fase 2 — consultas por GitHub Actions (somente leitura)

**Nesta branch:** o workflow [mcp-navigator.yml](../.github/workflows/mcp-navigator.yml) faz um checkout descartável no **runner hospedado pelo GitHub**, verifica índices, executa testes MCP e consulta o processo MCP por **stdin/stdout** usando [actions-query.mjs](../scripts/mcp/actions-query.mjs). A consulta e a revisão Git aparecem no **resumo da execução**. O processo não tem endpoint HTTP, chave SSH, acesso à VPS, escrita no repositório, deploy ou ferramenta para executar comandos enviados no formulário.

- Entradas permitidas: `tool` (uma das cinco ferramentas MCP), `query`, `module_id`, `status` e `limit` (1 a 20). Cada ferramenta aceita **somente** os parâmetros compatíveis. Entradas de usuário são entregues via **variáveis de ambiente**, nunca interpoladas como shell.
- O token do workflow recebe somente `contents: read`; `checkout` utiliza `persist-credentials: false`. Não há `npm ci` nem pacotes adicionais para essa consulta: o MCP utiliza Node e arquivos versionados.
- Na branch experimental, o workflow também executa um teste automático `push` **apenas** quando mudarem seus próprios arquivos/índices. Isso comprova a integração sem habilitar produção.
- **Limite importante do GitHub:** o botão **Run workflow** de `workflow_dispatch` só aparece quando o arquivo do workflow existe no branch padrão. Portanto, enquanto a integração permanecer nesta branch de experimento, sua execução automática em `push` serve como prova; a consulta manual pelo painel de Actions **não está disponível ainda**. Não fazer merge na `main` só para liberar o botão.
- Quando o workflow for aprovado e incluído na `main`, a pessoa que executa poderá escolher o branch/revisão no formulário, sempre respeitando as permissões GitHub. A consulta lerá o **checkout dessa revisão**, não dados live da VPS.

### Exemplos de entradas

| tool | query | module_id | status | Resultado |
| --- | --- | --- | --- | --- |
| `list_modules` | — | — | `lab` | Somente módulos de laboratório |
| `locate_file` | `ClassicTileWalker.ts` | — | — | Localizar arquivo e módulo dono |
| `read_module_docs` | — | `simulation` | — | Documentação de manutenção do motor |
| `find_tests` | `ClassicCombat` | — | — | Arquivos de testes relacionados |
| `find_decisions` | `MCP` | — | — | ADRs relacionados |

Resultados são dados do repositório e podem conter conteúdo não confiável de contribuições. A integração **não conecta diretamente a interface do ChatGPT ao MCP**, não cria canal de retorno interativo e não permite editar arquivos pelo Actions. Consulte [ADR 0002](adr/0002-mcp-navegador-local.md) para a decisão.

