# Segurança do Terrania

## Varredura automática (`.github/workflows/security-scan.yml`)
Roda a cada push na `main`, em todo pull request, toda segunda-feira e sob demanda. Só analisa: não publica nem faz deploy.

- **CodeQL** (JavaScript e TypeScript, conjunto `security-extended`): procura falhas como XSS, injeção, caminho de arquivo perigoso e uso inseguro de dados vindos do navegador. Os alertas aparecem na aba **Security → Code scanning** do repositório. O CodeQL não reprova o fluxo sozinho: ele reporta; quem decide o que corrigir é a revisão dos alertas.
- **npm audit** (dependências de produção, nível alto, no jogo e no servidor): **reprova o fluxo** se surgir um aviso alto ou crítico numa dependência que vai para o jogo ou para o servidor. As dependências só de desenvolvimento (ferramentas de build e teste) não entram.

Estado inicial (2026-11-18): `npm audit` de produção sem avisos nos dois pacotes. Com as dependências de desenvolvimento há um aviso alto em `picomatch` (ReDoS no processo de build); não vai para o jogo e é resolvido na próxima atualização das ferramentas.

## Onde está a superfície de ataque
- O site estático (Angular) e o jogo (Phaser): o que vem do navegador é o **save** em `localStorage` (`src/storage/localSave.ts` valida tipo, faixa e tamanho de tudo antes de usar), os parâmetros da URL e as preferências.
- O servidor Node (`server/`): `health`, presença e mercado. Sem WebSocket e sem contas.
- Os fluxos de deploy (`.github/workflows/deploy-*.yml`), que usam segredos do repositório.

## Teste ativo com o Strix (planejado)
O [Strix](https://github.com/usestrix/strix) é uma ferramenta de código aberto (Apache 2.0) que usa agentes de IA para atacar o app rodando e confirmar cada falha com uma prova. Regras para usá-lo aqui:
- Só contra **uma cópia local** do Terrania e um servidor local, nunca contra o site publicado.
- Exige Docker e uma chave de um provedor de IA; o **código é enviado ao provedor** escolhido, então a escolha do provedor é do dono do projeto.
- Os achados entram aqui como issues, com a falha, a prova e a correção; nada é corrigido às cegas.
