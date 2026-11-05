const AELA_SLIME_GOAL = 5;

export interface AelaQuestProgress {
  readonly defeated: number;
  readonly goal: number;
  readonly completed: boolean;
}

export function aelaQuestProgress(kills: number): AelaQuestProgress {
  const defeated = Number.isFinite(kills)
    ? Math.max(0, Math.min(Math.floor(kills), AELA_SLIME_GOAL))
    : 0;
  return { defeated, goal: AELA_SLIME_GOAL, completed: defeated === AELA_SLIME_GOAL };
}
