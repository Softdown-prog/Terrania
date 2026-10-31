import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { PresenceService } from './presence.service.ts';

@Component({
  selector: 'app-online-players',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="presence" aria-label="Jogadores online" [class.compact]="compact()" [attr.data-state]="presence.state()">
      <span>{{ compact() ? 'ONLINE AGORA' : 'JOGADORES ONLINE' }}</span>
      @if (presence.value(); as value) {
        <strong data-testid="online-count">{{ value.online }}</strong>
        <small>{{ value.rooms }} sala(s){{ compact() ? '' : ' · conexões ativas' }}</small>
        <small class="update-details">Atualizado às {{ time(value.updatedAt) }} · a cada 5 s</small>
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
    .compact { display:grid; grid-template-columns:1fr auto; column-gap:16px; padding:10px 12px; }
    .compact span { grid-column:1; font-size:8px; letter-spacing:1px; }
    .compact strong { grid-column:2; grid-row:1 / 3; align-self:center; font-size:26px; }
    .compact small { grid-column:1; }
    .compact .update-details { position:absolute; width:1px; height:1px; overflow:hidden; clip-path:inset(50%); }
    @media(max-width:650px) { .presence { padding:10px 12px; } strong { font-size:24px; } }
  `,
})
export class OnlinePlayersComponent {
  readonly compact = input(false);
  readonly presence = inject(PresenceService);
  time(iso: string): string { return new Date(iso).toLocaleTimeString('pt-BR'); }
}
