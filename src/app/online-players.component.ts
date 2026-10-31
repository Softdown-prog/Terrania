import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PresenceService } from './presence.service.ts';

@Component({
  selector: 'app-online-players',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="presence" aria-label="Jogadores online" [attr.data-state]="presence.state()">
      <span>JOGADORES ONLINE</span>
      @if (presence.value(); as value) {
        <strong data-testid="online-count">{{ value.online }}</strong>
        <small>{{ value.rooms }} sala(s) · conexões ativas</small>
        <small>Atualizado às {{ time(value.updatedAt) }} · a cada 5 s</small>
      } @else {
        <strong data-testid="online-count">—</strong>
        <small role="status">{{ presence.state() === 'unconfigured' ? 'Servidor online não configurado' :
          presence.state() === 'unavailable' ? 'Contagem indisponível' : 'Verificando servidor…' }}</small>
      }
    </section>`,
  styles: `
    :host { display: block; }
    .presence { padding: 16px 20px; border: 1px solid #b18ee355; border-radius: 8px;
      color: #f3edfa; background: #191021ec; font: 12px/1.5 system-ui; }
    span { display: block; font-size: 9px; letter-spacing: 1.6px; color: #d2a5ff; }
    strong { display:block; font: 32px/1.3 Georgia,serif; font-variant-numeric:tabular-nums; }
    small { display: block; color: #c9bbd8; font-size: 10px; }
    [data-state=live] { border-color:#b986ff; }
    @media(max-width:650px) { .presence { padding:10px 12px; } strong { font-size:24px; } }
  `,
})
export class OnlinePlayersComponent {
  readonly presence = inject(PresenceService);
  time(iso: string): string { return new Date(iso).toLocaleTimeString('pt-BR'); }
}
