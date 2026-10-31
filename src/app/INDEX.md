# Índice — interface Angular

- [routes.ts](routes.ts): rotas, lazy load e SEO.
- [site-layout.component.ts](site-layout.component.ts), [site-layout.html](site-layout.html): cabeçalho e menu mobile.
- [pages.ts](pages.ts), [pages/](pages/): componentes e HTML das páginas institucionais.
- [game-page.component.ts](game-page.component.ts), [game-page.html](game-page.html): montagem da cena, controles e diálogos.
- [hud.service.ts](hud.service.ts): sinais de vida, missão, bolsa e configurações.
- [online-players.component.ts](online-players.component.ts), [presence.service.ts](presence.service.ts): contador de conexões reais, polling e cancelamento.
- [preview.directive.ts](preview.directive.ts): preview de mundo.

Contrato de UI: [../ui/GameUi.ts](../ui/GameUi.ts); cena: [../game/PhaserGame.ts](../game/PhaserGame.ts). Regressão: [../../tests/browser/](../../tests/browser/), especialmente [dialogs.spec.ts](../../tests/browser/dialogs.spec.ts) e [session.spec.ts](../../tests/browser/session.spec.ts).

Não mover IA de monstros, regras do mundo ou lógica do servidor para um componente Angular.
