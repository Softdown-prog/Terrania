import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { EquipmentSlot, GearSlot } from '../engine/character/Equipment.ts';
import type { FoodId } from '../engine/character/Food.ts';
import type { WeaponId } from '../engine/character/Weapons.ts';
import type { SouthRareLootId } from '../monsters/rareLoot.ts';

/** Ícones desenhados para o Terrania. Somente apresentação: não carregam regra de jogo. */
export type ItemIconId =
  | 'gel' | 'material' | 'potion' | 'apple' | 'bread' | 'meat'
  | 'sword-starter' | 'sword-forge' | 'sword-bronze' | 'sword-copper'
  | 'sword-dunes' | 'sword-boreal' | 'sword-obsidian' | 'sword-marsh'
  | 'sword-tempest' | 'sword-astral'
  | 'ring' | 'helm' | 'pendant' | 'shield' | 'chest' | 'pack' | 'legs' | 'arrows' | 'boots'
  | SouthRareLootId;

const SLOT_ICONS: Record<GearSlot, ItemIconId> = {
  ring: 'ring', head: 'helm', neck: 'pendant', shield: 'shield', chest: 'chest',
  backpack: 'pack', legs: 'legs', ammo: 'arrows', feet: 'boots',
};
const FOOD_ICONS: Record<FoodId, ItemIconId> = { apple: 'apple', bread: 'bread', meat: 'meat' };

export function slotItemIcon(slot: EquipmentSlot, weapon: WeaponId): ItemIconId {
  return slot === 'weapon' ? weaponItemIcon(weapon) : SLOT_ICONS[slot];
}
export function weaponItemIcon(weapon: WeaponId): ItemIconId {
  return `sword-${weapon}`;
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
        @case ('material') {
          <path d="M16 3L25 8L28 19L20 28L10 27L4 18L7 8Z" fill="#807da0"/>
          <path d="M16 3L15 14L4 18L7 8ZM15 14L28 19L20 28L10 27Z" fill="#a5c6d1"/>
          <path d="M16 3L25 8L15 14L4 18M15 14L20 28" fill="none" stroke="#edf4f4" stroke-width="1.5"/>
          <path d="M8 11L12 9L11 13" fill="none" stroke="#f5fbff" stroke-width="1.4"/>
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
            <path d="M16 2L18 5V18H14V5Z" fill="#9f7852"/>
            <path d="M16 4.5V17" stroke="#60472f" stroke-width="1.2" fill="none"/>
            <path d="M15 5L16 2L17 5" fill="none" stroke="#d7b18b" stroke-width=".9"/>
            <rect x="10" y="18" width="12" height="2.8" rx="1.2" fill="#785d40"/>
            <rect x="14.6" y="20.8" width="2.8" height="6" fill="#8c6e50"/>
            <path d="M14.5 21.5L17.4 24M14.5 24L17.4 26" fill="none" stroke="#d3c3a5" stroke-width=".9"/>
            <circle cx="16" cy="28.2" r="2" fill="#6e513a"/>
          </g>
        }
        @case ('sword-forge') {
          <g transform="rotate(45 16 16)">
            <path d="M16 1L19.2 4.8V18H12.8V4.8Z" fill="#aebcc1"/>
            <path d="M16 4.5V17" stroke="#667880" stroke-width="1.5" fill="none"/>
            <path d="M18 6.5V17" stroke="#eef4f5" stroke-width=".9" fill="none"/>
            <rect x="8.5" y="18" width="15" height="2.9" rx="1" fill="#8f999d"/>
            <path d="M9.5 18.7H22.5" stroke="#edf2ec" stroke-width=".8"/>
            <rect x="14.6" y="20.9" width="2.8" height="6" fill="#5b3b28"/>
            <path d="M14.5 22L17.4 24M14.5 24.5L17.4 26.4" fill="none" stroke="#ae8054" stroke-width=".9"/>
            <circle cx="16" cy="28.5" r="2.2" fill="#899598"/>
          </g>
        }
        @case ('sword-bronze') {
          <g transform="rotate(45 16 16)">
            <path d="M16 2L19 5V17H13V5Z" fill="#c69a69"/>
            <path d="M15 5L16 2L17 15" fill="none" stroke="#f1d7a0" stroke-width="1.5"/>
            <path d="M9 17L13 18L19 18L23 17L21 22L11 22Z" fill="#d0a957"/>
            <rect x="14.5" y="22" width="3" height="5" fill="#7c6048"/>
            <circle cx="16" cy="28.5" r="2.3" fill="#d0a957"/>
            
            
            
            
            
          </g>
        }

        @case ('sword-copper') {
          <g transform="rotate(45 16 16)">
            <path d="M16 2L19 5V17H13V5Z" fill="#b86446"/>
            <path d="M15 5L16 2L17 15" fill="none" stroke="#e59b75" stroke-width="1.5"/>
            <path d="M9 17L13 18L19 18L23 17L21 22L11 22Z" fill="#a26746"/>
            <rect x="14.5" y="22" width="3" height="5" fill="#523b37"/>
            <circle cx="16" cy="28.5" r="2.3" fill="#a26746"/>
            
            
            
            
            
          </g>
        }

        @case ('sword-dunes') {
          <g transform="rotate(45 16 16)">
            <path d="M16 2L19 5V17H13V5Z" fill="#d5af65"/>
            <path d="M15 5L16 2L17 15" fill="none" stroke="#f7db8f" stroke-width="1.5"/>
            <path d="M9 17L13 18L19 18L23 17L21 22L11 22Z" fill="#a78b58"/>
            <rect x="14.5" y="22" width="3" height="5" fill="#866e4b"/>
            <circle cx="16" cy="28.5" r="2.3" fill="#a78b58"/>
            
            
            
            
            <path d="M19 8L22 10L19 12L22 14L19 16" fill="none" stroke="#f8e4a1" stroke-width="1.2"/>
          </g>
        }

        @case ('sword-boreal') {
          <g transform="rotate(45 16 16)">
            <path d="M16 2L19 5V17H13V5Z" fill="#83d9ff"/>
            <path d="M15 5L16 2L17 15" fill="none" stroke="#ecffff" stroke-width="1.5"/>
            <path d="M9 17L13 18L19 18L23 17L21 22L11 22Z" fill="#b4e0ef"/>
            <rect x="14.5" y="22" width="3" height="5" fill="#45798f"/>
            <circle cx="16" cy="28.5" r="2.3" fill="#b4e0ef"/>
            
            
            
            
            
          </g>
        }

        @case ('sword-obsidian') {
          <g transform="rotate(45 16 16)">
            <path d="M16 2L19 5V17H13V5Z" fill="#343342"/>
            <path d="M15 5L16 2L17 15" fill="none" stroke="#fa762f" stroke-width="1.5"/>
            <path d="M9 17L13 18L19 18L23 17L21 22L11 22Z" fill="#54363d"/>
            <rect x="14.5" y="22" width="3" height="5" fill="#2f2f38"/>
            <circle cx="16" cy="28.5" r="2.3" fill="#54363d"/>
            
            <path d="M16 6L18 10L15 12L18 16" fill="none" stroke="#ff671f" stroke-width="1.4"/>
            
            
            
          </g>
        }

        @case ('sword-marsh') {
          <g transform="rotate(45 16 16)">
            <path d="M16 2L19 5V17H13V5Z" fill="#69aa52"/>
            <path d="M15 5L16 2L17 15" fill="none" stroke="#b7f66d" stroke-width="1.5"/>
            <path d="M9 17L13 18L19 18L23 17L21 22L11 22Z" fill="#adabb1"/>
            <rect x="14.5" y="22" width="3" height="5" fill="#7e5394"/>
            <circle cx="16" cy="28.5" r="2.3" fill="#adabb1"/>
            <path d="M19 8L21 12L18 11L21 15" fill="none" stroke="#9aff43" stroke-width="1.2"/>
            
            
            
            
          </g>
        }

        @case ('sword-tempest') {
          <g transform="rotate(45 16 16)">
            <path d="M16 2L19 5V17H13V5Z" fill="#4d8cdb"/>
            <path d="M15 5L16 2L17 15" fill="none" stroke="#fff07b" stroke-width="1.5"/>
            <path d="M9 17L13 18L19 18L23 17L21 22L11 22Z" fill="#d5b45e"/>
            <rect x="14.5" y="22" width="3" height="5" fill="#33477a"/>
            <circle cx="16" cy="28.5" r="2.3" fill="#d5b45e"/>
            
            
            <path d="M16 7L18 10L14 13L18 15" fill="none" stroke="#ffee58" stroke-width="1.4"/>
            
            
          </g>
        }

        @case ('sword-astral') {
          <g transform="rotate(45 16 16)">
            <path d="M16 2L19 5V17H13V5Z" fill="#496bd1"/>
            <path d="M15 5L16 2L17 15" fill="none" stroke="#ffe17e" stroke-width="1.5"/>
            <path d="M9 17L13 18L19 18L23 17L21 22L11 22Z" fill="#e3c15f"/>
            <rect x="14.5" y="22" width="3" height="5" fill="#38488e"/>
            <circle cx="16" cy="28.5" r="2.3" fill="#e3c15f"/>
            
            
            
            <path d="M15 7L18 10L15 13L17 15" fill="none" stroke="#ffda52" stroke-width="1.4"/>
            
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

        <!-- Dez itens raros autorais do Sul, 32×32, desenhados com SVG procedurais:
             contorno, silhueta, cor-base, sombras e brilhos independentes. -->
        @case ('rare-gilded-fang') {
          <path d="M8 3Q13 7 19 4Q26 2 27 9Q26 18 18 23Q12 27 3 29Q14 18 14 11Q8 12 8 3Z" fill="#a86a22"/>
          <path d="M10 5Q15 8 21 5Q25 6 23 11Q20 20 8 26Q17 16 16 10Q12 11 10 5Z" fill="#f6be44"/>
          <path d="M12 6Q18 9 22 6Q22 11 18 15Q18 10 14 10Z" fill="#fff0ad" stroke="none"/>
          <path d="M8 25Q14 20 18 15" stroke="#ffe88e" stroke-width="1.7" fill="none"/>
          <path d="M24 2V8M21 5H27M6 17V21M4 19H8" stroke="#fff6dc" stroke-width="1.1"/>
        }
        @case ('rare-prismatic-elytron') {
          <path d="M14 4Q22 2 26 8Q30 18 24 27Q17 31 14 24Q10 30 6 26Q3 17 8 8Q10 5 14 4Z" fill="#134b65"/>
          <path d="M14 5Q7 8 7 23Q10 27 14 23Z" fill="#279fc0"/>
          <path d="M17 5Q25 5 26 12Q27 22 22 26Q17 27 16 23Z" fill="#3bd1c4"/>
          <path d="M9 11L12 9L13 20L10 25M20 7L24 11L20 23L18 25" fill="none" stroke="#e9a746" stroke-width="2"/>
          <path d="M14 7Q18 6 21 8M14 9L15 27" stroke="#f7ed9f" stroke-width=".9" fill="none"/>
          <path d="M7 15L9 11M23 17L25 12" stroke="#a2f9f2" stroke-width="1.2"/>
        }
        @case ('rare-torn-treasure-map') {
          <path d="M9 4L25 5L28 11L26 16L29 24L24 27L20 25L15 29L11 25L5 26L7 20L4 15L7 10Z" fill="#b48452"/>
          <path d="M9 6L23 7L26 12L23 18L26 23L21 24L16 26L11 23L7 24L9 18L7 13Z" fill="#e5c591"/>
          <path d="M5 7Q8 4 11 7L10 24Q6 26 4 23Z" fill="#99623f"/>
          <path d="M6 9L9 8V22L6 23Z" fill="#eacb9a" stroke="none"/>
          <path d="M13 12L17 10L20 13L23 12M14 19L17 16L20 19" stroke="#93724e" fill="none" stroke-width="1.1" stroke-dasharray="1.4 2"/>
          <path d="M20 14L24 18M24 14L20 18" stroke="#ae463e" stroke-width="2" fill="none"/>
          <path d="M11 23L16 26" stroke="#ffedc6" stroke-width="1" fill="none"/>
        }
        @case ('rare-polished-viper-horn') {
          <path d="M21 3Q26 4 26 11Q26 23 6 29Q15 18 16 8Q17 4 21 3Z" fill="#b5a083"/>
          <path d="M20 5Q24 5 24 12Q23 21 9 27Q17 17 18 9Z" fill="#eee1be"/>
          <path d="M19 6Q22 6 22 10Q21 15 18 19" fill="none" stroke="#fff6dc" stroke-width="2"/>
          <path d="M17 9L25 11M16 16L23 19" fill="none" stroke="#453b38" stroke-width="3"/>
          <path d="M18 8L25 10M16 15L23 18" fill="none" stroke="#9c8b78" stroke-width="1"/>
        }
        @case ('rare-ruby-stinger') {
          <path d="M9 28L4 25L7 20L13 21L17 17L15 12L20 8L23 12L25 8L21 4Q25 3 29 6Q28 15 24 18L20 15L17 23L11 27Z" fill="#91263e"/>
          <path d="M5 23L8 21L13 23L10 27Z" fill="#ef4160"/>
          <path d="M13 21L16 17L19 18L17 23Z" fill="#fa6381"/>
          <path d="M17 12L20 9L23 13L20 16Z" fill="#c51c47"/>
          <path d="M22 6Q28 3 28 9L25 13L23 10Z" fill="#ff6c80"/>
          <path d="M7 22L10 24M19 11L21 13M23 7L26 7" stroke="#ffd4d5" stroke-width="1.2"/>
          <path d="M28 16V20M26 18H30M5 7V11M3 9H7" stroke="#ff8995" stroke-width="1"/>
        }
        @case ('rare-cracked-clan-club') {
          <g transform="rotate(35 16 16)">
            <path d="M13 17L12 29L20 29L19 17Z" fill="#6e4935"/>
            <path d="M15 18L15 28M18 18L17 29" stroke="#be8b56" stroke-width="1"/>
            <path d="M9 4Q16 1 23 5L24 17Q17 23 9 17Z" fill="#4b392f"/>
            <path d="M11 5Q17 3 22 6L22 14L18 18L11 16Z" fill="#75614b"/>
            <path d="M16 5L14 11L19 15L16 19M22 9L18 11L20 16" stroke="#312b2c" stroke-width="1.4" fill="none"/>
            <path d="M9 8L5 10L9 12M24 8L28 11L23 12M10 15L6 17L11 18" fill="#e7d3ab"/>
            <path d="M10 6L22 17M11 16L23 8" stroke="#ad8154" fill="none" stroke-width="1.6"/>
            <path d="M12 23L20 22M12 26L20 25" stroke="#3f3029" stroke-width="2"/>
            <path d="M13 6L18 5" stroke="#c3a17a" stroke-width="1.4"/>
          </g>
        }
        @case ('rare-mirage-tear') {
          <path d="M16 2Q13 10 8 16Q4 22 8 27Q12 31 17 30Q25 29 25 22Q24 16 20 12Q17 8 16 2Z" fill="#9b4d16"/>
          <path d="M16 5Q14 12 10 17Q7 23 10 26Q14 30 19 26Q23 24 22 20Q20 15 16 5Z" fill="#ffb52f"/>
          <path d="M16 8Q15 16 12 20Q10 24 13 26Q17 27 19 24" fill="none" stroke="#ffe76a" stroke-width="2"/>
          <ellipse cx="14" cy="19" rx="2" ry="3.6" fill="#fff7c9" stroke="none" transform="rotate(22 14 19)"/>
          <path d="M5 14V18M3 16H7M26 9V13M24 11H28M27 24V27M25.5 25.5H28.5" stroke="#ffe9a3" stroke-width="1.1"/>
        }
        @case ('rare-silver-oasis-arrow') {
          <g transform="rotate(42 16 16)">
            <path d="M15 7V29" stroke="#4a332c" stroke-width="3.5" fill="none"/>
            <path d="M15 8V28" stroke="#d6ad73" stroke-width="1.7" fill="none"/>
            <path d="M15 1L21 10L15 8L9 10Z" fill="#a9c0cf"/>
            <path d="M15 2L15 8L11 9Z" fill="#f3f8fa"/>
            <path d="M15 2L20 9L15 8" stroke="#536b82" stroke-width="1" fill="none"/>
            <path d="M15 22Q9 23 8 29L14 26M16 22Q22 23 22 29L16 26" fill="#39b4ba"/>
            <path d="M9 27L14 24M21 27L16 24" stroke="#9eecdf" stroke-width="1"/>
            <path d="M13 16H17M13 18H17" stroke="#93b0ba" stroke-width="1.7"/>
          </g>
          <path d="M9 4V8M7 6H11" stroke="#fff6dc" stroke-width="1"/>
        }
        @case ('rare-cracked-clay-heart') {
          <path d="M16 28Q7 23 5 16Q2 8 9 6Q13 5 16 9Q21 4 26 8Q31 14 25 21Z" fill="#593326"/>
          <path d="M16 26Q8 21 7 15Q5 10 10 8Q14 8 16 12Q21 7 25 10Q29 15 23 20Z" fill="#ba6842"/>
          <path d="M16 11L17 16L13 18L18 22L16 26M17 16L22 13M13 18L9 14" stroke="#ffbd52" stroke-width="2" fill="none"/>
          <path d="M16 11L17 16L13 18L18 22L16 26M17 16L22 13" stroke="#813d25" stroke-width=".7" fill="none"/>
          <path d="M7 12L11 9L14 11M20 9L24 11L24 15M9 20L13 22M20 21L23 19" stroke="#73432c" stroke-width="1.3" fill="none"/>
          <path d="M9 10L12 9" stroke="#e3a16e" stroke-width="1.5"/>
        }
        @case ('rare-sandworm-pearl') {
          <circle cx="16" cy="16" r="13" fill="#9b75ad"/>
          <circle cx="16" cy="15.5" r="11.2" fill="#e6b9e4" stroke="none"/>
          <path d="M6 17Q8 5 17 6Q25 8 26 17Q24 26 13 25Q18 19 13 15Q9 14 6 17Z" fill="#aee7f1" stroke="none"/>
          <path d="M10 22Q14 18 18 21Q22 23 24 19Q21 27 14 26Z" fill="#e8b9e9" stroke="none"/>
          <ellipse cx="12" cy="11" rx="4" ry="5" fill="#fff6fc" stroke="none" opacity=".9" transform="rotate(-22 12 11)"/>
          <path d="M24 13Q26 17 24 21" stroke="#fff6dc" stroke-width="1.3" fill="none"/>
          <path d="M7 23Q15 30 24 23" stroke="#efceff" stroke-width="1.2" fill="none"/>
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
