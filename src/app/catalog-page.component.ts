import {ChangeDetectionStrategy,Component,OnDestroy,OnInit,signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import {runtimeConfig} from './runtime-config.ts';
import {ItemIconComponent} from './item-icon.component.ts';
import {southRareLootById, type SouthRareLootId} from '../monsters/rareLoot.ts';
import {catalogEndpoint,catalogItems,type CatalogItem} from '../net/itemCatalog.ts';

@Component({selector:'app-catalog-page',imports:[RouterLink,ItemIconComponent],changeDetection:ChangeDetectionStrategy.OnPush,
 templateUrl:'./pages/mercado.html',
 styles:[`.catalog-page{max-width:1100px;margin:auto;padding:clamp(24px,5vw,70px) 20px}.catalog-page h1{font-size:clamp(2rem,6vw,3.8rem)}.catalog-page>p{max-width:70ch;line-height:1.7}.notice{padding:16px;border-left:3px solid #b986ff;background:#181020;color:#d4c8e6}.catalog-grid{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(230px,100%),1fr));gap:16px;margin:28px 0}.catalog-grid li{min-width:0;padding:22px;border:1px solid #3a294b;border-radius:14px;background:linear-gradient(135deg,#21162b,#110d18)}.catalog-grid h2{font-size:1.15rem;margin:12px 0;overflow-wrap:anywhere}.item-kind{font-size:.72rem;text-transform:uppercase;letter-spacing:.12em;color:#b986ff}.catalog-grid p{color:#c1b2d0;font-size:.9rem}.catalog-icon{display:block;width:68px;height:68px;font-size:64px;margin:8px 0}.catalog-grid li[data-rarity=rare]{border-color:#af8554}.catalog-grid li[data-rarity=rare] .item-kind{color:#f3cd84}`]})
export class CatalogPage implements OnInit,OnDestroy {
 readonly items=signal<CatalogItem[]>([]);readonly state=signal<'loading'|'ready'|'error'>('loading');
 private controller:AbortController|null=null;
 ngOnInit(){void this.load();}
 ngOnDestroy(){this.controller?.abort();}
 rareIcon(id:string):SouthRareLootId|null{return southRareLootById(id)?.id??null;}
 category(value:string){return ({material:'Material',consumable:'Consumível',food:'Alimento',weapon:'Arma',equipment:'Equipamento',collectible:'Colecionável'} as Record<string,string>)[value]??'Item';}
 async load(){
  this.controller?.abort();const controller=new AbortController();this.controller=controller;this.state.set('loading');
  const timer=setTimeout(()=>controller.abort(),8000);
  try{
   const endpoint=catalogEndpoint(runtimeConfig.multiplayerUrl,runtimeConfig.marketApiUrl);
   if(!endpoint)throw Error('Unavailable');
   const r=await fetch(endpoint,{signal:controller.signal,credentials:'omit',redirect:'error',headers:{Accept:'application/json'}});
   if(!r.ok)throw Error('Unavailable');const text=await r.text();if(text.length>500000)throw Error('Large response');
   const items=catalogItems(JSON.parse(text));if(this.controller!==controller)return;
   this.items.set(items);this.state.set('ready');
  }catch{if(this.controller===controller)this.state.set('error');}finally{clearTimeout(timer);}
 }
}
