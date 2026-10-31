# Terrania Navigation MCP — local e somente leitura

Servidor MCP v2 com transporte **stdio**, isolado do Angular, Phaser, Node multiplayer, Go e Rust. Não oferece shell, escrita, commits, deploy, HTTP, autenticação remota ou leitura de segredos.

## Instalação local

Requisitos: Node.js 24+ e npm. Na **raiz do Terrania**:

```bash
npm ci --prefix tools/mcp-navigation
npm run typecheck --prefix tools/mcp-navigation
npm test --prefix tools/mcp-navigation
npm start --prefix tools/mcp-navigation
```

O processo aguarda clientes MCP no stdin; o stdout é reservado ao JSON-RPC. Para testar manualmente com o MCP Inspector, execute `npx @modelcontextprotocol/inspector node --experimental-strip-types tools/mcp-navigation/src/server.mts` a partir da raiz do repositório. A instalação usa o `package-lock.json` versionado deste pacote isolado e o comando `npm ci` para reproduzir as dependências exatas validadas no CI.

## Exemplo de configuração do agente

Utilize caminhos **absolutos**, ajustados ao local do seu clone:

```json
{
  "mcpServers": {
    "terrania-navigation": {
      "command": "node",
      "args": [
        "--experimental-strip-types",
        "/CAMINHO/ABSOLUTO/Terrania/tools/mcp-navigation/src/server.mts"
      ],
      "cwd": "/CAMINHO/ABSOLUTO/Terrania"
    }
  }
}
```

O formato exato da configuração varia por cliente; este exemplo é conceitual. O servidor local identifica sua raiz a partir da própria localização do script, não aceita uma raiz arbitrária informada pela IA.

## Ferramentas

| Ferramenta | Finalidade |
| --- | --- |
| `find_files` | Buscar caminhos versionados por nome; limite 50 |
| `audit_modules` | Diagnosticar pastas e índices ausentes; limite 50 |
| `get_module_guide` | Ler o índice mais próximo, limitado a 16 mil caracteres |
| `search_symbols` | Busca literal em arquivos textuais versionados, até 1.500 arquivos / 50 ocorrências por chamada |
| `read_source_lines` | Ler trecho de até 100 linhas de um arquivo autorizado, truncando linhas muito longas |

Arquivos externos, links simbólicos para fora da raiz, `.env`, chaves e segredos de nomes reconhecíveis são recusados. A busca restringe o tamanho por arquivo. Para árvores de milhares de arquivos, passe `scope` para evitar resultados parciais. **O MCP é somente leitura; essas restrições reduzem riscos, mas não substituem a revisão das permissões do cliente MCP.**

Veja [o mapa de navegação](../../docs/AI_NAVIGATION.md) e [os guias de agentes](../../AGENTS.md).
