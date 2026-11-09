import { ClassicCombat } from "../engine/ClassicCombat.ts";
import { ClassicPursuit } from "../engine/ClassicPursuit.ts";
import { ClassicTileWalker } from "../engine/ClassicTileWalker.ts";
import { TapNavigator } from "../engine/TapNavigator.ts";

/**
 * Tudo que move o herói "sozinho" (rota por toque, passo em tiles, perseguição e alvo de combate)
 * reunido num só lugar, com **uma função para cada intenção**. Os reinícios que antes se repetiam em
 * `Game.ts` não eram iguais, e a diferença importa:
 *
 * - `stopAll` zera até o relógio de recarga do golpe (`combat.reset`). Serve a um mundo ou herói novo.
 * - `stopMotion` NÃO mexe no combate. Serve a quem só muda de lugar.
 * - Entrar num interior usa `combat.cancel()` direto (tira o alvo e **preserva a recarga**), por isso
 *   não há função aqui para ele: quem chama faz de propósito, como documenta o README do módulo.
 */
export class TravelState {
  readonly navigator: TapNavigator;
  readonly combat: ClassicCombat;
  readonly pursuit: ClassicPursuit;
  readonly walker: ClassicTileWalker;
  /** Depois de um toque no mapa a perseguição fica suspensa até o próximo alvo ser escolhido. */
  autoFollow = true;

  /** As peças podem ser trocadas (os testes usam dublês para ver quem é chamado); no jogo, `new TravelState()`. */
  constructor(parts: Partial<Pick<TravelState, "navigator" | "combat" | "pursuit" | "walker">> = {}) {
    this.navigator = parts.navigator ?? new TapNavigator();
    this.combat = parts.combat ?? new ClassicCombat();
    this.pursuit = parts.pursuit ?? new ClassicPursuit();
    this.walker = parts.walker ?? new ClassicTileWalker();
  }

  /** Cancela a rota e o passo já comprometido (montar e desmontar mudam a velocidade). */
  stopSteps(): void {
    this.navigator.cancel();
    this.walker.reset();
  }

  /** Para de se mover: rota, passo e perseguição. O combate fica como está (alvo e recarga). */
  stopMotion(): void {
    this.stopSteps();
    this.pursuit.reset();
  }

  /** Mundo ou herói novo: para tudo e zera também o alvo e a recarga do golpe. */
  stopAll(): void {
    this.stopMotion();
    this.combat.reset();
  }
}
