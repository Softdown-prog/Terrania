# ADR 0028 — Montarias do deserto no cercado do Domador Rukh

**Estado:** entregue em 2026-11-10, direto na `main` por pedido do dono. Terceira de três tarefas seguidas no Sul (ADRs 0026 e 0027 antes).

## Contexto

O Poço Negro tinha o Domador Rukh e um cercado, mas ele só dizia que a doma "ainda será criada". As duas montarias do Sul, o **Escaravelho de Carga** e o **Lagarto das Areias**, existiam no catálogo e no desenho, e o sistema de montarias (estábulo, Cavalaria, sela, energia) já funcionava para o Cavalo de Batalha de Eron. Com as moedas prontas, faltava vendê-las.

## Decisões

1. **O Rukh vende as duas montarias do Sul, em moedas** (`engine/mounts/southMountSales.ts`): **Escaravelho de Carga** (tier 1, nível 30) por **450** Terrania Gold (4 Cripta Coin e 50 Terrania Gold) e **Lagarto das Areias** (tier 2, nível 40) por **1.200** (12 Cripta Coin). A compra já inclui a sela.
2. **Regra de compra** (`MountStable.buy`): só ao lado do Rukh (novo ponto `SOUTH_STABLE`, no lugar do próprio Rukh), só o que ele vende, com o **nível** da montaria e as moedas; atômica (sem dinheiro nada muda, comprar duas vezes não cobra de novo). O gel não paga montaria.
3. **Para montar vale a regra de sempre:** nível, cercado e Cavalaria da espécie (tier 1 e 2), treinados com Eron na Travessia. O Lagarto exige Cavalaria II. **Monta-se agora nos dois cercados**: o de Eron e o do Rukh. O bônus de velocidade da ficha (0,20 e 0,35) vale como para o cavalo.
4. **Ações novas** `buy:<montaria>` e `mount:<montaria>` em `runMountAction`, que valida o id; resultado novo `bought`, que salva e tem mensagem própria. As ações antigas seguem iguais.
5. **Tela:** o diálogo do Rukh lista as duas montarias (nome, tier, nível, preço) com **Comprar** (desabilitado sem nível ou sem dinheiro), **Montar** e **Guardar**, e avisa o que falta para montar. A fala do Rukh foi atualizada.
6. O save não muda: `owned` e `saddled` já aceitavam qualquer montaria do catálogo. Sem mudança de Go nem de arte (as duas montarias já eram desenhadas).

## Verificação

- `tests/south-mounts.test.ts` (4 testes): o cercado fica onde o Rukh está e vende as duas montarias do Sul; comprar exige o cercado do Rukh, o nível e as moedas, e as recusas não cobram; a montaria vem selada e só se monta com nível, cercado e Cavalaria, nos dois cercados; pelo motor, paga em moedas (e não em gel), salva e volta do save. Mutações conferidas: sem checar nível, sem cobrar, só montar em Eron, sem sela, vender o cavalo e pagar fora das moedas reprovam.
- `tests/browser/south-stable.spec.ts` (desktop e Android): comprar o Escaravelho (600 → 150 moedas), montar, guardar, e o Lagarto bloqueado sem 1.200.

## Limites

- As **habilidades** das montarias (Estoque Extra do Escaravelho, Fervor Desértico do Lagarto) **continuam só descritas**: nesta fatia só valem a velocidade e a energia, como para o cavalo. Nenhum espaço extra de carga nem imunidade ao calor foi criado.
- Os preços (450 e 1.200) são um primeiro palpite, sem balanceamento; não há venda de volta nem doma selvagem dessas espécies.
- Montar exige estar perto de um dos dois cercados; desmontar vale em qualquer lugar, como antes.
- Não verificado: Android físico.
