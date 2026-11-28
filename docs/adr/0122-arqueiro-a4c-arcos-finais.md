# ADR 0122 — Os quatro arcos finais: Solar, Lua Negra, Tempestade e Estelar (Arqueiro, lote A4c)

**Estado:** entregue em 2026-11-28, décima terceira fatia do Arqueiro de [ARQUEIRO.md](../ARQUEIRO.md). Completa os **onze arcos** do plano (A4). O plano previa dois lotes para os quatro que faltavam; como é só dado, desenho e ícone no molde do A4a ([ADR 0120](0120-arqueiro-a4a-arcos-e-troca.md)) e do A4b ([ADR 0121](0121-arqueiro-a4b-arcos-brasa-espinheiro-boreal.md)), foram juntos, numa fatia pequena.

## O que mudou
Quatro arcos, cada um no seu arquivo (`weapons/bows/`), com nível, dano e ritmo da espada correspondente (números propostos; o dono ajusta nos arquivos):
- **Arco Solar** (`sun.ts`): nível 70, 84 de dano, 1,25 s entre tiros, como a lâmina de obsidiana. Latão polido e corda de feixe de luz.
- **Arco da Lua Negra** (`moon.ts`): nível 80, 98 de dano, 1,3 s, como o cutelo do charco. Madeira escura e corda de sombra violeta.
- **Arco da Tempestade** (`storm.ts`): nível 90, 115 de dano, 1,15 s, como o sabre da tempestade. Cobre avermelhado e corda amarela que faísca.
- **Arco Estelar** (`astral.ts`): nível 100, 140 de dano, 1,4 s, como a espada astral de Terrania. Liga de estrelas azul-violeta com a corda dourada.

Todos com 7 tiles e uma flecha por tiro; o preparo cresce de 0,13 a 0,15 s (o Estelar tem a corda mais dura). Ficha visual e ícone próprios (`bow-sun`, `bow-moon`, `bow-storm`, `bow-astral`). A legenda do inventário diz "11 de 11 · coleção completa" quando o catálogo está inteiro (antes: "os outros chegam nos próximos lotes").

## Testes
`archer-bows` ganhou o teste do lote final e uma regra geral: **cada um dos onze arcos tem o nível, o dano e o ritmo da sua espada** (o Arco de Caça com a espada de treino, e assim por diante), com a troca e o save de todos até o nível 100 e o Estelar bloqueado no 99. Navegador (desktop e Android): `archer-bows` e `archer-inventory` com onze botões e os dez acima do Arco de Caça bloqueados num Arqueiro novo. **Mutações:** 9 nos dados novos (nível, dano, ritmo, preparo, ponta virada, material, a ordem no catálogo e a legenda "coleção completa"), todas pegas.

## O que vem depois
**A5** as habilidades do Arqueiro e **A6** os onze conjuntos de roupa com capuz; depois os ajustes finos do Arqueiro com o dono (números dos arcos e das flechas, as seis flechas raras que faltam).
