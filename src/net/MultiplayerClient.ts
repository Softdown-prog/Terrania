import type { ClientMessage, HeroState, MobState, ServerMessage } from '../shared/protocol.ts';
import { PROTOCOL_VERSION, validRoom } from '../shared/protocol.ts';

export class MultiplayerClient {
  private socket: WebSocket | null = null;
  private backoff = 1500;
  id: string | null = null;
  connected = false;
  players: HeroState[] = [];
  mobs: MobState[] = [];
  constructor(
    private readonly endpoint: string,
    public readonly room: string,
    private readonly onWelcome: (seed: number) => void,
    private readonly onSnapshot: (self: HeroState) => void,
    private readonly onStatus: (label: string) => void,
  ) { this.connect(); }
  private connect(): void {
    try {
      const url = new URL(this.endpoint);
      const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
      if (!['wss:', ...(local ? ['ws:'] : [])].includes(url.protocol) || !validRoom(this.room)) {
        this.onStatus('Multiplayer não configurado'); return;
      }
      url.searchParams.set('room', this.room);
      this.onStatus('Conectando à VPS…');
      const socket = new WebSocket(url);
      this.socket = socket;
      socket.onopen = () => { this.backoff = 1500; };
      socket.onmessage = event => {
        if (typeof event.data !== 'string' || event.data.length > 80_000) return;
        let msg: ServerMessage;
        try { msg = JSON.parse(event.data) as ServerMessage; } catch { return; }
        if (msg.type === 'welcome' && msg.version === PROTOCOL_VERSION && typeof msg.seed === 'number' && typeof msg.id === 'string') {
          this.id = msg.id;this.connected = true;
          this.onWelcome(msg.seed);
          this.onStatus('Online · sala ' + msg.room);
        }
        if (msg.type === 'state' && this.connected && Array.isArray(msg.players) && Array.isArray(msg.mobs)) {
          // Estados recebidos são apenas dados visuais; o servidor mantém a autoridade.
          this.players = msg.players;
          this.mobs = msg.mobs;
          const self = this.players.find(p => p.id === this.id);
          if (self && Number.isFinite(self.x) && Number.isFinite(self.y)) this.onSnapshot(self);
        }
        if (msg.type === 'error') this.onStatus('Erro na sala multiplayer');
      };
      socket.onclose = () => {
        if (this.socket !== socket) return;
        this.connected = false;this.id = null;this.players = [];this.mobs = [];
        this.onStatus('Offline · tentando reconectar');
        const delay = this.backoff;
        this.backoff = Math.min(30_000, this.backoff * 2);
        setTimeout(() => { if (this.socket === socket) this.connect(); }, delay);
      };
      socket.onerror = () => { /* onclose informa a desconexão */ };
    } catch { this.onStatus('Multiplayer não configurado'); }
  }
  sendInput(x: number, y: number, attack: boolean): void {
    if (!this.connected || this.socket?.readyState !== WebSocket.OPEN) return;
    const msg: ClientMessage = { type: 'input', x, y, attack };
    this.socket.send(JSON.stringify(msg));
  }
}
