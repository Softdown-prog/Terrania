# ADR 0078 — As roupas do Mago, lote A1: o Mago passa a vestir (conjunto do Aprendiz)

**Estado:** entregue em 2026-11-25, direto na `main`, por pedido do dono (lista e regras em [`docs/MAGO_ROUPAS.md`](../MAGO_ROUPAS.md), seguidas com as opções recomendadas). É a fundação: **o Mago passa a vestir**, com o **conjunto do Aprendiz** (sete peças). Os atributos de mana e de dano (lote A2) e os conjuntos dos níveis 10 em diante (lotes B a E) vêm depois.

## Antes

O [ADR 0072](0072-mago-jogavel.md) liberou o Mago sem roupas: o inventário dele só mostrava o cajado e a tentativa de vestir algo respondia "o Mago ainda não veste armadura". O desenho do Mago já tinha chapéu, túnica e manto fixos, sem relação com o inventário. O Cavaleiro só tem o kit inicial de nove peças (defesa de 0 a 2) e o desenho dele reconhece essas peças por nome fixo.

## Decisões

1. **Sete peças do Aprendiz**, uma por espaço, cada uma no seu arquivo (`engine/character/mage/gear/apprentice/`, reunidas pelo `index.ts`; a separação por peça veio no [ADR 0082](0082-um-item-um-arquivo.md)): **Chapéu de Aprendiz**, **Túnica de Aprendiz** (a única com defesa, 1), **Calça de Aprendiz**, **Botas de Aprendiz**, **Caderno de Feitiços** (o livro de magias, no espaço do escudo), **Anel de Latão** e **Pingente de Cristal Baço**. Entram no mesmo catálogo `GEAR` do Cavaleiro, com `heroClass: "mage"`; sem esse campo a peça é do Cavaleiro (as nove de sempre, sem mudar nada nelas).
2. **O que cada vocação veste:** `gearHeroClass(id)` diz de quem é a peça. Equipar peça de outra vocação responde `gear-wrong-class` ("Essa peça é de outra vocação: o Mago veste roupas mágicas e o Cavaleiro, armaduras") e não muda nada; um save com peças da outra vocação não as veste (`gearForClass`).
3. **Os espaços do Mago** vêm da ficha da vocação (`equipmentSlots`, `slotLabels`): **oito** (cajado, chapéu, colar, anel, túnica, livro de magias, calça e botas), **sem mochila** (hoje é só enfeite) **e sem flechas** (são dos arqueiros), com os nomes dele (Cajado, Chapéu, Túnica, Livro de magias...). O Cavaleiro continua com os dez e os mesmos nomes. `wearsArmor` passa a ser verdadeiro para o Mago; a mensagem `NO_ARMOR_MESSAGE` saiu.
4. **O Mago nasce vestido** com o conjunto do Aprendiz inteiro, o desenho de sempre dele. O Cavaleiro nasce sem nada vestido, como antes. **Quem tirar peças continua sem elas**: o save do Mago guarda o registro de equipamento mesmo vazio (`gear: {}`), então ele não volta a nascer vestido ao recarregar. Um save antigo de Mago, sem registro de equipamento, nasce com o conjunto do Aprendiz (nada do que ele via muda de uma vez). O save do Cavaleiro sem nada vestido continua sem o campo `gear`. Um registro de equipamento que não é um objeto é ignorado.
5. **O desenho vem do que está vestido** (`render/hero/mage/index.ts`, `mageWear`): sem o **chapéu**, a cabeça fica descoberta; sem a **túnica**, o Mago fica de camisa lisa (sem barra, manto nem detalhes do peito); a **calça** e as **botas** dão a cor própria às pernas e aos pés (sem elas, o corpo mostra a calça e a bota de base de todos); o **livro de magias** aparece preso à mão livre, na mesma posição e oscilação do escudo do Cavaleiro; o **anel** brilha na mão que segura o cajado; o **pingente** pende no peito. Sem registro de equipamento no desenho (`undefined`), vale o conjunto inteiro (vale para as telas que desenham o herói sem saber o equipamento). Peças novas, uma por arquivo (`render/hero/mage/gear/`): livro, anel, pingente e as cores da calça e das botas. Ícones novos no inventário (`mage-hat`, `mage-robe`, `mage-trousers`, `mage-boots`, `mage-book`; o anel e o pingente usam os do Cavaleiro).
6. **A tela do inventário** mostra, para o Mago, **oito espaços** em duas colunas ao redor do herói (a grade `.mage-grid`: chapéu, colar, túnica e calça de um lado; anel, cajado, livro de magias e botas do outro), a defesa (`Defesa 1`), e a mochila lista só as peças da vocação ("Conjunto do Aprendiz").
7. **O catálogo do mercado** (`server/src/db/catalog.ts`, o banco PostgreSQL) segue só com o kit do Cavaleiro, como já estava com os cajados: publicar as roupas do Mago mudaria o banco no deploy da VPS e não foi pedido.

## Contrato de arte

Livro, anel e pingente estão registrados em `tests/helpers/artAssets.ts` como peças pequenas, **sem baixar piso e sem exceção**. O anel e o pingente, pequenos demais para o piso de operações e de cores, foram enriquecidos (aro com sombra, brilho e runa; pedra facetada em degradê; elos da corrente, garras e anel de ouro; fita marcadora no livro). O Cavaleiro continua desenhado **pixel a pixel igual**: as 216 combinações de direção, passo, golpe, dano e equipamento dão a mesma assinatura de desenho de antes.

## Verificação

- `tests/mage-gear.test.ts` (9): o conjunto (peças, espaços, defesa, nomes, a lista no documento), a ficha do Mago, o nascimento vestido e o registro vazio no save, equipar e tirar (espaço errado, vocação errada, de uma vocação e de outra), o mundo e o save antigo, o desenho de cada peça (vestida aparece, tirada some, cada uma muda o desenho, o kit do Cavaleiro não veste o Mago), `mageWear`, a ligação do HUD, da grade e dos ícones, o catálogo do mercado, o registro de arte.
- Testes antigos que supunham "o Mago não veste armadura" foram trocados pelas regras novas: `mage-release`, `hero-mage-body`, `inventory`, e a tela de escolha de herói no navegador.
- `tests/browser/mage-gear.spec.ts` (desktop e Android): oito espaços com os nomes do Mago, sem mochila nem flechas, `Defesa 1`; o chapéu e o livro aparecem nos pixels do desenho da prévia; tirar o chapéu o faz sumir e o save guarda o resto; tirar a túnica leva a defesa a 0; recarregar mantém o que foi tirado; vestir de novo traz de volta.
- Mutações: **35** estragos de propósito (de quem é a peça, o kit da vocação, o filtro do save, o nascimento vestido, o registro vazio, a trava de vocação, a passagem da vocação ao inventário, os espaços do Mago, os nomes, a mochila, a grade, o catálogo do mercado, cada peça no desenho). Um passou batido na primeira rodada (um registro que é uma lista aceito como registro) e foi fechado com teste novo; os 35 foram pegos.

## Limites

- **Só o conjunto do Aprendiz existe.** Os bônus de mana máxima, recarga de mana e dano das magias (e o texto deles no inventário) entram no lote A2; hoje as peças só dão defesa (1, da túnica). Os outros dez conjuntos entram nos lotes B a E.
- **Os ícones por conjunto** (cada conjunto com as próprias cores) pedem um jeito de recolorir o ícone por peça; hoje os cinco ícones do Mago têm as cores do Aprendiz. Resolve-se junto com o lote B.
- Os números (defesa 1 na túnica) e os nomes são propostas do dono. Android físico não foi testado.
