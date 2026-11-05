# Operação, diagnóstico e recuperação — plano, não infraestrutura ativada

## 1. Triagem de incidentes

1. Identificar **versão Git / tag / build**, ambiente (solo/Node/Go/lab), sintomas, alcance (Android, desktop, sala, região), horário e impacto em dados.
2. Consultar `architecture/modules.json` e `docs/INDEX.md` para localizar o módulo; procurar os testes ligados ao comportamento antes de mudar código.
3. Reproduzir em ambiente isolado. Classificar se o erro é **UI**, **regras locais**, **contrato**, **rede**, **dados**, **recursos** ou **infraestrutura**.
4. Mitigar com segurança: desligar recurso opt-in/feature flag ou interromper novos acessos afetados, quando essa capacidade estiver realmente implementada. Não aplicar comandos destrutivos automaticamente.
5. Corrigir em branch pequena, escrever teste da regressão, validar Android/desktop e o backend afetado; registrar causa e ADR se houver decisão arquitetural.

## 2. Recuperação — níveis de capacidade

- **Disponível hoje:** Git para histórico e reversão de código; isolamento do modo clássico experimental por parâmetros; testes de unit/build/navegador; protótipos isolados de Go/cluster.
- **Não comprovado/pendente:** rollback automatizado de produção, feature flags globais, backups íntegros de dados online, failover real, monitoramento com alertas e suporte comprovado para 500 jogadores. Não prometer essas garantias a jogadores.
- **Antes de persistir contas/inventário online:** backups **testados por restauração**, migrações reversíveis quando possível, validação de integridade, retenção, monitoramento, políticas de acesso e plano para indisponibilidade. Código versionado **não** recupera a base de dados de jogadores.

## 3. Diagnóstico e capacidade

- Instrumentar futuramente: conexões simultâneas autenticadas, tick p50/p95/p99, latência, CPU/RAM por worker, fila de rede, desconexões, perda de mensagens e erros de DB.
- Testes de carga devem simular cenários reais com ramp-up e duração, medir gargalo e falhas; não inferir capacidade a partir de compilação, benchmark sintético ou contagem teórica.
- Separar laboratório Go/Rust de serviço Node ativo; qualquer promoção exige critérios de paridade, carga, segurança e recuperação documentados.

## 4. Versionamento e histórico

- **SemVer no produto quando fizer sentido:** `MAJOR.MINOR.PATCH` é uma política de lançamento, não alteração automática do número no `package.json`.
- Tags Git imutáveis por lançamento: `v1.0.0`, `v1.1.0` etc. Guardar release notes com mudanças de gameplay, save e protocolo.
- Mudança de contrato: explicitar compatibilidade cliente/servidor e formatos de save; uma tag antiga pode depender de infraestrutura/dados antigos.
- Registre decisões em `docs/adr/` com contexto, escolha, consequências e alternativa rejeitada. Mudanças novas **não reescrevem o passado**: marcar ADR como substituído e relacionar nova decisão.
- Código legado não deve ser duplicado indefinidamente em pastas `legacy-v3`; usar Git tag/branch, testes de compatibilidade e módulos opcionais **somente com utilidade e isolamento comprovados**.

## 5. MCP para navegação — contrato futuro

A primeira fonte consultável é `architecture/modules.json` com `docs/INDEX.md` e índices por módulo. Um MCP **somente leitura** poderá expor `list_modules`, `locate_file`, `read_module_docs`, `find_tests` e `find_decisions`. Nenhum MCP foi instalado por este recorte. Futuras ferramentas com escrita/execução requerem autenticação, autorização, auditoria, limites de diretório e aprovação humana; sem shell irrestrito.
