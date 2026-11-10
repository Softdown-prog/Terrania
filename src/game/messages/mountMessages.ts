import type { MountActionResult } from "../../engine/mounts/MountStable.ts";

/** Texto de cada resultado de uma ação de montaria. Só dados; `Record` obriga a cobrir todo resultado novo. */
export const MOUNT_MESSAGES: Record<MountActionResult, string> = {
  built: "Cercado do estábulo construído. Agora você pode treinar Cavalaria I.",
  upgraded: "Estábulo ampliado. Novas montarias podem ser abrigadas.",
  trained: "Cavalaria elevada! Verifique suas missões de domesticação.",
  "quest-started": "Eron entregou a Maçã Silvestre Doce. Siga as marcas de cascos a oeste da vila.",
  "tracks-found": "Pegadas encontradas! Afaste os slimes que cercam o cavalo.",
  "halter-made": "Cabresto fabricado. Procure o cavalo e ofereça a maçã doce.",
  calmed: "O Garrano está calmo e vai acompanhar você. Volte ao estábulo para completar o resgate.",
  returned: "Garrano entregue a Eron! Cavalo de Batalha e Sela de Couro Simples conquistados.",
  mounted: "Cavalo de Batalha montado. Sua energia diminui ao galopar.",
  dismounted: "Você desmontou com segurança.",
  "no-level": "Seu nível ainda é baixo para essa etapa de Cavalaria.",
  "no-gel": "Gel insuficiente para fabricar o cabresto.",
  "no-coins": "Moedas insuficientes para construir ou ampliar o estábulo.",
  "no-stable": "O cercado precisa ser construído ou ampliado primeiro.",
  "no-training": "É necessário Cavalaria adequada e nível suficiente.",
  "missing-quest": "Converse com o Mestre de Estábulos para iniciar a missão.",
  "quest-active": "Você já possui uma missão de domesticação em andamento.",
  "already-owned": "Essa montaria já foi conquistada.",
  "no-apple": "A Maçã Silvestre Doce da missão está ausente.",
  "no-halter": "Você precisa fabricar um cabresto no estábulo.",
  "slimes-needed": "Derrote cinco slimes após aceitar a missão e examinar as pegadas.",
  "too-far": "Aproxime-se da pegada, do estábulo ou do animal para essa ação.",
  "not-ready": "Conclua o objetivo atual antes de avançar a missão.",
  unavailable: "Essa ação ainda não está disponível.",
  "stamina-low": "A montaria precisa descansar.",
};

/** Mostrada quando a ação é pedida fora da superfície (caverna, interior) ou com o herói caído. */
export const MOUNT_BLOCKED_MESSAGE = "Volte à superfície para cuidar das montarias.";
