# ADR 0010 — Jogo solo offline; online só para presença e troca de itens raros

**Estado:** direção aceita (2026-11-08). A retirada do multiplayer foi aplicada no [ADR 0012](0012-retirada-do-multiplayer.md); itens raros, contas e o serviço de mercado **ainda não existem**.

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

## Banco de dados: PostgreSQL da VPS (decisão do responsável)

O responsável tem PostgreSQL na VPS. Os itens raros serão registrados nele **por ID**, e a troca consulta o banco para confirmar que a conta realmente possui aquele ID antes de transferi-lo. O banco passa a ser a fonte da verdade; o navegador nunca informa "de quem é" um item.

**Isolamento obrigatório.** Essa instância é compartilhada com outros projetos (o `DEPLOY-VPS.md` cita Softload e Painel e proíbe tocá-la). O Terrania usa **banco e usuário próprios**, com permissões só sobre as próprias tabelas; credenciais em variável de ambiente do servidor, nunca em `VITE_*` nem no repositório. O deploy atual não altera o PostgreSQL e continua assim até aprovação explícita.

**Esboço do modelo (proposta, não implementado):**

| Tabela | Conteúdo |
| --- | --- |
| `accounts` | `id` (uuid), dados mínimos de identidade, `created_at` |
| `rare_items` | `id` (uuid, **chave primária única**), `catalog_id`, `owner_account_id`, `state` (`vault`, `checked_out`, `in_trade`), `created_at` |
| `item_events` | Livro-razão **somente de inserção**: item, de, para, tipo, troca, instante |
| `trades` | `id`, estado, partes, IDs oferecidos/pedidos, `idempotency_key`, `expires_at` |

**Troca (uma transação):** `BEGIN` → `SELECT … FROM rare_items WHERE id = ANY(...) ORDER BY id FOR UPDATE` (travas em ordem fixa, sem deadlock) → verificar que cada ID pertence à conta que o oferece **e** está em `vault` → `UPDATE owner_account_id` das duas partes → inserir em `item_events` → `COMMIT`. Se qualquer verificação falhar, `ROLLBACK` e nada muda. A chave de idempotência impede repetir a mesma troca ao reenviar a requisição. O dono vem da **sessão autenticada**, nunca do corpo da requisição.

**Item no jogo solo (ponto central de integridade).** Se o item raro valer algo offline, ele existe no save local e, ao ser trocado, ficaria duplicado (um no save do antigo dono, outro no do novo). Por isso:
- Ao **registrar**, o item **sai do save local** e vai para o cofre da conta (`vault`).
- Para usá-lo no solo, a conta o **retira** (`checked_out`); enquanto retirado, **não pode ser trocado**. O servidor devolve um recibo; o save passa a conter apenas esse item emprestado.
- Ao **devolver** ao cofre, ele volta a poder ser trocado.

**O que o banco resolve e o que não resolve.** Resolve duplicação e dono depois do registro: um ID existe uma vez, com um dono. **Não resolve o ponto de entrada**: o jogador ainda pode forjar o evento "achei um raro" no cliente. Isso continua limitado por catálogo fechado, taxa por conta/período e log de auditoria; só o sorteio no servidor elimina o risco.

## O que muda na arquitetura

| Parte | Destino |
| --- | --- |
| `src/engine`, `src/world`, `src/render`, `src/game` (solo) | Permanecem. O solo deixa de oferecer o modo "sala online". |
| `server/src/main.ts` `/presence` | Mantido (contador). |
| `Room.ts`, worker Go, gateway, cluster, Rust | Legado/laboratório, fora do produto. Não remover sem decisão separada. |
| Novo serviço de mercado | A projetar: contas, itens raros, ofertas, auditoria. |

## Pendente antes de implementar (exige decisão e custo)

- **Ligar o PostgreSQL da VPS** (ver a seção abaixo). O banco existe, mas **o Terrania ainda não está conectado a ele**. Falta definir backup e restauração dos dados de jogadores (MANUTENCAO.md já exige estratégia própria).
- **Provedor de identidade** (e-mail/login social) e política de privacidade/LGPD para os dados da conta.
- **Antifraude mínimo**: limites por conta/IP, log de auditoria, reversão de troca por operador.
- Quais itens são "raros" (catálogo) e como o solo os gera hoje: **o jogo ainda não tem itens raros**.
- Infraestrutura: o serviço roda na VPS atual ou em outro lugar; **deploy continua exigindo aprovação explícita**.

## Consequências

- Some a meta de "1.000 jogadores na mesma simulação" e o risco de banda de snapshots apontado em [REVISAO_MULTIPLAYER_20261108](../REVISAO_MULTIPLAYER_20261108.md): o tráfego passa a ser pequeno (ofertas e contador).
- O risco principal deixa de ser desempenho e passa a ser **integridade da economia** (duplicação, falsificação, golpe) e **proteção de dados de conta**.
