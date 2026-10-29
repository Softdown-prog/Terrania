import type { Player } from "../actors/Player.ts";
import { npcDialogue, type Npc } from "../world/npcs.ts";
export interface Preferences {
  zoom: number;
  effects: boolean;
  cameraMotion: boolean;
}
function element<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error("Elemento de interface ausente: #" + id);
  return el as T;
}
export class Hud {
  private readonly status = element("multiplayerStatus");
  private readonly count = element("playerCount");
  private readonly hpFill = element("hpFill");
  private readonly hpText = element("hpText");
  private readonly quest = element("quest");
  private readonly newWorld = element<HTMLButtonElement>("newWorld");
  private readonly settings = element<HTMLDialogElement>("settingsDialog");
  private readonly help = element<HTMLDialogElement>("helpDialog");
  private readonly npcDialog = element<HTMLDialogElement>("npcDialog");
  private readonly talkButton = element<HTMLButtonElement>("talkButton");
  private readonly npcNext = element<HTMLButtonElement>("npcNext");
  private npcLines: readonly string[] = [];
  private npcPage = 0;
  private readonly worldDialog = element<HTMLDialogElement>("worldDialog");
  private readonly zoom = element<HTMLInputElement>("zoom");
  private readonly effects = element<HTMLInputElement>("effects");
  private readonly motion = element<HTMLInputElement>("cameraMotion");
  constructor() {
    for (const dialog of [this.settings, this.help, this.worldDialog, this.npcDialog])
      dialog.addEventListener("close", () => {
        if (!this.menuOpen)
          document.getElementById("game")?.focus({ preventScroll: true });
      });
    element("settingsButton").addEventListener("click", () =>
      this.settings.showModal(),
    );
    element("helpButton").addEventListener("click", () =>
      this.help.showModal(),
    );
    for (const close of document.querySelectorAll<HTMLButtonElement>(
      "[data-close-dialog]",
    ))
      close.addEventListener("click", () => close.closest("dialog")?.close());
    this.newWorld.addEventListener("click", () => this.worldDialog.showModal());
    this.npcNext.addEventListener("click", () => {
      this.npcPage++;
      if (this.npcPage >= this.npcLines.length) this.npcDialog.close();
      else this.updateNpcPage();
    });
    element("fullscreenButton").addEventListener("click", () => {
      void this.toggleFullscreen();
    });
    document.addEventListener("fullscreenchange", () => {
      element("fullscreenButton").textContent = document.fullscreenElement
        ? "Sair da tela cheia"
        : "Tela cheia";
    });
  }
  private async toggleFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen)
        await document.documentElement.requestFullscreen();
      else
        element("gameNotice").textContent =
          "Neste navegador, use a opção de tela cheia do próprio aparelho.";
    } catch {
      element("gameNotice").textContent =
        "Não foi possível abrir a tela cheia. Você pode continuar jogando aqui.";
    }
  }
  get menuOpen(): boolean {
    return this.settings.open || this.help.open || this.worldDialog.open || this.npcDialog.open;
  }
  loadPreferences(): Preferences {
    let saved: Partial<Preferences> = {};
    try {
      saved =
        JSON.parse(localStorage.getItem("terrania-preferences-v1") ?? "{}") ??
        {};
    } catch {
      /* Defaults remain usable. */
    }
    const preferences = {
      zoom:
        typeof saved.zoom === "number" && Number.isFinite(saved.zoom)
          ? Math.min(2.5, Math.max(1, saved.zoom))
          : window.innerWidth < 600
            ? 1.5
            : 1.65,
      effects:
        typeof saved.effects === "boolean"
          ? saved.effects
          : !matchMedia("(prefers-reduced-motion: reduce)").matches,
      cameraMotion:
        typeof saved.cameraMotion === "boolean"
          ? saved.cameraMotion
          : !matchMedia("(prefers-reduced-motion: reduce)").matches,
    };
    this.zoom.value = String(preferences.zoom);
    this.effects.checked = preferences.effects;
    this.motion.checked = preferences.cameraMotion;
    element("zoomValue").textContent = preferences.zoom.toFixed(2) + "×";
    return preferences;
  }
  onPreferences(cb: (p: Preferences) => void): void {
    for (const control of [this.zoom, this.effects, this.motion])
      control.addEventListener("input", () => {
        const p = {
          zoom: Number(this.zoom.value),
          effects: this.effects.checked,
          cameraMotion: this.motion.checked,
        };
        element("zoomValue").textContent = p.zoom.toFixed(2) + "×";
        try {
          localStorage.setItem("terrania-preferences-v1", JSON.stringify(p));
        } catch {
          /* Optional storage. */
        }
        cb(p);
      });
  }
  onTalk(cb: () => void): void {
    this.talkButton.addEventListener("click", cb);
  }
  setNearbyNpc(npc: Npc | null): void {
    this.talkButton.hidden = npc === null;
    if (npc) {
      this.talkButton.title = "Conversar com " + npc.name + " (E)";
      this.talkButton.setAttribute("aria-label", "Conversar com " + npc.name);
    }
  }
  private updateNpcPage(): void {
    element("npcSpeech").textContent = this.npcLines[this.npcPage] ?? "";
    element("npcStep").textContent =
      "Mensagem " + (this.npcPage + 1) + " de " + this.npcLines.length;
    this.npcNext.textContent = this.npcPage === this.npcLines.length - 1
      ? "Encerrar conversa" : "Continuar";
  }
  showNpcDialogue(npc: Npc, kills: number): void {
    this.npcLines = npcDialogue(npc, kills);
    this.npcPage = 0;
    element("npcName").textContent = npc.name;
    element("npcRole").textContent = npc.role;
    this.updateNpcPage();
    this.npcDialog.showModal();
  }
  onNewWorld(cb: () => void): void {
    element("confirmWorld").addEventListener("click", () => {
      this.worldDialog.close();
      cb();
    });
  }
  setStatus(status: string): void {
    this.status.textContent = status;
  }
  setOnline(online: boolean): void {
    this.newWorld.disabled = online;
    this.newWorld.title = online
      ? "O mundo pertence à sala online"
      : "Gerar um novo mundo local";
    element("connectionDot").dataset.online = String(online);
    element("saveMode").textContent = online
      ? "Sala experimental · progresso temporário"
      : "Aventura local · progresso neste navegador";
    element("menuMode").textContent = online
      ? "Você continua na sala online. O movimento fica desativado enquanto o menu está aberto."
      : "A aventura local fica pausada enquanto este menu está aberto.";
  }
  setSeed(seed: number): void {
    element("seed").textContent = String(seed);
  }
  setPlayerCount(count: number, online: boolean): void {
    this.count.textContent = online
      ? count + " aventureiro(s) por perto"
      : "Modo solo";
  }
  update(player: Player, kills: number): void {
    this.hpFill.style.width = (player.hp / player.maxHp) * 100 + "%";
    this.hpText.textContent = player.hp + " / " + player.maxHp;
    this.quest.textContent =
      kills >= 5 ? "Clareira protegida" : "Proteja a clareira";
    element("questProgress").textContent =
      kills >= 5 ? "Missão concluída ✓" : Math.min(kills, 5) + " / 5 slimes";
    element("questFill").style.width = Math.min(100, (kills / 5) * 100) + "%";
    element("coords").textContent =
      "X " + Math.floor(player.x / 32) + " · Y " + Math.floor(player.y / 32);
  }
}
