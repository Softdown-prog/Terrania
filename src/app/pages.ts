import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PreviewDirective } from './preview.directive.ts';
import { OnlinePlayersComponent } from './online-players.component.ts';

@Component({selector: "app-page-home", templateUrl: "./pages/home.html", imports: [RouterLink, PreviewDirective, OnlinePlayersComponent], changeDetection: ChangeDetectionStrategy.OnPush})
export class HomePage {
}

@Component({selector: "app-page-mundo", templateUrl: "./pages/mundo.html", imports: [RouterLink, PreviewDirective], changeDetection: ChangeDetectionStrategy.OnPush})
export class WorldPage {
}

@Component({selector: "app-page-guia", templateUrl: "./pages/guia.html", imports: [RouterLink, PreviewDirective], changeDetection: ChangeDetectionStrategy.OnPush})
export class GuidePage {
}

@Component({selector: "app-page-novidades", templateUrl: "./pages/novidades.html", imports: [RouterLink, PreviewDirective], changeDetection: ChangeDetectionStrategy.OnPush})
export class NewsPage {
}

@Component({selector: "app-page-comunidade", templateUrl: "./pages/comunidade.html", imports: [RouterLink, PreviewDirective, OnlinePlayersComponent], changeDetection: ChangeDetectionStrategy.OnPush})
export class CommunityPage {
  private readonly router = inject(Router);
  readonly feedback = signal('');
  joinRoom(event: Event, room: HTMLInputElement): void {
    event.preventDefault();
    if (room.reportValidity()) void this.router.navigate(['/jogar/'], { queryParams: {room:room.value} });
  }
  async copyRoom(room: HTMLInputElement): Promise<void> {
    if (!room.reportValidity()) return;
    const url = new URL('/jogar/', location.origin);
    url.searchParams.set('room', room.value);
    try { await navigator.clipboard.writeText(url.href); this.feedback.set('Link copiado. Envie para quem vai explorar com você.'); }
    catch { this.feedback.set('Copie este link: ' + url.href); }
  }
}

@Component({selector: "app-page-privacidade", templateUrl: "./pages/privacidade.html", imports: [RouterLink, PreviewDirective], changeDetection: ChangeDetectionStrategy.OnPush})
export class PrivacyPage {
}

@Component({selector: "app-page-termos", templateUrl: "./pages/termos.html", imports: [RouterLink, PreviewDirective], changeDetection: ChangeDetectionStrategy.OnPush})
export class TermsPage {
}

@Component({selector: "app-page-404", templateUrl: "./pages/404.html", imports: [RouterLink, PreviewDirective], changeDetection: ChangeDetectionStrategy.OnPush})
export class NotFoundPage {
}

