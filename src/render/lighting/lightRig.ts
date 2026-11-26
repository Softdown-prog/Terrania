/**
 * A luz comum das criaturas e montarias (ADR 0090): uma só fonte, sempre do mesmo lado, para que todo o bestiário pareça iluminado pela mesma cena. É o que dá ao
 * desenho procedural o ar de "modelo pré-renderizado": volume nas bordas, brilho nas quinas voltadas para a luz, sombra no lado oposto, escurecimento perto do chão e
 * um brilho suave de material. Cada número abaixo é um botão de ajuste visual; os testes travam o que é regra (direção e ordem das camadas), não o gosto.
 */
export interface LightRig {
  /** Para onde a luz vem, em pixels do sprite (x para a direita, y para baixo): cima e esquerda. */
  readonly from: { readonly x: number; readonly y: number };
  /** Largura (em unidades do mundo) da faixa de quina iluminada e da faixa de quina na sombra. */
  readonly rimWidth: number;
  /** Quanto o contorno interno escurece (volume arredondado): raio do desfoque e cor. */
  readonly edge: { readonly blur: number; readonly color: string };
  /** O degradê grande: luz quente no alto à esquerda, sombra fria embaixo à direita. */
  readonly key: { readonly light: string; readonly shade: string };
  readonly rim: { readonly light: string; readonly shade: string };
  /** A oclusão junto ao chão: de quanto acima dos pés ela começa (unidades do mundo) e a cor. */
  readonly ground: { readonly height: number; readonly color: string };
  /** O brilho suave de material: posição relativa na caixa (0 a 1), raio relativo e cor. */
  readonly sheen: { readonly x: number; readonly y: number; readonly radius: number; readonly color: string };
}

export const LIGHT: LightRig = {
  from: { x: -1, y: -1 },
  rimWidth: 1.5,
  edge: { blur: 2.6, color: "rgba(10,16,28,.34)" },
  key: { light: "rgba(255,240,205,.30)", shade: "rgba(10,14,40,.26)" },
  rim: { light: "rgba(255,250,232,.62)", shade: "rgba(8,12,30,.34)" },
  ground: { height: 24, color: "rgba(8,12,24,.30)" },
  sheen: { x: .38, y: .34, radius: .32, color: "rgba(255,255,240,.22)" },
};

/** Caixa do sprite em unidades do mundo, com a origem nos pés: tudo o que a criatura desenha cabe aqui (a barra de vida e a sombra no chão ficam de fora). */
export interface SpriteBox { readonly left: number; readonly top: number; readonly right: number; readonly bottom: number }
export const CREATURE_BOX: SpriteBox = { left: -64, top: -78, right: 64, bottom: 12 };
export const MOUNT_BOX: SpriteBox = { left: -72, top: -90, right: 72, bottom: 12 };
