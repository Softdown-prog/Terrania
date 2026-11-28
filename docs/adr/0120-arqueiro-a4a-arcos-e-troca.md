# ADR 0120 — Troca de arco por nível e o primeiro lote de arcos (Arqueiro, lote A4a)

**Estado:** entregue em 2026-11-28, décima primeira fatia do Arqueiro de [ARQUEIRO.md](../ARQUEIRO.md). O A4 do plano (os dez arcos restantes, "em lotes de três") começa aqui: **A4a (esta)** a troca de arco por nível, no motor, no save e no inventário, e os três primeiros arcos novos; os lotes seguintes (A4b, A4c, A4d) só acrescentam arcos, sem mexer na regra.

## O que mudou
- **Três arcos novos**, cada um no seu arquivo (`weapons/bows/`), com nível, dano e ritmo da espada correspondente (números propostos; o dono ajusta nos arquivos): **Arco de Chifre** (nível 10, 16 de dano, 1 s entre tiros, como a espada de ferro), **Arco Longo de Teixo** (nível 15, 21, 0,98 s, como a espada comum) e **Arco de Osso** (nível 20, 26, 0,95 s, como a de bronze). Alcance de 7 tiles e uma flecha por tiro como o Arco de Caça. O dano do tiro continua sendo o do arco mais o da flecha (a de ferro soma 3).
- **A troca** (`BowLoadout.ts`, `Inventory.equipBow`, `shopActions.equipBow`): só o Arqueiro, vivo, no nível do arco; arcos liberam sozinhos no nível (ainda não há loja de arcos), então só o arco em uso vai para o save (`bows: { equipped }`), e só quando difere do Arco de Caça. Um save com arco acima do nível volta ao de Caça. O mundo lê o arco da bolsa (`sim.equippedBow`), então dano, ritmo, alcance, preparo e pose já seguem o arco em mãos.
- **O desenho** (`drawBow`): a ficha visual ganhou `length` (o Longo é um quinto mais alto) e `flick` (as pontas do Chifre e do Osso viram para a frente; com a corda reta em repouso e puxando bem). Cada arco tem as suas cores, e o ícone do inventário (`bow-horn`, `bow-yew`, `bow-bone`) também.
- **O inventário:** o espaço Arco lista os quatro arcos, no mesmo painel dos cajados: Equipado, Equipar ou Bloqueado ("Nível N"). Mensagens novas: arco equipado, já em mãos, nível baixo, arco que não existe; e a de vocação errada ("Arcos são para o Arqueiro…").

## Testes
`tests/archer-bows.test.ts` (8): o catálogo (os números e o espelho das espadas), as aparências distintas, o save e a normalização, a bolsa (troca, save, recarregar, outras vocações), o mundo (dano, ritmo, alcance), a ação da tela (vocação, caído, nível, em qualquer lugar), o desenho (cores, comprimento, pontas, corda reta em repouso) e a ligação Game/HUD/tela/ícones. Ajustados `archer-bow` e `archer-inventory` (agora quatro arcos). Navegador (desktop e Android): `archer-bows` (nível 15: quatro botões, Osso bloqueado "Nível 20", troca para o Teixo, ícone, save e recarregar; nível 1: só o de Caça) e `archer-inventory` (quatro botões). **Mutações:** 19 tentadas, todas pegas (uma delas, a corda reta, ganhou um caso depois de vista na imagem).

## O que vem depois
**A4b/A4c/A4d:** os sete arcos restantes (Brasa, Espinheiro, Boreal, Solar, Lua Negra, Tempestade e Estelar), em lotes. Depois A5 (as habilidades) e A6 (os onze conjuntos de roupa com capuz).
