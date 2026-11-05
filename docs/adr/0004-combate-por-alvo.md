# ADR 0004 — Combate por alvo na entrada normal

Solo e salas Node usam `ClassicCombat` e `ClassicPursuit`. A perseguição usa a malha da caminhada e procura um dos centros de tile válidos para atacar. O motor limita os recálculos a uma busca por herói a cada 0,4 s, mesmo com trocas de alvo.

No protocolo v3, o navegador solicita `movement=tiles&combat=target` e ativa o combate por alvo quando o `welcome` confirma os dois recursos. Clientes antigos e backends sem a confirmação continuam enviando direção e ataque livre. O formato do save continua aceitando os mundos existentes.

O comando `target` envia o ID da criatura ou `null` para cancelar. O servidor valida vida, distância e identidade da criatura na sala. O botão ATACAR busca a criatura próxima ou retoma o seguimento. O servidor envia `focus` apenas ao jogador que selecionou o alvo. A sala decide alcance, linha de visão, recarga, dano e crédito de abate.

Direção manual tem prioridade. Caminhar para um ponto do mapa suspende a perseguição, mas permite acertar o alvo caso esteja ao alcance. No online, menus, interiores e aba oculta cancelam o alvo para interromper o ataque automático. A troca de alvo durante a preparação invalida o golpe, preservando a recarga.
