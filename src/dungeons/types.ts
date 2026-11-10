import type { WorldRegion } from "../world/regions.ts";
import type { CaveTheme } from "../world/caves.ts";
import type { RegionalCreatureKind } from "../monsters/catalog.ts";

/** Um andar de masmorra: o que ele se chama, quem mora nele e se há um chefe esperando. */
export interface DungeonFloorDefinition {
  readonly name: string;
  /** Espécies sorteadas para os encontros comuns do andar. Todas precisam morar no tema da caverna. */
  readonly monsters: readonly RegionalCreatureKind[];
  /** Quantos encontros comuns o andar tem (o chefe não conta). */
  readonly encounters: number;
  /** Chefe do andar, na câmara do fundo. Só o último andar tem. */
  readonly boss?: RegionalCreatureKind;
}

/** Uma masmorra de vários andares. Cada masmorra tem o seu arquivo, na pasta da sua região. */
export interface DungeonDefinition {
  readonly id: string;
  readonly name: string;
  readonly region: WorldRegion;
  /** Tema das cavernas que viram esta masmorra. */
  readonly theme: CaveTheme;
  /** Do primeiro andar (o da entrada) ao último (o do chefe). */
  readonly floors: readonly DungeonFloorDefinition[];
  /**
   * Versão curta: índices (de `floors`) dos andares usados quando a caverna sorteia a versão
   * enxuta. O primeiro e o último andar devem estar sempre nela.
   */
  readonly shortVariant?: readonly number[];
}
