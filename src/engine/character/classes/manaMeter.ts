/**
 * O que a barra de mana mostra (ADR 0071): o número inteiro de mana, o máximo, quanto da barra está cheio (em %, inteiro) e se a mana
 * ficou abaixo do custo de uma magia (o Mago não consegue conjurar; a conta usa a mana exata, a mesma que a simulação confere). Pura: a tela só lê isto.
 */
export interface ManaMeter {
  readonly current: number;
  readonly max: number;
  readonly percent: number;
  readonly low: boolean;
}

const whole = (value: number): number => (Number.isFinite(value) && value > 0 ? Math.floor(value) : 0);

/** Duas leituras da barra são a mesma para a tela? (o HUD só se redesenha quando muda o número inteiro, a porcentagem ou o aviso) */
export function sameManaMeter(a: ManaMeter | null, b: ManaMeter | null): boolean {
  return a === b || (a !== null && b !== null && a.current === b.current && a.max === b.max && a.percent === b.percent && a.low === b.low);
}

/** A barra de mana, ou `null` para quem não usa mana (o Cavaleiro não tem barra). `cost` é a mana de uma magia do cajado em mãos. */
export function manaMeter(mana: number, max: number, cost: number): ManaMeter | null {
  if (!Number.isFinite(max) || max <= 0) return null;
  const current = Math.min(whole(mana), Math.floor(max));
  return { current, max: Math.floor(max), percent: Math.round((current / Math.floor(max)) * 100), low: mana < cost };
}
