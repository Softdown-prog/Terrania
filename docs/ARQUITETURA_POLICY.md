# Política de organização e compatibilidade

## Escopo de um módulo

Um módulo reúne uma responsabilidade coesa, com entradas e dependências explícitas, testes associados, documentação mínima e um estado real (`active`, `experimental` ou `lab`). A divisão deve obedecer ao domínio do jogo, não ao limite arbitrário de linhas de um arquivo.

## Critérios para separar arquivos

Separar quando existir mais de uma razão distinta para mudar o código, dependência circular, necessidade de teste isolado ou regra de negócio misturada com apresentação. Não dividir uma classe coerente em cinco arquivos apenas para criar uma hierarquia grande.

## Mudanças de compatibilidade

- **Move/rename:** atualizar imports, testes e o registro; gerar índices. Preferir commits focados que evitem mover código e alterar comportamento simultaneamente.
- **API/contrato:** versionar protocolo e dados persistidos explicitamente; testar clientes antigos e novos quando necessário.
- **Experimentos:** feature flag/param isolado com caminho de desligamento e testes contra regressão; só promover depois de avaliação de gameplay e operações.
- **Legado:** tags/releases, ADRs e testes de migração. Código legado ativo fica localizado e documentado; código removido pode ser recuperado do histórico Git. Nunca manter duplicações silenciosas.
- **Diagnóstico:** mapear sintoma → módulo → ponto de entrada → testes → riscos; ver [MANUTENCAO](MANUTENCAO.md).

## Documentação atualizada sem burocracia

Atualizar README de seção quando mudar responsabilidade, fluxo, API pública ou configuração. Atualizar roadmap apenas para decisões de prioridade. Criar ADR para escolhas duradouras, não para toda variável renomeada. O índice de arquivos é automático, não texto de manutenção manual.
