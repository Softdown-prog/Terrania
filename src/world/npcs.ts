import { BUILDINGS, SIGNS } from "./village.ts";
/** NPCs e diálogos locais. Não modificam o estado autoritativo do multiplayer. */
export interface Npc {
  readonly id: string;
  readonly kind?: "character" | "sign" | "door";
  readonly name: string;
  readonly role: string;
  readonly x: number;
  readonly y: number;
}
export const NPC_TALK_RANGE = 82;
export const NPCS: readonly Npc[] = [
  { id: "aela", name: "Aela", role: "Guardiã da clareira", x: 80, y: -16 },
  { id: "mira", name: "Mira", role: "Cartógrafa", x: 304, y: 16 },
  { id: "toren", name: "Toren", role: "Ferreiro", x: 538, y: 32 },
  { id: "lina", name: "Lina", role: "Anfitriã", x: 448, y: 250 },
  ...SIGNS.map(s => ({ ...s, kind: "sign" as const, role: "Aviso da vila" })),
  ...BUILDINGS.map(b => ({ id: b.id, name: b.name, role: "Interior", x: b.x, y: b.y + 29, kind: "door" as const })),

];

/** Seleciona somente NPCs próximos; rejeita coordenadas inválidas. */
export function nearestNpc(x: number, y: number): Npc | null {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  let nearest: Npc | null = null;
  let distance = NPC_TALK_RANGE;
  for (const npc of NPCS) {
    // Não permitir entrar pela lateral do prédio: E só funciona diante da porta.
    if (npc.kind === "door" && (Math.abs(npc.x - x) > 25 || Math.abs(npc.y - y) > 28)) continue;
    const d = Math.hypot(npc.x - x, npc.y - y);
    if (d <= distance) {
      nearest = npc;
      distance = d;
    }
  }
  return nearest;
}

/** Falas de orientação; sem conceder itens nem mutar a missão. */
export function npcDialogue(npc: Npc, kills: number): readonly string[] {
  const progress = Number.isFinite(kills) ? Math.max(0, Math.floor(kills)) : 0;
  if (npc.id === "mira") return progress >= 5
    ? ["Aela me contou sobre sua vitória!", "Há ruínas e cavernas além da floresta. Por enquanto, conheça a vila."]
    : ["Sou Mira, cartógrafa da Vila da Travessia.", "Siga para leste, leia as placas e conheça os moradores.", "Aela ainda precisa de ajuda com os slimes."];
  if (npc.id === "toren") return progress >= 5
    ? ["Parabéns por proteger a clareira!", "Minha oficina está aberta para visitas. Equipamentos serão adicionados depois."]
    : ["Sou Toren, ferreiro.", "Chegue perto da porta e pressione E para visitar a oficina.", "Ainda não ofereço comércio."];
  if (npc.id === "lina") return progress >= 5
    ? ["Obrigado por ajudar Aela!", "Visite a hospedaria. Mais histórias e tarefas chegarão depois."]
    : ["Sou Lina, anfitriã da Travessia.", "Entre na hospedaria pela porta atrás de mim.", "Por enquanto não há serviço de descanso."];
  if (npc.id === "entrance") return ["Vila da Travessia — bem-vindo!", "Ao leste fica a praça. Ao sul, a hospedaria."];
  if (npc.id === "square") return ["Aviso: cuidado com os monstros fora da vila!", "Ajude Aela na clareira. Outras tarefas virão em etapas futuras."];
  if (npc.kind === "door") return ["Use E perto da porta para entrar em " + npc.name + "."];
  if (npc.id === "aela" && progress >= 5) {
    return [
      "Você conseguiu! Cinco slimes derrotados. A clareira pode descansar por enquanto.",
      "Além das árvores há trilhas antigas e ruínas. Esta terra guarda muitos segredos.",
      "Volte quando quiser conversar. Novas missões chegarão com a expansão do mundo.",
    ];
  }
  if (npc.id === "aela" && progress > 0) {
    return [
      "Vejo que já começou a proteger a clareira. Continue firme!",
      "Você derrotou " + Math.min(progress, 5) + " de 5 slimes. Explore as trilhas fora do círculo de pedras.",
      "Use a espada com Espaço ou J; no celular, toque no botão ATACAR.",
    ];
  }
  return [
    "Saudações, viajante! Sou Aela, a guardiã desta clareira.",
    "Os slimes estão se espalhando pela floresta. Preciso de ajuda para afastar cinco deles.",
    "Siga as trilhas além do arco de pedra, mas cuide da sua vida. Volte aqui para contar seus feitos!",
  ];
}
