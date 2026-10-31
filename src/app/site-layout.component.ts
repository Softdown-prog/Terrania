import { ChangeDetectionStrategy, Component, HostListener, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({ selector: 'app-site-layout', templateUrl: './site-layout.html',
  imports: [RouterLink, RouterLinkActive, RouterOutlet], changeDetection: ChangeDetectionStrategy.OnPush })
export class SiteLayoutComponent {
  readonly navOpen = signal(false);
  @HostListener('document:keydown.escape') escape(): void { this.navOpen.set(false); }
  @HostListener('document:click', ['$event']) outside(event: Event): void {
    if (event.target instanceof Element && !event.target.closest('.site-header')) this.navOpen.set(false);
  }
}
