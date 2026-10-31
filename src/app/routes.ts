import type { Routes } from '@angular/router';
import { SiteLayoutComponent } from './site-layout.component.ts';

export const routes: Routes = [
 { path: 'jogar', loadComponent: () => import('./game-page.component.ts').then(m => m.GamePageComponent), title: 'Jogar · Terrania: Origins' },
 { path: 'laboratorio-phaser', redirectTo: 'jogar', pathMatch: 'full' },
 { path: '', component: SiteLayoutComponent, children: [
  { path: "", loadComponent: () => import('./pages.ts').then(m => m.HomePage), title: "Terrania: Origins · Há um mundo além da clareira", data: {description: "Explore Terrania: Origins, um RPG medieval 2D no navegador. Descubra um mundo procedural, enfrente criaturas e experimente a aventura solo ou salas online."} },
  { path: "mundo", loadComponent: () => import('./pages.ts').then(m => m.WorldPage), title: "O mundo · Terrania: Origins", data: {description: "Conheça a clareira, as florestas e os rios do mundo procedural de Terrania: Origins."} },
  { path: "guia", loadComponent: () => import('./pages.ts').then(m => m.GuidePage), title: "Como jogar · Terrania: Origins", data: {description: "Aprenda os controles, o combate, a missão inicial, o modo solo e as salas online de Terrania."} },
  { path: "novidades", loadComponent: () => import('./pages.ts').then(m => m.NewsPage), title: "Novidades · Terrania: Origins", data: {description: "Veja as mudanças da alfa 0.3 e os próximos passos do desenvolvimento de Terrania: Origins."} },
  { path: "comunidade", loadComponent: () => import('./pages.ts').then(m => m.CommunityPage), title: "Comunidade · Terrania: Origins", data: {description: "Prepare links de salas, convide amigos e participe do desenvolvimento de Terrania: Origins."} },
  { path: "privacidade", loadComponent: () => import('./pages.ts').then(m => m.PrivacyPage), title: "Privacidade · Terrania: Origins", data: {description: "Como o site e o protótipo Terrania usam armazenamento local e dados de salas online."} },
  { path: "termos", loadComponent: () => import('./pages.ts').then(m => m.TermsPage), title: "Termos de uso · Terrania: Origins", data: {description: "Condições de uso, convivência e limites da alfa de Terrania: Origins."} },
  { path: "**", loadComponent: () => import('./pages.ts').then(m => m.NotFoundPage), title: "Caminho não encontrado · Terrania: Origins", data: {description: "Esse caminho ainda não existe. Volte ao site de Terrania: Origins."} },
 ] },
];
