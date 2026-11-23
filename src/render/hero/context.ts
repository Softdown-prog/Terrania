/**
 * O que as peças de uma aparência de herói precisam saber do quadro que está sendo desenhado (ADR 0067): a orientação, o andar, a
 * inércia da capa e onde está a cabeça. Quem monta isto é `renderHero`; as peças só leem.
 */
export interface HeroDrawContext {
  /** Aplica o brilho de dano e o tom de golpe a qualquer cor. */
  readonly tone: (color: string) => string;
  /** Largura relativa do corpo (mais estreita de perfil). */
  readonly wf: number;
  /** -1, 0 ou 1: para que lado o herói olha (0 = de frente ou de costas). */
  readonly side: number;
  readonly back: boolean;
  readonly faceX: number;
  readonly faceY: number;
  /** Direção do movimento. */
  readonly mvx: number;
  readonly mvy: number;
  /** Quanto a capa é arrastada para trás pelo movimento. */
  readonly trailX: number;
  readonly trailY: number;
  /** Fase do passo e quanto o herói está andando (0 a 1). */
  readonly walkTime: number;
  readonly moving: number;
  /** Altura de cada pé no passo, para a barra da túnica acompanhar. */
  readonly liftA: number;
  readonly liftB: number;
  /** Centro da cabeça e a inércia lateral do cabelo, que o chapéu aproveita. */
  readonly headX: number;
  readonly headY: number;
  readonly tailSway: number;
  /** Relógio para brilhos suaves; 0 nas prévias estáticas. */
  readonly time: number;
}
