# ADR 0032 — Gruta Luminosa: um segundo interior para as cavernas

**Estado:** entregue em 2026-11-11, direto na `main` por pedido do dono. Quinta tarefa seguida (cavernas).

## Contexto

Todas as cavernas comuns tinham o mesmo interior: a planta de cinco salas ovais, mudando só a paleta e a formação de cada um dos seis temas. O dono pediu mais um interior para variar a aparência. O mapa das cavernas existentes é travado por `tests/cave-floor.test.ts` (impressões digitais das células), então a variação precisava ser **visual**, sem mexer em planta, colisão nem monstros.

## Decisões

1. **Estilo visual por entrada** (`src/world/caveStyle/`, um arquivo por assunto): `CaveStyle = "plain" | "luminous"` e `caveStyleFor(entrada)`, determinística pela posição e semente da própria entrada (sal próprio, 4421) e **igual em todos os andares**. Cerca de **35 %** das cavernas comuns ganham a **Gruta Luminosa** (`LUMINOUS_SHARE`). A gruta de treino e as portas de torre ficam sempre como são.
2. **Só aparência:** `CaveFloor`, `CaveRoom` e `dungeons` não conhecem o estilo (conferido por teste). Planta, colisão, população, chefes e nomes não mudam; as impressões digitais das células continuam valendo, e três das doze travadas são luminosas.
3. **Aparência da gruta** (`src/render/caveStyles/luminous/`, uma peça por arquivo): `palette.ts` (paleta derivada da do tema, puxada para o azul-petróleo, com brilho verde-água que herda a cor da região), `mushroom.ts` (touceira de três cogumelos com halo), `glowPool.ts` (poça de musgo luminoso com luz que sobe do tapete) e `placement.ts` (onde cada peça fica: poças no chão aberto, cogumelos junto às paredes). `paletteFor.ts` escolhe a paleta do interior.
4. **Pintura:** o halo das peças passa do tile, então elas são pintadas num **passe próprio depois de todos os tiles** (de trás para frente) e o halo é misturado em `screen`. O resultado fica no cache do andar, sem custo por quadro. As formações comuns (pedra, raiz, cristal) não aparecem na gruta luminosa; as faces de rocha usam a paleta luminosa; a escuridão das bordas é mais leve e puxa para o petróleo; o mapa do andar usa a mesma paleta.
5. **Contrato de arte:** `drawGlowMushroom` e `drawGlowPool` estão registradas como `prop` nos seis temas (12 peças novas) e passam sem mexer em nenhum piso nem na lista fechada de exceções.
6. Sem mudança de save, de Go, de servidor nem de nomes de caverna.

## Verificação

- `tests/cave-style.test.ts` (9 testes): escolha determinística e fração de 35 % nas cavernas comuns; gruta de treino e torres nunca luminosas; planta e população não conhecem o estilo e o teste das plantas cobre grutas luminosas; paleta própria por tema (rocha mais escura, brilho verde-água) e a comum idêntica por referência; cada peça no seu arquivo e registrada; peças estáveis e equilibradas; colocação determinística, em chão aberto e cogumelos só junto às paredes; o piso desenha exatamente as peças da lista (contando os halos) e nenhuma formação comum, enquanto a comum não desenha nada luminoso.
- Mutações conferidas (todas reprovadas): sempre comum, ignorar torre, ignorar a gruta de treino, mudar a fração, ignorar o estilo na paleta, não desenhar cogumelos, não desenhar poças, manter as formações comuns, colocar em parede, não ordenar, desbalancear o contexto e fazer a planta depender do estilo.
- **Cavernas comuns idênticas:** a gravação completa do desenho (cena e mapa) de 8 cavernas comuns, inclusive a de treino, é igual antes e depois da mudança; só a caverna sorteada como luminosa mudou.
- `tests/browser/cave-luminous.spec.ts` (desktop e Android): entrar numa caverna comum e numa luminosa do mesmo tema; a luminosa mostra brilho verde-água e a comum não; o mapa do andar abre sem erros.
- Capturas para revisão visual: `cavernas-comparacao.png` (comum × luminosa em três temas) e `pecas-luminosas.png` (peças ampliadas).

## Limites

- As poças ainda se repetem bastante (tapetes parecidos); mais variedade de forma e uma terceira peça (cogumelo alto, cristal fúngico) seriam bons próximos passos.
- Um interior com **planta própria** (como uma mina) não foi feito: mudaria o mapa de cavernas existentes e exigiria rebaixar as impressões digitais; fica como decisão futura.
- O nome da caverna não muda ("Gruta das Raízes" luminosa continua com o nome de sempre).
- Não verificado: Android físico.
