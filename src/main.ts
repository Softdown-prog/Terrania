import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { NavigationEnd, Router, RouterOutlet, provideRouter, withInMemoryScrolling } from '@angular/router';
import { Meta } from '@angular/platform-browser';
import { routes } from './app/routes.ts';

@Component({selector:'app-root', imports:[RouterOutlet], template:'<router-outlet />', changeDetection:ChangeDetectionStrategy.OnPush})
class App {
  constructor() {
    const router = inject(Router), meta = inject(Meta);
    const subscription = router.events.subscribe(event => {
      if (!(event instanceof NavigationEnd)) return;
      let route = router.routerState.snapshot.root;
      while (route.firstChild) route = route.firstChild;
      const path = event.urlAfterRedirects.split('?')[0];
      document.body.className = path === '/' ? 'home-page' : path?.startsWith('/jogar') ? 'game-page' : 'inner-page';
      const description: unknown = route.data['description'];
      meta.updateTag({name:'description', content:typeof description === 'string' ? description : 'Jogue Terrania: Origins no navegador.'});
      meta.updateTag({name:'robots', content:path?.startsWith('/jogar') ? 'noindex' : 'index,follow'});
    });
    inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
  }
}
const url = new URL(location.href);
if (url.pathname === '/' && (url.searchParams.has('room') || url.searchParams.has('seed'))) {
  url.pathname = '/jogar/';
  history.replaceState(null, '', url);
}
void bootstrapApplication(App, {providers:[provideRouter(routes, withInMemoryScrolling({scrollPositionRestoration:'enabled', anchorScrolling:'enabled'}))]});
