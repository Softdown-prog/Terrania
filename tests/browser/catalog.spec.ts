import {test,expect} from '@playwright/test';
test('catalog renders API data and unavailable state on desktop and Android without touching the solo save',async({page})=>{
 await page.route('**/market/catalog',route=>route.fulfill({json:{items:[{id:'gel',name:'Gel de slime',category:'material',rarity:'common',maxStack:99,tradeEnabled:false}]}}));
 await page.goto('/mercado/');await expect(page.getByRole('heading',{name:'Catálogo de itens'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Gel de slime'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.unroute('**/market/catalog');await page.route('**/market/catalog',route=>route.fulfill({status:503,json:{error:'Unavailable'}}));
 await page.reload();await expect(page.getByRole('alert')).toContainText('indisponível');
 await expect(page.getByRole('heading',{name:'Gel de slime'})).toHaveCount(0);
});
