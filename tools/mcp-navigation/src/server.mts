import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { openLocalRepository } from './repository.mts';

type Result = Record<string, unknown>;
const respond = (body: Result) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(body) }],
  structuredContent: body,
});
const safeCall = (fn: () => Result) => {
  try { return respond(fn()); }
  catch (error) {
    return { content: [{ type: 'text' as const,
      text: error instanceof Error ? error.message : 'Falha de navegação.' }], isError: true };
  }
};

export function createServer(): McpServer {
  const repository = openLocalRepository();
  const server = new McpServer({ name: 'terrania-navigation', version: '0.1.0' },
    { maxToolInputElements: 64 });
  const readOnly = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };

  server.registerTool('find_files', {
    description: 'Localiza arquivos versionados no Terrania por nome/caminho, até 50 resultados.',
    inputSchema: z.object({ query: z.string().min(1).max(128),
      scope: z.string().max(256).optional(), limit: z.number().int().min(1).max(50).optional() }),
    annotations: readOnly,
  }, async ({query, scope, limit}) => safeCall(() =>
    repository.find(query, scope, limit)));

  server.registerTool('audit_modules', {
    description: 'Conta arquivos por módulo e identifica pastas sem INDEX.md; não modifica nada.',
    inputSchema: z.object({
      scope: z.string().max(256).optional(),
      minFiles: z.number().int().min(1).max(100000).optional(),
      limit: z.number().int().min(1).max(50).optional(),
      depth: z.number().int().min(1).max(15).optional(),
    }), annotations: readOnly,
  }, async ({scope, minFiles, limit, depth}) => safeCall(() =>
    repository.audit(scope, minFiles, limit, depth)));

  server.registerTool('get_module_guide', {
    description: 'Lê somente o INDEX.md versionado mais próximo do caminho, ou AGENTS.md de raiz.',
    inputSchema: z.object({
      scope: z.string().max(256).optional(),
      maxChars: z.number().int().min(100).max(16000).optional(),
    }), annotations: readOnly,
  }, async ({scope, maxChars}) => safeCall(() => repository.guide(scope, maxChars)));

  server.registerTool('search_symbols', {
    description: 'Busca literal em arquivos-fonte versionados, limitada a 1500 arquivos/50 ocorrências. Use scope para restringir.',
    inputSchema: z.object({
      query: z.string().min(2).max(128),
      scope: z.string().max(256).optional(),
      limit: z.number().int().min(1).max(50).optional(),
    }), annotations: readOnly,
  }, async ({query, scope, limit}) => safeCall(() =>
    repository.searchSymbols(query, scope, limit)));

  server.registerTool('read_source_lines', {
    description: 'Lê até 100 linhas de um arquivo-fonte versionado, sem sair do repositório.',
    inputSchema: z.object({
      path: z.string().min(1).max(512),
      startLine: z.number().int().min(1).max(1000000).optional(),
      maxLines: z.number().int().min(1).max(100).optional(),
    }), annotations: readOnly,
  }, async ({path, startLine, maxLines}) => safeCall(() =>
    repository.readLines(path, startLine, maxLines)));

  return server;
}

// stdout is exclusively JSON-RPC MCP; diagnostics go to stderr.
void serveStdio(createServer);
