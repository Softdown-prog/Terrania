# ADR 0121 — Lote 2 dos arcos: Brasa, Espinheiro e Boreal (Arqueiro, lote A4b)

**Estado:** entregue em 2026-11-28, décima segunda fatia do Arqueiro de [ARQUEIRO.md](../ARQUEIRO.md). Só dados e desenho: a regra de troca por nível já existe desde o A4a ([ADR 0120](0120-arqueiro-a4a-arcos-e-troca.md)), então cada arco novo é um arquivo, uma linha no catálogo e um ícone.

## O que mudou
Três arcos, cada um no seu arquivo (`weapons/bows/`), com nível, dano e ritmo da espada correspondente (números propostos; o dono ajusta nos arquivos):
- **Arco de Brasa** (`ember.ts`): nível 30, 38 de dano, 1,35 s entre tiros, como o montante de cobre. Madeira queimada, preta por fora e riscada de brasa, corda laranja.
- **Arco de Espinheiro** (`thorn.ts`): nível 45, 52 de dano, 1,15 s, como a lâmina das dunas. Galhos vivos verdes com espinhos.
- **Arco Boreal** (`boreal.ts`): nível 60, 68 de dano, 1,1 s, como a espada de cristal boreal. Madeira branca, corda de gelo azulado e pontas de cristal.

Todos com 7 tiles de alcance e uma flecha por tiro, e preparos de 0,13 a 0,14 s. Cada um tem a ficha visual própria (cores, comprimento e pontas viradas) e o ícone do inventário (`bow-ember`, `bow-thorn`, `bow-boreal`). O inventário passa a listar sete arcos; os de nível mais alto aparecem "Bloqueado — Nível N" até o herói chegar lá.

## Testes
`tests/archer-bows.test.ts` ganhou o teste do lote (números, espelho das espadas, nível de liberação, save e recarregar, dano com flecha de ferro, ícones) e as listas de aparência com os sete arcos; ajustados `archer-bow` e `archer-inventory`. Navegador (desktop e Android): `archer-bows` e `archer-inventory` com sete botões, os seis acima de nível 1 bloqueados num Arqueiro novo e o nível 60 do Boreal. **Mutações:** 8 nos dados novos (dano, nível, ritmo, preparo, ponta virada, material e a ligação no catálogo), todas pegas; a troca, o save e a normalização já tinham as suas 19 pegas no A4a.

## O que vem depois
**A4c e A4d:** os quatro arcos restantes (Solar, da Lua Negra, da Tempestade e Estelar), em dois lotes. Depois A5 (as habilidades) e A6 (os onze conjuntos de roupa com capuz).
