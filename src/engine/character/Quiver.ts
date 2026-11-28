import { ARROW_IDS, DEFAULT_ARROW, MAX_ARROWS, isArrowId, type ArrowId } from "./Arrows.ts";

/**
 * A aljava do Arqueiro (ADR 0110): quantas flechas de cada tipo ele leva e qual está em uso. Cada tiro gasta uma da flecha em uso; o espaço Flechas do
 * inventário mostra a quantidade e o tipo. Vai no save da bolsa só para o Arqueiro (o único que atira com munição). A flecha em uso nunca fica numa pilha
 * vazia enquanto houver outra com flechas: quando o tipo acaba, passa para o primeiro que tiver (ADR 0117).
 */
export interface Quiver {
  readonly equipped: ArrowId;
  readonly counts: Readonly<Record<ArrowId, number>>;
}
/** O que o Arqueiro leva ao começar o mundo: 30 flechas de junco. */
export const STARTING_ARROWS = 30;
const empty = (): Record<ArrowId, number> => Object.fromEntries(ARROW_IDS.map(id => [id, 0])) as Record<ArrowId, number>;
export const STARTING_QUIVER: Quiver = { equipped: DEFAULT_ARROW, counts: { ...empty(), [DEFAULT_ARROW]: STARTING_ARROWS } };
export const EMPTY_QUIVER: Quiver = { equipped: DEFAULT_ARROW, counts: empty() };

/** Se o tipo em uso está sem flechas e outro tem, passa para o primeiro que tiver (na ordem do catálogo); senão, não muda nada. */
function settled(quiver: Quiver): Quiver {
  if (quiver.counts[quiver.equipped] > 0) return quiver;
  const next = ARROW_IDS.find(id => quiver.counts[id] > 0);
  return next === undefined ? quiver : { ...quiver, equipped: next };
}

/** O que vale do save: só tipos que existem, contagens inteiras de 0 a 99, e a flecha em uso conhecida (senão a de junco) e com flechas, se houver. */
export function sanitizeQuiver(value: unknown): Quiver {
  if (!value || typeof value !== "object") return EMPTY_QUIVER;
  const raw = value as { equipped?: unknown; counts?: unknown };
  const counts = empty(), saved = raw.counts && typeof raw.counts === "object" ? raw.counts as Record<string, unknown> : {};
  for (const id of ARROW_IDS) {
    const n = saved[id];
    if (typeof n === "number" && Number.isSafeInteger(n) && n > 0) counts[id] = Math.min(MAX_ARROWS, n);
  }
  return settled({ equipped: isArrowId(raw.equipped) ? raw.equipped : DEFAULT_ARROW, counts });
}
export const totalArrows = (quiver: Quiver): number => ARROW_IDS.reduce((sum, id) => sum + quiver.counts[id], 0);
/** Gasta `amount` flechas da que está em uso, tudo ou nada: sem o suficiente, nada muda (devolve `null`). Se o tipo acabou, passa para o próximo que tiver flechas. */
export function spendArrows(quiver: Quiver, amount: number): Quiver | null {
  if (!Number.isSafeInteger(amount) || amount < 1 || quiver.counts[quiver.equipped] < amount) return null;
  return settled({ ...quiver, counts: { ...quiver.counts, [quiver.equipped]: quiver.counts[quiver.equipped] - amount } });
}
/** Põe flechas na aljava até o máximo do tipo; devolve a nova aljava e quantas realmente entraram. Com a aljava sem flecha nenhuma, o tipo que entrou passa a ser o em uso. */
export function addArrows(quiver: Quiver, id: ArrowId, amount: number): { readonly quiver: Quiver; readonly added: number } {
  if (!isArrowId(id) || !Number.isSafeInteger(amount) || amount < 1) return { quiver, added: 0 };
  const added = Math.min(amount, MAX_ARROWS - quiver.counts[id]);
  return added < 1 ? { quiver, added: 0 } : { quiver: settled({ ...quiver, counts: { ...quiver.counts, [id]: quiver.counts[id] + added } }), added };
}
/** Quantas flechas de `id` ainda cabem na aljava. */
export const arrowRoom = (quiver: Quiver, id: ArrowId): number => MAX_ARROWS - quiver.counts[id];
/** Muda a flecha em uso: só para um tipo que existe e de que há flechas. Devolve `null` se não der (nada muda). */
export function selectArrow(quiver: Quiver, id: ArrowId): Quiver | null {
  if (!isArrowId(id) || quiver.counts[id] < 1) return null;
  return id === quiver.equipped ? quiver : { ...quiver, equipped: id };
}
