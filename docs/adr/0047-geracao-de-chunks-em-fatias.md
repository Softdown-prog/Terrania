# ADR 0047 — Proteção do crescimento, parte 3: gerar os chunks vizinhos aos poucos, antes de precisarem

**Estado:** entregue em 2026-11-12, direto na `main`. Terceira proteção da rodada pedida pelo dono (ADR 0045 e 0046).

## Contexto

Cada chunk (16 × 16 tiles) era gerado de uma vez, de forma síncrona, **dentro do `render`**, no quadro em que aparecia. Medido andando 12 s a 170 px/s pela cidade e pelas dunas (Chromium, desktop, 60 quadros simulados por segundo, `tests`/scripts de medição fora do repositório): ao cruzar a divisa de um chunk chegavam dois ou mais de uma vez, e o quadro levava **60–70 ms** (de 4 a 6 quadros acima de 40 ms em 12 s). Cada chunk novo que se soma ao mapa (cidade, lago, ruínas) aumenta esse tranco, e num celular lento ele é bem maior.

Primeira tentativa, descartada pela medição: pré-gerar **um chunk inteiro** por intervalo. Trocava o tranco raro de 60 ms por um de 25 ms a cada seis quadros (quadros acima de 20 ms subiram de 5 para ~20), o que pode parecer pior para quem joga.

## Decisões

1. **Geração em passos** (`generateChunkSteps` em `render/terrain.ts`): o desenho do chunk virou um gerador com **21 pontos de parada**: nove lotes de tiles de chão (`CHUNK_STEP_TILES = 36`), o desfoque, cada camada de relevo, o lago e sete lotes de tiles de detalhe. `generateChunkCanvas` continua existindo e só percorre todos os passos; o **desenho é idêntico** (mesma ordem de chamadas, conferido pela assinatura de desenho em cinco tipos de lugar). Nenhum passo concentra mais de 20 % do trabalho do chunk.
2. **Agendador puro** (`render/chunkPrefetch.ts`): dado onde a câmera está, para onde anda e o que já está no cache, devolve os chunks vizinhos da tela (uma volta em torno dela) que faltam, do mais perto do ponto onde a câmera estará daqui a 0,9 s até o mais longe, cortado para nunca passar da **capacidade do cache menos 2 menos o que a tela já usa**, para a pré-geração não expulsar o que está na tela. Câmera parada (abaixo de 4 px/s) prepara o anel pelo mais perto.
3. **`WorldRenderer.warmAhead`**: dá **dois passos por quadro** (uma fração de chunk, ~4 ms) em vez de gerar um chunk inteiro. Chamado pela cena do jogo (`drawWorldView`) logo depois do `render`. A velocidade da câmera vem do relógio da simulação; **não há relógio de parede** (`performance.now` é proibido em `render`): o orçamento de um quadro é um número de passos, então continua determinístico e testável em Node.
4. **Casos de borda:** se o `render` pede o chunk que o `warmAhead` está gerando, ele **conclui o que falta**, sem refazer; um chunk em geração que ficou longe da câmera (teletransporte, troca de modo) é **abandonado**; um salto grande da câmera não conta como velocidade; valores inválidos não fazem nada; `clear()` zera tudo. `stats()` conta quantos chunks foram gerados no `render` e quantos pelo `warmAhead`.

## Medido depois

Mesma caminhada de 12 s (cidade, cidade na diagonal e dunas): o `render` **não gerou nenhum chunk depois do primeiro quadro**; o pior quadro de geração caiu de **60–70 ms para ~20 ms**, o p99 ficou em **10–12 ms** (era 0,2 a 33 ms, com os trancos concentrados) e os quadros acima de 12 ms foram de 4 a 7 em 720. O cache nunca passou de 24 chunks.

## Verificação

- `tests/chunk-steps.test.ts` (4): 21 passos, desenho idêntico ao do chunk inteiro (assinatura) em praça, lago, dunas, mata e vilarejo, nenhum passo com mais de 20 % das operações, canvas só no fim.
- `tests/chunk-prefetch.test.ts` (10): chunks visíveis iguais aos do `render`; direção (direita, esquerda, cima, baixo); plano sem tela, sem cache e sem repetição; teto do cache e vagas; câmera parada e valores inválidos; **andando 12 s pela cidade o `render` não gera chunk**, e na diagonal com mudanças de direção; dois passos por quadro e o chunk em geração concluído (não refeito) quando o `render` o pede; salto grande sem velocidade e geração longe abandonada (eixos x e y); a cena chama o `warmAhead` depois do `render`.
- `tests/browser/chunk-time.spec.ts`: o mesmo passeio no navegador, desktop e Android emulado (nenhum chunk gerado no `render`, p99 abaixo de 30 ms, no máximo quatro quadros acima de 40 ms).
- Mutações (todas reprovadas): passos demais por quadro, geração longe nunca abandonada e abandonada só no eixo x, salto que vira velocidade, `render` que refaz o chunk em geração, chunk pronto que não vai para o cache, `clear` sem zerar, plano sem teto de cache, sem ordem de proximidade, sem direção, incluindo a tela, "nunca parada", chão sem passos, lotes enormes, desfoque sem passo próprio e cena sem `warmAhead`.

## Limites

- **Um pico isolado de ~200 ms persiste** (um ou dois em 12 s) num único `drawImage` de um chunk já pronto, no Chromium sem placa de vídeo. Não é geração (aparece com 0 ms gerando, com e sem a pré-geração, com o cache maior e com coleta de lixo forçada) e some se todos os chunks já estão desenhados; parece rasterização por software no primeiro desenho. **Precisa de medição em aparelho real**; o teste de navegador tem folga para ele.
- O primeiro quadro do jogo (e depois de um teletransporte) ainda gera a tela inteira de uma vez: não há o que pré-gerar.
- Com muito zoom afastado, a tela usa tantos chunks que não sobra vaga no cache de 24: o `warmAhead` não faz nada e vale o comportamento antigo.
- Medido só no desktop; nunca em Android físico.
