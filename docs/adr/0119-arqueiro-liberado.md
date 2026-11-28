# ADR 0119 — O Arqueiro é liberado na tela de escolha

**Estado:** entregue em 2026-11-28, décima fatia do Arqueiro de [ARQUEIRO.md](../ARQUEIRO.md). Com a Irmandade dos Arqueiros funcionando ([ADR 0118](0118-arqueiro-a3b-irmandade-dos-arqueiros.md)), o Arqueiro tem tudo o que um herói precisa para começar e jogar: ficha, arco e flechas, tiro na superfície e na caverna, corpo desenhado, inventário próprio e o lugar onde repor a munição.

## O que mudou
- **`ARCHER.playable = true`** (`classes/archer.ts`): o cartão deixa de ser "Em breve", o botão "Jogar como Arqueiro" liga e o mundo novo pode nascer de Arqueiro (85 de vida, sem mana, Arco de Caça e 30 flechas de junco). O mecanismo "Em breve" continua na tela para a próxima vocação (o Druida).
- **A tela de escolha:** os botões dos três cartões agora ficam alinhados embaixo (o cartão é uma coluna e o botão empurra para o fim), porque as listas de características têm tamanhos diferentes.
- **Fica para depois (de propósito):** os outros dez arcos (A4), as habilidades (A5) e os onze conjuntos de roupa (A6). Até lá o Arqueiro joga com o Arco de Caça e as duas flechas à venda.

## Testes
Unitários: `hero-select` (as três vocações jogáveis, na ordem do catálogo) e `archer-class` (a ficha é jogável). Navegador (desktop e Android): `hero-select` (os três botões ligados e sem a faixa "Em breve"; **novo teste:** escolher o Arqueiro começa o mundo de Arqueiro, com 85 de vida, sem mana, nove espaços, Arco de Caça, aljava de 30 flechas, e recarregar mantém) e **`archer-shot` (novo):** com um mundo de Arqueiro, escolher um monstro faz o herói atirar, a aljava gasta flechas (no save) e o alvo cai, sem erros na página. **Mutação:** trocar `playable` para `false` derruba os testes (2 falhas).

## O que vem depois
A4 (os dez arcos restantes, um por arquivo), A5 (as habilidades) e A6 (os onze conjuntos de roupa com capuz).
