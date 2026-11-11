# ADR 0030 — Alquimia da Casa de Venenos

**Estado:** entregue em 2026-11-10, direto na `main` por pedido do dono. Continua os ADRs 0025 e 0026 (moedas e loot). Terceira tarefa seguida no Sul (Poço Negro).

## Contexto

O saque das criaturas só servia para vender (ADR 0026). Ixtal, o Destilador (diabrete alquimista da Casa de Venenos), dizia que "ainda não oferece alquimia". Faltava dar ao saque um segundo uso: preparar frascos.

## Decisões

1. **Receita = ingredientes + moedas + efeito,** um arquivo por receita em `src/engine/character/south/alchemy/recipes/` (`greater-potion.ts`, `antidote.ts`); cada assunto no seu arquivo (`recipe.ts` o contrato, `results.ts` os desfechos, `catalog.ts` a lista, `counts.ts` as contagens e a normalização, `alchemist.ts` o NPC) e `index.ts` só reexporta. As ações de loja ficam em `src/game/actions/south/alchemyActions.ts`. Os ingredientes são **materiais que já existem** (saque comum das criaturas, por nome), então nada de item novo no catálogo de criaturas.
2. **Duas receitas nesta entrega:**
   - **Poção Maior** (2 × Polpa de Cacto Hidratante + 1 × Flor do Deserto, **40 Terrania Gold**): cura até 120 HP, mais de três poções comuns (35), sem passar da vida máxima.
   - **Antídoto de Ixtal** (1 × Erva do Pântano + 1 × Glândula de Veneno, **18 Terrania Gold**): remove todos os status (veneno, queimadura, gelo...) sem curar vida.
   O preparo custa mais que vender os ingredientes ao Ossuário (conferido por teste), então a alquimia nunca rende mais dinheiro que o comércio.
3. **Elixires ficam na bolsa** (`Inventory.elixirs`, pilhas de até 99), **persistidos no save** só quando há algum (campo `elixirs` opcional) e **sempre normalizados** (`normalizeElixirs`: só ids conhecidos, inteiros positivos, teto da pilha), tanto em `loadLocalSave` quanto no construtor.
4. **Preparo atômico** (`Inventory.craftElixir`): confere pilha, ingredientes e dinheiro antes de mexer em qualquer coisa; só então tira os ingredientes e as moedas e entrega o frasco. Qualquer recusa deixa a bolsa idêntica.
5. **Uso** (`Inventory.useElixir`): vale na superfície e na caverna, como a poção. **Sem efeito não gasta o frasco** (Poção Maior com vida cheia; Antídoto sem nenhum status). Herói caído não bebe.
6. **Só se prepara ao lado de Ixtal,** com o diálogo aberto e fora de interior (`shopActions.craftElixir`). Beber (`shopActions.drinkElixir`) vale em qualquer lugar.
7. **Tela:** o diálogo de Ixtal lista as receitas com o preço, quantos frascos o herói tem e cada ingrediente como "tem/precisa"; o botão "Preparar" só habilita com tudo em ordem. Na bolsa, os elixires aparecem com ícone próprio e botão "Usar".
8. Texto de Ixtal atualizado (não promete mais "quando o laboratório estiver pronto"). Sem mudança de Go, de arte Canvas ou do contrato do servidor.

## Verificação

- `tests/alchemy.test.ts` (10 testes): um arquivo por receita e ingredientes que as criaturas realmente deixam; a Poção Maior cura mais de três poções e custa mais que o saque; preparo gasta ingredientes e moedas; recusas atômicas (falta de ingrediente, de dinheiro, pilha cheia); cura limitada à vida máxima e sem gastar à toa; Antídoto limpa todos os status sem curar; save e normalização com entradas inválidas; preparo só ao lado de Ixtal, com menu aberto e fora de interior; beber com herói caído; oferta e fala de Ixtal.
- Mutações conferidas (todas reprovadas pelos testes): não cobrar moedas, ignorar a pilha cheia, gastar o frasco sem efeito (vida cheia e sem status), não limitar à vida máxima, o antídoto não limpar, não salvar os elixires, não limitar a pilha ao normalizar e ignorar a distância de Ixtal.
- `tests/browser/south-alchemy.spec.ts` (desktop e Android): conversar com Ixtal, preparar a Poção Maior com os ingredientes e as moedas da bolsa salva, ver o frasco na bolsa com o ícone e bebê-lo para recuperar vida.

## Limites

- Preços e curas são um primeiro palpite, sem balanceamento. Só duas receitas; não há receitas de veneno para a lâmina nem de buffs temporários.
- Elixires não são vendidos nem comprados em bancas; só preparados e bebidos.
- Não verificado: Android físico.
