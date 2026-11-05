# Mundo procedural

**Papel:** Terreno por seed, colisão, vila, marcos e NPCs.

**Ponto de entrada:** consulte [registro central](../../architecture/modules.json) e o índice gerado em [docs/INDEX.md](../../docs/INDEX.md). Os caminhos de código completos são listados automaticamente; não repetir listas manuais aqui.

**Ao alterar:** Preservar determinismo e coordenadas globais/tamanho de tile; registrar mudanças que alterem saves.

**Verificação:** tests/world, physics, village, NPCs e paridade com Go.

**Limites:** Não permitir atravessar colisões; cuidado com divergência entre cliente e servidor.
