import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { EquipmentSlot, GearSlot } from '../engine/Equipment.ts';
import type { FoodId } from '../engine/Food.ts';
import type { WeaponId } from '../engine/Weapons.ts';

/** Ícones desenhados para o Terrania. Somente apresentação: não carregam regra de jogo. */
export type ItemIconId =
  | 'gel' | 'potion' | 'apple' | 'bread' | 'meat'
  | 'sword-starter' | 'sword-forge'
  | 'ring' | 'helm' | 'pendant' | 'shield' | 'chest' | 'pack' | 'legs' | 'arrows' | 'boots';

const SLOT_ICONS: Record<GearSlot, ItemIconId> = {
  ring: 'ring', head: 'helm', neck: 'pendant', shield: 'shield', chest: 'chest',
  backpack: 'pack', legs: 'legs', ammo: 'arrows', feet: 'boots',
};
const FOOD_ICONS: Record<FoodId, ItemIconId> = { apple: 'apple', bread: 'bread', meat: 'meat' };

export function slotItemIcon(slot: EquipmentSlot, weapon: WeaponId): ItemIconId {
  return slot === 'weapon' ? weaponItemIcon(weapon) : SLOT_ICONS[slot];
}
export function weaponItemIcon(weapon: WeaponId): ItemIconId {
  return weapon === 'forge' ? 'sword-forge' : 'sword-starter';
}
export function foodItemIcon(food: FoodId): ItemIconId { return FOOD_ICONS[food]; }

/**
 * Cada ícone usa um quadro 32 × 32, contorno escuro comum e duas ou três cores planas.
 * Sem gradientes nem ids internos, para repetir o mesmo ícone várias vezes sem colisões.
 */
@Component({
  selector: 'app-item-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'item-icon', 'aria-hidden': 'true', '[attr.data-icon]': 'name()' },
  template: `
    <svg viewBox="0 0 32 32" focusable="false" stroke="#20150f" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round">
      @switch (name()) {
        @case ('gel') {
          <path d="M16 3.5C13 10 6.5 13.5 6.5 20C6.5 25.5 10.5 28.5 16 28.5C21.5 28.5 25.5 25.5 25.5 20C25.5 13.5 19 10 16 3.5Z" fill="#4fd68a"/>
          <path d="M9 23.5Q16 29.5 23 23.5Q23 27.5 16 28Q10 27.5 9 23.5Z" fill="#2a9b63" stroke="none"/>
          <ellipse cx="11.6" cy="19" rx="2" ry="3.4" fill="#c4f9da" stroke="none" transform="rotate(12 11.6 19)"/>
        }
        @case ('potion') {
          <path d="M13 11V14C8 16 6 19.5 6 23C6 27 10 29 16 29C22 29 26 27 26 23C26 19.5 24 16 19 14V11Z" fill="#e6e2ec"/>
          <path d="M7 22C8 19 11 18 16 18C21 18 24 19 25 22C25 26 22 28 16 28C10 28 7 26 7 22Z" fill="#e0405a" stroke="none"/>
          <path d="M13 11V14C8 16 6 19.5 6 23C6 27 10 29 16 29C22 29 26 27 26 23C26 19.5 24 16 19 14V11Z" fill="none"/>
          <rect x="12.5" y="3" width="7" height="4" rx="1.2" fill="#b98a55"/>
          <ellipse cx="11.2" cy="23.5" rx="1.6" ry="2.6" fill="#fff" stroke="none" opacity=".75"/>
        }
        @case ('apple') {
          <path d="M16 10C12 7 6 9 6 16C6 23 10 28 13 28C14.5 28 15 27.3 16 27.3C17 27.3 17.5 28 19 28C22 28 26 23 26 16C26 9 20 7 16 10Z" fill="#d8433a"/>
          <ellipse cx="11.2" cy="15.5" rx="1.8" ry="3.2" fill="#ff9f92" stroke="none" transform="rotate(10 11.2 15.5)"/>
          <path d="M16 10C16 7 17 5 19.5 3.5" fill="none" stroke="#5b3a1e" stroke-width="2"/>
          <path d="M18.5 7.5C20 4.5 24 4 25.5 5C24.5 8.5 21 9.5 18.5 7.5Z" fill="#5fb14a"/>
        }
        @case ('bread') {
          <path d="M4.5 19.5C4.5 12.5 10 8 16 8C22 8 27.5 12.5 27.5 19.5C27.5 22.5 25.5 24.5 22.5 24.5H9.5C6.5 24.5 4.5 22.5 4.5 19.5Z" fill="#dba85c"/>
          <path d="M5.5 20.5H26.5C26.5 23.5 24.5 24.5 22.5 24.5H9.5C7.5 24.5 5.5 23.5 5.5 20.5Z" fill="#b87a38" stroke="none"/>
          <path d="M11 13Q12.7 14 13.2 17.2M16 11.5V16.8M21 13Q19.3 14 18.8 17.2" fill="none" stroke="#f7d89a" stroke-width="1.7"/>
        }
        @case ('meat') {
          <path d="M9 23L15 17" fill="none" stroke="#20150f" stroke-width="5.6"/>
          <path d="M9 23L15 17" fill="none" stroke="#f3ecd9" stroke-width="2.6"/>
          <circle cx="6.5" cy="23.2" r="2.5" fill="#f3ecd9"/>
          <circle cx="9.2" cy="26" r="2.5" fill="#f3ecd9"/>
          <path d="M12 16C10 10 15 5 21 6C27 7 29.5 13 26.5 18C23.5 23 16 22 12 16Z" fill="#bd6730"/>
          <path d="M16 9.5C19 8.3 22 9.3 23.3 11.3" fill="none" stroke="#efa25f" stroke-width="1.7"/>
          <path d="M14.5 17.3C17.5 21 23 21 26 17.3" fill="none" stroke="#8a3f1c" stroke-width="1.6"/>
        }
        @case ('sword-starter') {
          <g transform="rotate(45 16 16)">
            <path d="M16 2L18.2 5.2V18H13.8V5.2Z" fill="#cfd6dc"/>
            <path d="M16 5.5V17" stroke="#8f9aa3" stroke-width="1" fill="none"/>
            <rect x="10" y="18" width="12" height="2.8" rx="1.2" fill="#8a6a3c"/>
            <rect x="14.6" y="20.8" width="2.8" height="6" fill="#5b3a1e"/>
            <circle cx="16" cy="28.2" r="2" fill="#8a6a3c"/>
          </g>
        }
        @case ('sword-forge') {
          <g transform="rotate(45 16 16)">
            <path d="M16 1L19.2 4.8V18H12.8V4.8Z" fill="#a9cdf0"/>
            <path d="M16 4.5V17" stroke="#5f8fc2" stroke-width="1.5" fill="none"/>
            <path d="M18 6.5V17" stroke="#eaf5ff" stroke-width=".9" fill="none"/>
            <path d="M7.5 17.4H12.6L13 20.6H19L19.4 17.4H24.5L22.4 22.2H9.6Z" fill="#e3b647"/>
            <rect x="14.6" y="22.2" width="2.8" height="5" fill="#3d2a1c"/>
            <circle cx="16" cy="28.6" r="2.1" fill="#d8433a"/>
          </g>
        }
        @case ('ring') {
          <path fill-rule="evenodd" d="M7 19A9 8 0 1 0 25 19A9 8 0 1 0 7 19ZM10.4 19.4A5.6 4.8 0 1 0 21.6 19.4A5.6 4.8 0 1 0 10.4 19.4Z" fill="#e3b647"/>
          <path d="M16 3.5L20.6 8L16 13.5L11.4 8Z" fill="#5cc8f2"/>
          <path d="M11.4 8H20.6M16 3.5V13.5" fill="none" stroke="#d9f4ff" stroke-width="1"/>
        }
        @case ('helm') {
          <path d="M6 24.5V17C6 10 10 5 16 5C22 5 26 10 26 17V24.5Z" fill="#aeb8c2"/>
          <path d="M9 12.5C10 9.8 12 7.8 14.3 7" fill="none" stroke="#eef3f7" stroke-width="1.7"/>
          <rect x="9" y="15" width="14" height="3.6" rx="1.2" fill="#20150f"/>
          <rect x="14.5" y="14.5" width="3" height="10" fill="#8f9aa4"/>
          <rect x="6" y="22" width="20" height="3.2" fill="#7f8a95"/>
        }
        @case ('pendant') {
          <path d="M8.5 3.5C8.5 13.5 12 18.5 16 20.5C20 18.5 23.5 13.5 23.5 3.5" fill="none" stroke="#20150f" stroke-width="3.2"/>
          <path d="M8.5 3.5C8.5 13.5 12 18.5 16 20.5C20 18.5 23.5 13.5 23.5 3.5" fill="none" stroke="#e3b647" stroke-width="1.4"/>
          <path d="M16 20C13 23 12 25 12 26.6C12 29 14 30 16 30C18 30 20 29 20 26.6C20 25 19 23 16 20Z" fill="#3fb7c9"/>
          <path d="M14.2 25.2C14.4 26.6 15 27.4 15.8 27.8" fill="none" stroke="#d6faff" stroke-width="1.4"/>
        }
        @case ('shield') {
          <path d="M5.5 5.5H26.5V16C26.5 23 21.5 27 16 29C10.5 27 5.5 23 5.5 16Z" fill="#a47946"/>
          <path d="M11 9V24M16 9V28M21 9V24" fill="none" stroke="#6e4a24" stroke-width="1"/>
          <rect x="5.5" y="5.5" width="21" height="3.6" fill="#b9c2ca"/>
          <circle cx="16" cy="16.5" r="3.3" fill="#cfd6dc"/>
        }
        @case ('chest') {
          <path d="M11 4L5.5 8L2.8 15.5L8 17.5L9 15.5V27H23V15.5L24 17.5L29.2 15.5L26.5 8L21 4C20 7 18 8.2 16 8.2C14 8.2 12 7 11 4Z" fill="#c9a56b"/>
          <path d="M9 14.5H23M9 19.5H23M16 8.5V27" fill="none" stroke="#8a6a3c" stroke-width="1" stroke-dasharray="2 1.8"/>
          <path d="M9 23.5H23V27H9Z" fill="#7a5a30" stroke="none"/>
        }
        @case ('pack') {
          <path d="M12 9.5C12 3.8 20 3.8 20 9.5" fill="none" stroke="#20150f" stroke-width="3.6"/>
          <path d="M12 9.5C12 3.8 20 3.8 20 9.5" fill="none" stroke="#7a5a30" stroke-width="1.6"/>
          <rect x="6.5" y="9" width="19" height="20" rx="5.5" fill="#bd9a5d"/>
          <path d="M6.5 15.5C6.5 12 9 10 12 10H20C23 10 25.5 12 25.5 15.5V17.5H6.5Z" fill="#a07f46"/>
          <rect x="14" y="15" width="4" height="5.4" rx="1.1" fill="#e3b647"/>
          <rect x="11" y="22" width="10" height="6" rx="2" fill="#a07f46"/>
        }
        @case ('legs') {
          <path d="M8 4H24L25.2 12L22 28H17.4L16 14.5L14.6 28H10L6.8 12Z" fill="#6f84a0"/>
          <rect x="8" y="4" width="16" height="3.4" fill="#4a3a28"/>
          <path d="M16 8V14.5M10.2 24.2H14M18 24.2H21.8" fill="none" stroke="#9db0c6" stroke-width="1.3"/>
        }
        @case ('arrows') {
          <g transform="rotate(40 16 16)">
            @for (dx of [-4.6, 0, 4.6]; track dx) {
              <g [attr.transform]="'translate(' + dx + ' 0)'">
                <path d="M16 5V25" fill="none" stroke="#a9824f" stroke-width="1.8"/>
                <path d="M16 2L19 8H13Z" fill="#cfd6dc"/>
                <path d="M16 21L12.4 27L16 25.2L19.6 27Z" fill="#e8dfc8"/>
              </g>
            }
          </g>
        }
        @case ('boots') {
          <path d="M10 4H19.5V16C19.5 18 21.5 19 24.5 20.5C28 22 28.4 27 25.5 27.6H8C6 27.6 5.5 26 5.5 24.5V22L10 18Z" fill="#8f5e32"/>
          <rect x="10" y="4" width="9.5" height="4.2" fill="#b07a42"/>
          <path d="M5.5 25H27L26.4 27.6H7Z" fill="#3d2a1c"/>
          <path d="M10 12H19M10 15.2H19" fill="none" stroke="#c99a60" stroke-width="1.1"/>
        }
      }
    </svg>`,
  styles: ':host { display: inline-block; width: 1em; height: 1em; line-height: 0; } svg { width: 100%; height: 100%; overflow: visible; }',
})
export class ItemIconComponent {
  readonly name = input.required<ItemIconId>();
}
