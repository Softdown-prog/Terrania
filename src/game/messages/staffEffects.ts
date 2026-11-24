import type { StaffEffect } from "../../engine/character/Staves.ts";

/** O que a magia do cajado faz além do dano, em palavras para a ficha do inventário (ADR 0073). */
export function describeStaffEffect(effect: StaffEffect | null): string {
  if (!effect) return "dano simples";
  switch (effect.kind) {
    case "push": return "empurra o alvo para trás";
    case "slow": return `deixa o alvo ${Math.round((1 - effect.factor) * 100)}% mais lento por ${effect.seconds} s`;
    case "heal": return `cura você em ${effect.percent}% do dano causado`;
  }
}
