# ADR 0010 — Jogo solo offline; online só para presença e troca de itens raros

**Estado:** proposta aceita como direção (2026-11-08). Nada abaixo está implementado ainda.

## Decisão

- O jogo jogável é **single player e offline**: mundo, combate, progressão, inventário e save continuam no navegador. É o que preserva o motor gráfico.
- O online deixa de ser "jogar junto". Fica restrito a **(1) contador de pessoas jogando** e **(2) troca de itens raros entre jogadores, dentro do site**. Sem chat, sem mapa compartilhado, sem combate cooperativo.
- A simulação multiplayer por sala (`server/src/Room.ts`, worker Go, kernel Rust) **deixa de ser o caminho de produto**. Fica no repositório como legado/laboratório; **não será apagada** só para reduzir arquivos (AGENTS.md). O contador de presença (`/presence`) é mantido.

## Por que o save local não basta

O save solo é um JSON em `localStorage` (`src/storage/localSave.ts`), editável por qualquer jogador. Um item raro achado offline não prova nada para quem recebe a troca. Uma economia de troca exige que o **servidor seja a fonte da verdade sobre a existência e o dono de cada item raro**.

## Modelo escolhido (sem preferência do responsável; adotadas as opções recomendadas)

1. **Servidor valida o item raro.** O jogo offline pode "reivindicar" um raro; o servidor só o registra dentro de limites (catálogo fechado de raros, taxa máxima por conta e por período, cada item com ID único e dono). Não é à prova de fraude total: um jogador pode forjar o *evento* de drop, e o servidor apenas limita o dano. Itens raros de verdade, sem essa limitação, só com sorteio no servidor — fica como evolução.
2. **Conta simples** (dono do item e histórico). Sem conta não há troca.
3. **Troca atômica**: uma oferta só muda de dono quando as duas partes confirmam; nenhum item existe em dois lugares. Operações com idempotência e verificação de versão (o mesmo princípio do recibo de inventário do ADR 0007).
4. Itens raros trocados **voltam ao save local** por um recibo assinado pelo servidor, não por edição do navegador.

## O que muda na arquitetura

| Parte | Destino |
| --- | --- |
| `src/engine`, `src/world`, `src/render`, `src/game` (solo) | Permanecem. O solo deixa de oferecer o modo "sala online". |
| `server/src/main.ts` `/presence` | Mantido (contador). |
| `Room.ts`, worker Go, gateway, cluster, Rust | Legado/laboratório, fora do produto. Não remover sem decisão separada. |
| Novo serviço de mercado | A projetar: contas, itens raros, ofertas, auditoria. |

## Pendente antes de implementar (exige decisão e custo)

- **Persistência no servidor** (contas, itens, ofertas): banco, backup e restauração. A documentação de manutenção já diz que dados de jogadores exigem estratégia própria; hoje não existe.
- **Provedor de identidade** (e-mail/login social) e política de privacidade/LGPD para os dados da conta.
- **Antifraude mínimo**: limites por conta/IP, log de auditoria, reversão de troca por operador.
- Quais itens são "raros" (catálogo) e como o solo os gera hoje: **o jogo ainda não tem itens raros**.
- Infraestrutura: o serviço roda na VPS atual ou em outro lugar; **deploy continua exigindo aprovação explícita**.

## Consequências

- Some a meta de "1.000 jogadores na mesma simulação" e o risco de banda de snapshots apontado em [REVISAO_MULTIPLAYER_20261108](../REVISAO_MULTIPLAYER_20261108.md): o tráfego passa a ser pequeno (ofertas e contador).
- O risco principal deixa de ser desempenho e passa a ser **integridade da economia** (duplicação, falsificação, golpe) e **proteção de dados de conta**.
