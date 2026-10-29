/** NPCs e diálogos locais. Não modificam o estado autoritativo do multiplayer. */
export interface Npc {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly x: number;
  readonly y: number;
}
export const NPC_TALK_RANGE = 82;
export const NPCS: readonly Npc[] = [
  { id: "aela", name: "Aela", role: "Guardiã da clareira", x: 80, y: -16 },
];

/** Seleciona somente NPCs próximos; rejeita coordenadas inválidas. */
export function nearestNpc(x: number, y: number): Npc | null {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  let nearest: Npc | null = null;
  let distance = NPC_TALK_RANGE;
  for (const npc of NPCS) {
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
