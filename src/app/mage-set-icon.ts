import type { MageSetTheme } from '../render/hero/mage/sets/index.ts';
import type { ItemIconId } from './item-icon.component.ts';

/**
 * As cores dos ícones das roupas do Mago de cada conjunto (ADR 0080): o desenho do ícone é um só e cada parte dele leva `data-fill` ou `data-stroke`
 * (principal, escuro, claro, debrum, gema...); o conjunto manda as cores por variáveis CSS, lidas das mesmas fichas que pintam o corpo do Mago. O
 * conjunto do Aprendiz (o de origem) e o Cavaleiro ficam com as cores que o desenho já tem.
 */
export type MageSetId = MageSetTheme;

/** Cada parte pintável do ícone: nome da parte, propriedade CSS e a variável que a pinta. */
export const MAGE_ICON_PARTS: readonly (readonly [string, 'fill' | 'stroke', string])[] = [
  ['main', 'fill', '--mi-main'], ['dark', 'fill', '--mi-dark'], ['light', 'fill', '--mi-light'], ['trim', 'fill', '--mi-trim'], ['gem', 'fill', '--mi-gem'], ['page', 'fill', '--mi-page'],
  ['dark', 'stroke', '--mi-dark'], ['light', 'stroke', '--mi-light'], ['trim', 'stroke', '--mi-trim'], ['trim-dark', 'stroke', '--mi-trim-dark'], ['gem', 'stroke', '--mi-gem'], ['gem-light', 'stroke', '--mi-gem-light'],
];

/** A ficha que tinge o ícone, ou `undefined` se ele fica como é (sem conjunto, ou o do Aprendiz). */
export function mageSetTheme(set: MageSetId | null | undefined): MageSetTheme | undefined {
  return set && set.id !== 'apprentice' ? set : undefined;
}

/** As variáveis CSS (texto de estilo) que pintam o ícone `icon` com as cores do conjunto; vazio quando o ícone fica como é. */
export function mageIconTint(theme: MageSetTheme | undefined, icon: ItemIconId): string {
  if (!theme) return '';
  const base = { main: theme.tunic.mid, dark: theme.hat.dark, light: theme.tunic.light, trim: theme.trim, 'trim-dark': theme.trimD, gem: theme.gem, 'gem-light': theme.gem, page: theme.book.page };
  const colors: Record<string, string> = { ...base };
  if (icon === 'mage-hat') Object.assign(colors, { main: theme.hat.mid, dark: theme.hat.dark, light: theme.hat.light });
  else if (icon === 'mage-trousers') Object.assign(colors, { main: theme.pants });
  else if (icon === 'mage-boots') Object.assign(colors, { main: theme.boots, light: theme.bootsLight });
  else if (icon === 'mage-book') Object.assign(colors, { main: theme.book.cover.mid, dark: theme.book.cover.dark });
  else if (icon === 'ring') Object.assign(colors, { trim: theme.ring.band.light, gem: theme.ring.gem.mid, 'gem-light': theme.ring.gem.light });
  else if (icon === 'pendant') Object.assign(colors, { gem: theme.pendant.stone.mid, 'gem-light': theme.pendant.stone.light });
  return Object.entries(colors).map(([part, color]) => `--mi-${part}: ${color}`).join('; ');
}
