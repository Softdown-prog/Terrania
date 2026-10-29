import type { Player } from '../actors/Player.ts';

function requireElement(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error('Elemento de interface ausente: #' + id);
  return el;
}
/** Adaptador de DOM separado da simulação. */
export class Hud {
  private readonly multiplayerStatus = requireElement('multiplayerStatus');
  private readonly playerCount = requireElement('playerCount');
  private readonly hpFill = requireElement('hpFill');
  private readonly hpText = requireElement('hpText');
  private readonly quest = requireElement('quest');
  private readonly seedDisplay = requireElement('seed');
  private readonly coords = requireElement('coords');
  private readonly newWorldButton = requireElement('newWorld') as HTMLButtonElement;
  onNewWorld(cb: () => void): void { this.newWorldButton.addEventListener('click', cb); }
  setStatus(status: string): void { this.multiplayerStatus.textContent = status; }
  setOnline(online: boolean): void {
    this.newWorldButton.disabled = online;
    this.newWorldButton.title = online ? 'O mundo é determinado pelo servidor da sala' : 'Gerar um novo mundo';
  }
  setSeed(seed: number): void { this.seedDisplay.textContent = String(seed); }
  setPlayerCount(count: number, online: boolean): void {
    this.playerCount.textContent = online ? String(count) + ' próximos' : '1 jogador';
  }
  update(player: Player, kills: number): void {
    this.hpFill.style.width = String(player.hp) + '%';
    this.hpText.textContent = String(player.hp) + ' / ' + String(player.maxHp);
    this.quest.textContent = kills >= 5 ? 'Missão concluída ✓' : 'Derrote 5 slimes (' + kills + '/5)';
    this.coords.textContent = 'X ' + Math.floor(player.x / 32) + ' · Y ' + Math.floor(player.y / 32);
  }
}
