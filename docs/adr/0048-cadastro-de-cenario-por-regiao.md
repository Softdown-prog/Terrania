# ADR 0048 — Proteção do crescimento, parte 4: cadastro de cenário por região

**Estado:** entregue em 2026-11-12, direto na `main`. Última proteção da rodada pedida pelo dono (ADR 0045 a 0047).

## Contexto

`renderScenery` (em `render/scenery.ts`) escolhia o que desenhar por uma sequência de `if` sobre o tipo do objeto, e **quatro dos onze ramos eram do Sul** (ruína, torre, cidade e decoração do deserto). Cada região nova, ou cada tipo novo, obrigava a editar esse arquivo comum, que importava as peças de cada região. Já tinha custado caro: o ramo `else` final desenhava uma **fogueira** para qualquer tipo sem ramo, e foi preciso guardar a decoração (ADR 0036) para ela não virar fogueira.

## Decisões

1. **Cadastro de pintores** (`src/render/props/`): `types.ts` (o objeto `Scenery`, o `SceneryEnv` que cada pintor recebe e o tipo `SceneryPainter`), `spriteCache.ts` (o cache de sprites que estava dentro de `scenery.ts`, agora compartilhado) e `registry.ts` (`REGION_PAINTERS`, uma linha por região; `mergePainters` falha se dois pintores pedirem o mesmo tipo, para um não esconder o outro em silêncio). `scenery.ts` pergunta primeiro `regionPainterFor(prop.kind)` e só desenha ele mesmo os tipos comuns (árvore, casa, pedra, arco, placa, fogueira e marcos regionais).
2. **Cada tipo do Sul mora na pasta da sua peça**: `south/ruins/sceneryPainter.ts`, `south/towers/sceneryPainter.ts`, `south/city/sceneryPainter.ts` e `south/decor/sceneryPainter.ts`, reunidos por `south/sceneryPainters.ts`, na raiz da região (assim nenhuma subpasta importa a irmã, regra do ADR 0045). As constantes de profundidade das ruínas foram para `south/ruins/depth.ts`.
3. **Um tipo regional sem o campo do seu tipo não desenha nada** (ruína sem camada, torre sem id, decoração sem tipo, cidade sem peça) e **nunca cai na fogueira**: o caminho antigo, que caía no `else`, deixou de existir.
4. **Região nova** passa a ser: criar a pasta da região com os pintores, um `sceneryPainters.ts` e **uma linha** em `REGION_PAINTERS`. O `scenery.ts` não muda. `scenery.ts` encolheu de 459 para 381 linhas e não importa mais nenhuma peça cadastrada.
5. `blit` passou a receber o sprite primeiro (`blit(sprite, ctx)`): o contrato de arte considera desenhador toda função exportada que recebe um Canvas na frente, e carimbar um sprite já pronto não é desenhar.

## Verificação

- `tests/scenery-registry.test.ts` (7): o cadastro tem exatamente os quatro tipos do Sul e nenhum comum; pintor duplicado é erro e regiões diferentes se juntam; o cache de sprites (uma pintura por chave, origem do sprite, limpeza, sem Canvas devolve `null`); o carimbo e a profundidade da ruína (fundo recuado 30 px, frente avançada 6 px); cada pintor regional desenha o seu tipo, os quatro sem o campo do tipo não desenham nada e a fogueira comum continua no `scenery.ts`; `scenery.ts` sem os ramos nem as importações regionais; e o cadastro só conhece pintores de região, cada um na pasta da sua peça.
- Testes de ruínas, decoração, prédios, torres e pedras atualizados para os novos caminhos (listas de arquivos e trechos que mudaram de lugar), sem afrouxar nenhuma asserção de desenho.
- Mutações (todas reprovadas, menos um equivalente): pintor duplicado aceito, sem região cadastrada, `scenery.ts` ignorando o pintor regional, ruína fora do cadastro, cache de sprite sem memória e que não limpa, carimbo sem a origem, ruína, torre e decoração sem o campo desenhando, torre fora do mapa do Sul e ruína sem profundidade. Equivalente: tirar a guarda `if (!kind)` da cidade (o desenho antigo da cidade já não desenha nada com tipo indefinido).
- 917+ testes, contrato de arte, fronteiras entre regiões, orçamento de custo e navegador seguem verdes.

## Limites

- A pedra de arenito (`south/rocks`) ainda é escolhida dentro do ramo `rock` do `scenery.ts`, por estilo: um estilo de pedra de outra região ainda pede uma edição ali. Próximo candidato a cadastro, junto dos estilos de pedra.
- A interface `Scenery` ainda lista os campos opcionais de cada região (`decorKind`, `towerId`, `ruinLayer`, `cityKind`); uma região nova ainda acrescenta campos a `props/types.ts`. Trocar por um campo genérico é uma decisão de modelo de dados, não de arte.
- Os marcos regionais (`regional-landmark`) já são um tipo comum que escolhe a peça por `landmarkKind`; não foram movidos.
